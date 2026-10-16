import { describe, expect, it } from 'vitest';
import { RuleError, SHOE_SIZE, Shoe, createGame } from '../../../src/engine/index.ts';
import type { Card, Game, Rank, RuleErrorCode } from '../../../src/engine/index.ts';
import { cards, seededRandom, stackedShoe } from '../../support/cards.ts';

const ranks = (hand: readonly Card[]): Rank[] => hand.map((card) => card.rank);

function expectRuleError(call: () => unknown, code: RuleErrorCode) {
  let error: unknown;
  try {
    call();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(RuleError);
  expect(error).toHaveProperty('code', code);
}

/** The first four cards a fresh Shoe.create(seededRandom(seed)) deals, i.e. what G5 deals from it. */
function firstFour(seed: number): Card[] {
  const shoe = Shoe.create(seededRandom(seed));
  return [shoe.draw(), shoe.draw(), shoe.draw(), shoe.draw()];
}

describe('createGame (§4.4)', () => {
  it('starts in betting with an empty table and no actions', () => {
    const game = createGame({ bankroll: 250 });
    expect(game.state()).toEqual({
      phase: 'betting',
      bankroll: 250,
      hands: [],
      activeHand: null,
      dealer: { cards: [], holeHidden: false, value: { total: 0, soft: false } },
      shoeRemaining: SHOE_SIZE,
      reshuffled: false,
      summary: null,
    });
    expect(game.availableActions()).toEqual([]);
  });

  it('builds the default shoe from the injected random source', () => {
    const [playerFirst, upCard, playerSecond] = firstFour(42);
    const state = createGame({ random: seededRandom(42) }).deal(100);
    expect(state.hands[0].cards).toEqual([playerFirst, playerSecond]);
    expect(state.dealer.cards[0]).toEqual(upCard);
  });
});

describe('deal (G3, G5, G12, G16–G18)', () => {
  it('enters playerTurn with an open first hand and only the up card showing', () => {
    const game = createGame({ shoe: stackedShoe(['10', '9', '7', '8']) });
    const state = game.deal(100);
    expect(state.phase).toBe('playerTurn');
    expect(state.bankroll).toBe(900);
    expect(state.activeHand).toBe(0);
    expect(state.hands).toEqual([{
      cards: [{ rank: '10', suit: 'S' }, { rank: '7', suit: 'D' }],
      bet: 100,
      value: { total: 17, soft: false },
      doubled: false,
      fromSplit: false,
      splitAces: false,
      done: false,
      outcome: null,
      payout: null,
    }]);
    expect(state.dealer).toEqual({
      cards: [{ rank: '9', suit: 'H' }],
      holeHidden: true,
      value: { total: 9, soft: false },
    });
    expect(state.summary).toBeNull();
    expect(state.shoeRemaining).toBe(SHOE_SIZE - 4);
  });

  it('pays 3:2 at once when the player has blackjack and the ace peek misses', () => {
    const game = createGame({ shoe: stackedShoe(['A', 'A', 'K', '9']) });
    const state = game.deal(100);
    expect(state.phase).toBe('settled');
    expect(ranks(state.dealer.cards)).toEqual(['A', '9']);
    expect(state.dealer.holeHidden).toBe(false);
    expect(state.hands[0].outcome).toBe('blackjack');
    expect(state.hands[0].payout).toBe(250);
    expect(state.bankroll).toBe(1150);
    expect(state.shoeRemaining).toBe(SHOE_SIZE - 4);
  });

  it('reshuffles with the injected random source', () => {
    const [playerFirst, upCard, playerSecond] = firstFour(7);
    const game = createGame({ shoe: Shoe.fromCards(cards(...Array<Rank>(78).fill('2'))), random: seededRandom(7) });
    const state = game.deal(100);
    expect(state.reshuffled).toBe(true);
    expect(state.hands[0].cards).toEqual([playerFirst, playerSecond]);
    expect(state.dealer.cards[0]).toEqual(upCard);
  });

  it('does not reshuffle when the bet is rejected', () => {
    const game = createGame({ bankroll: 50, shoe: Shoe.fromCards(cards(...Array<Rank>(78).fill('2'))) });
    expectRuleError(() => game.deal(5), 'INVALID_BET');
    expectRuleError(() => game.deal(100), 'INSUFFICIENT_FUNDS');
    expect(game.state().shoeRemaining).toBe(78);
    expect(game.state().reshuffled).toBe(false);
  });
});

describe('availableActions (G13, G22–G25)', () => {
  it('drops double once the hand has more than two cards', () => {
    const game = createGame({ shoe: stackedShoe(['5', '9', '4', '7', '2']) });
    game.deal(100);
    expect(game.act('hit').phase).toBe('playerTurn');
    expect(game.availableActions()).toEqual(['hit', 'stand']);
    expectRuleError(() => game.act('double'), 'ILLEGAL_ACTION');
  });

  it('offers double but not split to a second split hand that is a pair', () => {
    const game = createGame({ shoe: stackedShoe(['8', '10', '8', '7', '10', '8']) });
    game.deal(100);
    game.act('split');
    const second = game.act('stand');
    expect(second.activeHand).toBe(1);
    expect(ranks(second.hands[1].cards)).toEqual(['8', '8']);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
  });

  it('withholds double after a split leaves less than the original bet', () => {
    const game = createGame({ bankroll: 200, shoe: stackedShoe(['8', '10', '8', '7', '3']) });
    game.deal(100);
    const split = game.act('split');
    expect(split.bankroll).toBe(0);
    expect(ranks(split.hands[0].cards)).toEqual(['8', '3']);
    expect(game.availableActions()).toEqual(['hit', 'stand']);
  });

  it('returns a fresh array each call', () => {
    const game = createGame({ shoe: stackedShoe(['10', '9', '7', '8']) });
    game.deal(100);
    Reflect.set(game.availableActions(), 'length', 0);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
  });
});

describe('act (G19–G21, G25)', () => {
  it('ends split aces after one card each, even a third ace, and settles in the same call', () => {
    const game = createGame({ shoe: stackedShoe(['A', '9', 'A', '7', 'A', '5', '2']) });
    game.deal(100);
    const state = game.act('split');
    expect(state.phase).toBe('settled');
    expect(state.hands.map((hand) => ranks(hand.cards))).toEqual([['A', 'A'], ['A', '5']]);
    for (const hand of state.hands) expect([hand.fromSplit, hand.splitAces, hand.done]).toEqual([true, true, true]);
    expect(ranks(state.dealer.cards)).toEqual(['9', '7', '2']);
    expect(state.summary).toEqual({ totalBet: 200, totalReturn: 0, net: -200 });
    expect(state.bankroll).toBe(800);
  });

  it('stops a hand that hits to soft 21', () => {
    const game = createGame({ shoe: stackedShoe(['A', '10', '5', '8', '5']) });
    game.deal(100);
    const state = game.act('hit');
    expect(state.phase).toBe('settled');
    expect(state.hands[0].value).toEqual({ total: 21, soft: true });
    expect(state.hands[0].outcome).toBe('win');
  });

  it('isolates act() snapshots, including the dealer cards', () => {
    const game = createGame({ shoe: stackedShoe(['10', '6', '7', 'Q', 'K']) });
    game.deal(100);
    const state = game.act('stand');
    const before = game.state();
    (state.dealer.cards as Card[]).push({ rank: 'A', suit: 'S' });
    Reflect.set(state.hands[0], 'payout', 0);
    expect(game.state()).toEqual(before);
  });
});

describe('round transitions (G14, G21)', () => {
  it('nextRound keeps the bankroll and the shoe position for the next deal', () => {
    const game = createGame({ shoe: stackedShoe(['10', '9', '7', '8', '4', '6', '3', '5']) });
    game.deal(100);
    expect(game.act('stand').summary).toEqual({ totalBet: 100, totalReturn: 100, net: 0 });
    const betting = game.nextRound();
    expect(betting.bankroll).toBe(1000);
    expect(betting.shoeRemaining).toBe(SHOE_SIZE - 4);
    expect(betting.activeHand).toBeNull();
    const next = game.deal(100);
    expect(ranks(next.hands[0].cards)).toEqual(['4', '3']);
    expect(ranks(next.dealer.cards)).toEqual(['6']);
  });

  it('allows a reset only after the losing round is cleared', () => {
    const game: Game = createGame({ bankroll: 100, shoe: stackedShoe(['8', 'A', '8', 'Q']) });
    expect(game.deal(100).bankroll).toBe(0);
    expectRuleError(() => game.resetBankroll(), 'WRONG_PHASE');
    game.nextRound();
    expect(game.resetBankroll().bankroll).toBe(1000);
  });
});
