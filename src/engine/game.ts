// The round: betting, dealing, player actions, the dealer and settlement (SPEC-001 §3.3–§3.7, §4.4).
import { handValue, isBlackjack } from './cards.ts';
import { RuleError } from './errors.ts';
import { BET_STEP, DEALER_STANDS_ON, MAX_BET, MIN_BET, RESHUFFLE_AT, STARTING_BANKROLL } from './rules.ts';
import { Shoe, cryptoRandom } from './shoe.ts';
import type {
  Action, Card, DealerView, GameState, Outcome, Phase, PlayerHand, RandomSource, RoundSummary,
} from './types.ts';

export interface GameOptions {
  readonly bankroll?: number;     // 預設 STARTING_BANKROLL；必須是大於等於 0 的整數，否則丟 RuleError('INVALID_BANKROLL')
  readonly shoe?: Shoe;           // 預設 Shoe.create(random)
  readonly random?: RandomSource; // 預設 cryptoRandom；用於預設牌靴與之後每次重洗
}

export interface Game {
  state(): GameState;
  availableActions(): readonly Action[];  // 只有 playerTurn 時可能非空
  deal(bet: number): GameState;           // betting → playerTurn，或在 G16、G17 的情況直接 settled
  act(action: Action): GameState;         // 作用於 activeHand
  nextRound(): GameState;                 // settled → betting；不動牌靴與資金
  resetBankroll(): GameState;             // G14
}

const TWENTY_ONE = 21;   // G8 busts above it; G19 stops a hand on it
const TWO_CARDS = 2;     // G24, G25: the hand holds exactly two cards

// G28: the return, stake included, as a multiple of the hand's bet. A blackjack hand is never doubled,
// so its bet is the original bet.
const RETURN_MULTIPLE: Readonly<Record<Outcome, number>> = { blackjack: 2.5, win: 2, push: 1, lose: 0 };

/** The engine's own mutable hand. Snapshots copy it into a PlayerHand. */
interface Hand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  outcome: Outcome | null;
  payout: number | null;
}

function newHand(cards: Card[], bet: number, fromSplit = false, splitAces = false): Hand {
  return { cards, bet, doubled: false, fromSplit, splitAces, done: false, outcome: null, payout: null };
}

const copyCard = ({ rank, suit }: Card): Card => ({ rank, suit });

const isBust = (cards: readonly Card[]): boolean => handValue(cards).total > TWENTY_ONE;

/** G11: a whole multiple of BET_STEP from MIN_BET to MAX_BET. NaN fails Number.isInteger. */
function isValidBet(bet: number): boolean {
  return Number.isInteger(bet) && bet % BET_STEP === 0 && bet >= MIN_BET && bet <= MAX_BET;
}

/** G9, G16, G17, G27 for one hand against the dealer's full hand. */
function outcomeOf(hand: Hand, dealer: readonly Card[]): Outcome {
  const natural = !hand.fromSplit && isBlackjack(hand.cards);
  // A dealer blackjack is found by the peek and settled before any player action (G16).
  if (isBlackjack(dealer)) return natural ? 'push' : 'lose';
  if (natural) return 'blackjack';
  if (isBust(hand.cards)) return 'lose';
  if (isBust(dealer)) return 'win';
  const player = handValue(hand.cards).total;
  const house = handValue(dealer).total;
  if (player === house) return 'push';
  return player > house ? 'win' : 'lose';
}

class BlackjackGame implements Game {
  readonly #random: RandomSource;
  #shoe: Shoe;
  #bankroll: number;
  #phase: Phase = 'betting';
  #hands: Hand[] = [];
  #dealer: Card[] = [];
  #active = 0;
  #originalBet = 0;
  #reshuffled = false;
  #summary: RoundSummary | null = null;

  constructor(bankroll: number, shoe: Shoe, random: RandomSource) {
    this.#bankroll = bankroll;
    this.#shoe = shoe;
    this.#random = random;
  }

  state(): GameState {
    const playerTurn = this.#phase === 'playerTurn';
    return {
      phase: this.#phase,
      bankroll: this.#bankroll,
      hands: this.#hands.map((hand): PlayerHand => ({
        cards: hand.cards.map(copyCard),
        bet: hand.bet,
        value: handValue(hand.cards),
        doubled: hand.doubled,
        fromSplit: hand.fromSplit,
        splitAces: hand.splitAces,
        done: hand.done,
        outcome: hand.outcome,
        payout: hand.payout,
      })),
      activeHand: playerTurn ? this.#active : null,
      dealer: this.#dealerView(playerTurn),
      shoeRemaining: this.#shoe.remaining,
      reshuffled: this.#reshuffled,
      summary: this.#summary === null ? null : { ...this.#summary },
    };
  }

  availableActions(): readonly Action[] {
    if (this.#phase !== 'playerTurn') return [];
    // Split aces end at once (G25), so the active hand can always hit (G22) and stand (G23).
    const actions: Action[] = ['hit', 'stand'];
    const hand = this.#hands[this.#active];
    const twoCards = hand.cards.length === TWO_CARDS;
    const canAfford = this.#bankroll >= this.#originalBet; // G13
    if (twoCards && !hand.splitAces && handValue(hand.cards).total !== TWENTY_ONE && canAfford) {
      actions.push('double'); // G24
    }
    if (this.#hands.length === 1 && twoCards && canAfford) {
      // G25: equal point values, so K and Q split; an ace counts 11 on its own, so only A and A match it.
      const [first, second] = hand.cards;
      if (handValue([first]).total === handValue([second]).total) actions.push('split');
    }
    return actions;
  }

  deal(bet: number): GameState {
    if (this.#phase !== 'betting') throw new RuleError('WRONG_PHASE', 'deal() needs the betting phase.');
    if (!isValidBet(bet)) throw new RuleError('INVALID_BET', `Invalid bet: ${bet}.`);
    if (bet > this.#bankroll) throw new RuleError('INSUFFICIENT_FUNDS', `Bet ${bet} exceeds the bankroll.`);

    // G3: only here, before the first card of the round.
    this.#reshuffled = this.#shoe.remaining <= RESHUFFLE_AT;
    if (this.#reshuffled) this.#shoe = Shoe.create(this.#random);
    this.#bankroll -= bet; // G12
    this.#originalBet = bet;

    // G5: player, dealer up card, player, dealer hole card.
    const playerFirst = this.#shoe.draw();
    const upCard = this.#shoe.draw();
    const playerSecond = this.#shoe.draw();
    const holeCard = this.#shoe.draw();
    this.#hands = [newHand([playerFirst, playerSecond], bet)];
    this.#dealer = [upCard, holeCard];
    this.#active = 0;
    this.#phase = 'playerTurn';

    // G16 peek: a dealer blackjack always shows an ace or ten-value up card, so checking the two cards is the
    // peek. G17: a player blackjack settles at once, and the dealer only turns the hole card over.
    if (isBlackjack(this.#dealer) || isBlackjack(this.#hands[0].cards)) this.#settle();
    return this.state();
  }

  act(action: Action): GameState {
    if (this.#phase !== 'playerTurn') throw new RuleError('WRONG_PHASE', 'act() needs the playerTurn phase.');
    if (!this.availableActions().includes(action)) {
      throw new RuleError('ILLEGAL_ACTION', `${String(action)} is not available.`);
    }

    const hand = this.#hands[this.#active];
    switch (action) {
      case 'hit': // G22
        this.#drawTo(hand);
        break;
      case 'stand': // G23
        hand.done = true;
        break;
      case 'double': // G24
        this.#bankroll -= this.#originalBet;
        hand.bet += this.#originalBet;
        hand.doubled = true;
        this.#drawTo(hand);
        hand.done = true;
        break;
      case 'split': { // G25: each new hand holds one card; #advance deals the second ones.
        const aces = hand.cards[0].rank === 'A';
        this.#bankroll -= this.#originalBet;
        this.#hands = hand.cards.map((card) => newHand([card], this.#originalBet, true, aces));
        break;
      }
    }
    this.#advance();
    return this.state();
  }

  nextRound(): GameState {
    if (this.#phase !== 'settled') throw new RuleError('WRONG_PHASE', 'nextRound() needs the settled phase.');
    this.#phase = 'betting';
    this.#hands = [];
    this.#dealer = [];
    this.#active = 0;
    this.#originalBet = 0;
    this.#reshuffled = false;
    this.#summary = null;
    return this.state();
  }

  resetBankroll(): GameState {
    if (this.#phase !== 'betting') throw new RuleError('WRONG_PHASE', 'resetBankroll() needs the betting phase.');
    if (this.#bankroll >= MIN_BET) throw new RuleError('ILLEGAL_ACTION', 'The bankroll still covers the minimum bet.');
    this.#bankroll = STARTING_BANKROLL; // G14
    return this.state();
  }

  /** playerTurn shows the up card only; every other phase shows all the dealer's cards (none while betting). */
  #dealerView(playerTurn: boolean): DealerView {
    const visible = (playerTurn ? this.#dealer.slice(0, 1) : this.#dealer).map(copyCard);
    return { cards: visible, holeHidden: playerTurn, value: handValue(visible) };
  }

  /** Draws one card; a bust (G8) or 21 (G19) ends the hand. */
  #drawTo(hand: Hand): void {
    hand.cards.push(this.#shoe.draw());
    if (handValue(hand.cards).total >= TWENTY_ONE) hand.done = true;
  }

  /**
   * Moves to the first unfinished hand from the active one. A split hand gets its second card only when its
   * turn comes (G25), so hand 1 draws at once and hand 2 after hand 1 ends; split aces end after that card.
   * When every hand is done the round finishes in the same call (§4.4).
   */
  #advance(): void {
    for (let index = this.#active; index < this.#hands.length; index += 1) {
      const hand = this.#hands[index];
      if (hand.cards.length < TWO_CARDS) {
        this.#drawTo(hand);
        if (hand.splitAces) hand.done = true;
      }
      if (!hand.done) {
        this.#active = index;
        return;
      }
    }
    // G20: the dealer draws only when some hand is still standing; G26: stand on all 17s.
    if (this.#hands.some((hand) => !isBust(hand.cards))) {
      while (handValue(this.#dealer).total < DEALER_STANDS_ON) this.#dealer.push(this.#shoe.draw());
    }
    this.#settle();
  }

  /** G27–G29: settle every hand once and pay all returns back in one step. */
  #settle(): void {
    let totalBet = 0;
    let totalReturn = 0;
    for (const hand of this.#hands) {
      hand.outcome = outcomeOf(hand, this.#dealer);
      hand.payout = hand.bet * RETURN_MULTIPLE[hand.outcome];
      hand.done = true;
      totalBet += hand.bet;
      totalReturn += hand.payout;
    }
    this.#bankroll += totalReturn; // G12
    this.#summary = { totalBet, totalReturn, net: totalReturn - totalBet };
    this.#phase = 'settled';
  }
}

export function createGame(options: GameOptions = {}): Game {
  const { bankroll = STARTING_BANKROLL, random = cryptoRandom } = options;
  if (!Number.isInteger(bankroll) || bankroll < 0) {
    throw new RuleError('INVALID_BANKROLL', `Invalid bankroll: ${bankroll}.`);
  }
  return new BlackjackGame(bankroll, options.shoe ?? Shoe.create(random), random);
}
