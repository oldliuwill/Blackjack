import { describe, expect, it } from 'vitest';
import { createGame, RuleError, Shoe } from '../../src/engine/index.ts';
import type { Game, GameState, Outcome, Rank, RoundSummary, RuleErrorCode } from '../../src/engine/index.ts';
import { cards, stackedShoe } from '../support/cards.ts';

// Capture every field as plain data, including Card getters, before any attempted mutation.
function project(state: GameState) {
  return {
    phase: state.phase,
    bankroll: state.bankroll,
    hands: state.hands.map((hand) => ({
      cards: hand.cards.map((card) => `${card.suit}:${card.rank}`),
      bet: hand.bet,
      value: { total: hand.value.total, soft: hand.value.soft },
      doubled: hand.doubled,
      fromSplit: hand.fromSplit,
      splitAces: hand.splitAces,
      done: hand.done,
      outcome: hand.outcome,
      payout: hand.payout,
    })),
    activeHand: state.activeHand,
    dealer: {
      cards: state.dealer.cards.map((card) => `${card.suit}:${card.rank}`),
      holeHidden: state.dealer.holeHidden,
      value: { total: state.dealer.value.total, soft: state.dealer.value.soft },
    },
    shoeRemaining: state.shoeRemaining,
    reshuffled: state.reshuffled,
    summary: state.summary === null ? null : {
      totalBet: state.summary.totalBet,
      totalReturn: state.summary.totalReturn,
      net: state.summary.net,
    },
  };
}

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

function expectRejected(game: Game, call: () => unknown, code: RuleErrorCode) {
  const before = project(game.state());
  expectRuleError(call, code);
  const after = project(game.state());
  expect(after).toEqual(before);
  expect(after.shoeRemaining).toBe(before.shoeRemaining);
}

function expectHand(state: GameState, index: number, ranks: Rank[], total: number, soft = false) {
  expect(state.hands[index].cards.map((card) => card.rank)).toEqual(ranks);
  expect(state.hands[index].value).toEqual({ total, soft });
}

function expectDealer(state: GameState, ranks: Rank[], total: number, soft = false) {
  expect(state.dealer.cards.map((card) => card.rank)).toEqual(ranks);
  expect(state.dealer.value).toEqual({ total, soft });
  expect(state.dealer.holeHidden).toBe(false);
}

// Expected totals, balances and remaining counts are supplied as source-derived literals.
function expectSettled(
  state: GameState,
  results: { outcome: Outcome; payout: number }[],
  summary: RoundSummary,
  bankroll: number,
  remaining: number,
) {
  expect(state.phase).toBe('settled');
  expect(state.activeHand).toBeNull();
  expect(state.hands.map((hand) => ({ outcome: hand.outcome, payout: hand.payout }))).toEqual(results);
  for (const hand of state.hands) expect(hand.done).toBe(true);
  expect(state.summary).toEqual(summary);
  expect(state.bankroll).toBe(bankroll);
  expect(state.bankroll).toBe(1000 + summary.net);
  expect(state.shoeRemaining).toBe(remaining);
}

describe('SPEC-001 §9.3 — game boundaries', () => {
  // B1 — G3, G4, G26, G27–G29 [D24, R1a, R3, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B1 keeps a 79-card shoe during the round and reshuffles before the next deal', () => {
    const shoe = Shoe.fromCards([
      ...cards('5', '10', '6', '7', '2'),
      ...cards(...Array<Rank>(74).fill('2')),
    ]);
    const game = createGame({ shoe });
    const dealt = game.deal(100);
    expect(dealt.reshuffled).toBe(false);
    expect(dealt.shoeRemaining).toBe(75);
    const hit = game.act('hit');
    expectHand(hit, 0, ['5', '6', '2'], 13);
    expect(hit.reshuffled).toBe(false);
    expect(hit.shoeRemaining).toBe(74);
    const settled = game.act('stand');
    expectHand(settled, 0, ['5', '6', '2'], 13);
    expectDealer(settled, ['10', '7'], 17);
    expectSettled(settled, [{ outcome: 'lose', payout: 0 }],
      { totalBet: 100, totalReturn: 0, net: -100 }, 900, 74);
    // nextRound() leaves the shoe alone (§4.4); betting reports reshuffled false (§4.1).
    const betting = game.nextRound();
    expect(betting.shoeRemaining).toBe(74);
    expect(betting.reshuffled).toBe(false);
    const next = game.deal(100);
    // The new shoe is random: §9.3 specifies only these two post-reshuffle quantities.
    expect(next.reshuffled).toBe(true);
    expect(next.shoeRemaining).toBe(308);
  });

  // B2 — G3 [D24, R1a]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B2 reshuffles at both 78 and 77 remaining cards', () => {
    for (const count of [78, 77]) {
      const game = createGame({ shoe: Shoe.fromCards(cards(...Array<Rank>(count).fill('2'))) });
      const state = game.deal(100);
      expect(state.reshuffled).toBe(true);
      expect(state.shoeRemaining).toBe(308);
    }
  });

  // B3 — G25, G26, G27, G28 [D25, R7, R3, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B3 splits different ranks with the same ten-point value', () => {
    const game = createGame({ shoe: stackedShoe(['K', '9', 'Q', '7', '8', '10', '2']) });
    game.deal(100);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double', 'split']);
    game.act('split');
    game.act('stand');
    const state = game.act('stand');
    expectHand(state, 0, ['K', '8'], 18);
    expectHand(state, 1, ['Q', '10'], 20);
    expectDealer(state, ['9', '7', '2'], 18);
    expectSettled(state, [{ outcome: 'push', payout: 100 }, { outcome: 'win', payout: 200 }],
      { totalBet: 200, totalReturn: 300, net: 100 }, 1100, 305);
  });

  // B4 — G25 [D25, R7]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B4 does not offer split for cards with different point values', () => {
    const game = createGame({ shoe: stackedShoe(['9', '7', 'K', '8']) });
    game.deal(100);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
  });

  // B5 — G9, G19, G28 [R9, D12, D30]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B5 automatically ends split 21 and pays it as an ordinary win', () => {
    const game = createGame({ shoe: stackedShoe(['K', '9', 'K', '8', 'A', '9']) });
    game.deal(100);
    const split = game.act('split');
    expectHand(split, 0, ['K', 'A'], 21, true);
    expect(split.hands[0].done).toBe(true);
    expect(split.activeHand).toBe(1);
    expectHand(split, 1, ['K', '9'], 19);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
    const state = game.act('stand');
    expectHand(state, 0, ['K', 'A'], 21, true);
    expectHand(state, 1, ['K', '9'], 19);
    expectDealer(state, ['9', '8'], 17);
    expectSettled(state, [{ outcome: 'win', payout: 200 }, { outcome: 'win', payout: 200 }],
      { totalBet: 200, totalReturn: 400, net: 200 }, 1200, 306);
  });

  // B6 — G19, G26, G27, G28 [D30, R3, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B6 settles within the hit that brings the player to 21', () => {
    const game = createGame({ shoe: stackedShoe(['10', '9', '5', '7', '6', '4']) });
    game.deal(100);
    const state = game.act('hit');
    expectHand(state, 0, ['10', '5', '6'], 21);
    expectDealer(state, ['9', '7', '4'], 20);
    expectSettled(state, [{ outcome: 'win', payout: 200 }],
      { totalBet: 100, totalReturn: 200, net: 100 }, 1100, 306);
  });

  // B7 — G20, G27, G28 [D27, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B7 reveals dealer 16 without drawing when the player busts', () => {
    const game = createGame({ shoe: stackedShoe(['10', '6', '6', '10', 'K']) });
    game.deal(100);
    const state = game.act('hit');
    expectHand(state, 0, ['10', '6', 'K'], 26);
    expectDealer(state, ['6', '10'], 16);
    expectSettled(state, [{ outcome: 'lose', payout: 0 }],
      { totalBet: 100, totalReturn: 0, net: -100 }, 900, 307);
  });

  // B8 — G20, G25, G27, G28 [D27, R7, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B8 reveals dealer 15 without drawing when both split hands bust', () => {
    const game = createGame({ shoe: stackedShoe(['8', '5', '8', '10', '10', '6', '10', '9']) });
    game.deal(100);
    game.act('split');
    game.act('hit');
    const state = game.act('hit');
    expectHand(state, 0, ['8', '10', '6'], 24);
    expectHand(state, 1, ['8', '10', '9'], 27);
    expectDealer(state, ['5', '10'], 15);
    expectSettled(state, [{ outcome: 'lose', payout: 0 }, { outcome: 'lose', payout: 0 }],
      { totalBet: 200, totalReturn: 0, net: -200 }, 800, 304);
  });

  // B9 — G13, §4.4 [D12, D28]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B9 requires a full additional bet for double and split, including equality', () => {
    const game = createGame({ bankroll: 150, shoe: stackedShoe(['8', '9', '8', '7']) });
    expect(game.deal(100).bankroll).toBe(50);
    expect(game.availableActions()).toEqual(['hit', 'stand']);
    expectRejected(game, () => game.act('double'), 'ILLEGAL_ACTION');
    expectRejected(game, () => game.act('split'), 'ILLEGAL_ACTION');

    const exact = createGame({ bankroll: 200, shoe: stackedShoe(['8', '9', '8', '7']) });
    expect(exact.deal(100).bankroll).toBe(100);
    expect(exact.availableActions()).toEqual(['hit', 'stand', 'double', 'split']);
  });

  // B10 — G11, §4.4 [D10, D31]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B10 rejects invalid bets and insufficient funds and accepts both limits', () => {
    for (const bet of [0, 5, 15, 510, 100.5, NaN]) {
      const game = createGame({ shoe: stackedShoe(['10', '9', '7', '8']) });
      expectRejected(game, () => game.deal(bet), 'INVALID_BET');
    }
    const poor = createGame({ bankroll: 50, shoe: stackedShoe(['10', '9', '7', '8']) });
    expectRejected(poor, () => poor.deal(100), 'INSUFFICIENT_FUNDS');
    expectRejected(poor, () => poor.deal(15), 'INVALID_BET');

    const minimum = createGame({ shoe: stackedShoe(['10', '9', '7', '8']) });
    const minState = minimum.deal(10);
    expect(minState.phase).toBe('playerTurn');
    expect(minState.bankroll).toBe(990);
    const maximum = createGame({ shoe: stackedShoe(['10', '9', '7', '8']) });
    const maxState = maximum.deal(500);
    expect(maxState.phase).toBe('playerTurn');
    expect(maxState.bankroll).toBe(500);
  });

  // B11 — G14, §4.4 [D10, D12]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B11 resets only while betting with less than the minimum bet', () => {
    const poor = createGame({ bankroll: 5 });
    expect(poor.state().bankroll).toBe(5);
    expect(poor.resetBankroll().bankroll).toBe(1000);
    expect(poor.state().bankroll).toBe(1000);

    const minimum = createGame({ bankroll: 10 });
    expectRejected(minimum, () => minimum.resetBankroll(), 'ILLEGAL_ACTION');
    expect(minimum.state().bankroll).toBe(10);

    const playing = createGame({ bankroll: 10, shoe: stackedShoe(['10', '9', '7', '8']) });
    const state = playing.deal(10);
    expect(state.bankroll).toBe(0);
    expect(state.phase).toBe('playerTurn');
    expectRejected(playing, () => playing.resetBankroll(), 'WRONG_PHASE');
  });

  // B12 — G21, G29, §4.4 [D12, D36]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B12 enforces phase precedence and cannot settle a round twice', () => {
    const game = createGame({ shoe: stackedShoe(['10', 'A', '8', '6']) });
    expect(game.availableActions()).toEqual([]);
    expectRejected(game, () => game.act('hit'), 'WRONG_PHASE');
    expectRejected(game, () => game.nextRound(), 'WRONG_PHASE');
    expect(game.deal(100).phase).toBe('playerTurn');
    expectRejected(game, () => game.deal(100), 'WRONG_PHASE');
    expectRejected(game, () => game.nextRound(), 'WRONG_PHASE');
    expectRejected(game, () => game.deal(5), 'WRONG_PHASE');
    const state = game.act('stand');
    expectHand(state, 0, ['10', '8'], 18);
    expectDealer(state, ['A', '6'], 17, true);
    expectSettled(state, [{ outcome: 'win', payout: 200 }],
      { totalBet: 100, totalReturn: 200, net: 100 }, 1100, 308);
    expectRejected(game, () => game.act('stand'), 'WRONG_PHASE');
    expectRejected(game, () => game.deal(100), 'WRONG_PHASE');
    expect(game.state().bankroll).toBe(1100);
    const next = game.nextRound();
    expect(next.phase).toBe('betting');
    expect(next.hands).toHaveLength(0);
    expect(next.dealer.cards).toHaveLength(0);
    expect(next.summary).toBeNull();
    expect(next.bankroll).toBe(1100);
    expect(next.shoeRemaining).toBe(308);
    expect(next.reshuffled).toBe(false);
    expect(game.availableActions()).toEqual([]);
  });

  // B13 — G7, G24, G27, G28 [R2, R3, R6, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B13 permits a soft double and retains soft 21', () => {
    const game = createGame({ shoe: stackedShoe(['A', '9', '7', '8', '3']) });
    game.deal(100);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
    const state = game.act('double');
    expectHand(state, 0, ['A', '7', '3'], 21, true);
    expectDealer(state, ['9', '8'], 17);
    expectSettled(state, [{ outcome: 'win', payout: 400 }],
      { totalBet: 200, totalReturn: 400, net: 200 }, 1200, 307);
  });

  // B14 — G12, G18, §4.4 快照獨立 [D12, D36]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B14 isolates deal and state snapshots down to individual cards', () => {
    const game = createGame({ shoe: stackedShoe(['10', '9', '7', '8']) });
    const dealt = game.deal(100);
    const snapshot = game.state();
    const before = project(snapshot);
    expect(project(dealt)).toEqual(before);

    for (const returned of [dealt, snapshot]) {
      const writable = returned as unknown as {
        bankroll: number;
        hands: { cards: { rank: Rank }[] }[];
      };
      // Reflect.set also exercises getter-only/frozen values without requiring a writable Card.
      // Attempt rank mutation before replacing its containing array, and check each operation.
      Reflect.set(writable.hands[0].cards[0], 'rank', '2');
      expect(project(game.state())).toEqual(before);
      Reflect.set(writable, 'bankroll', 0);
      expect(project(game.state())).toEqual(before);
      Reflect.set(writable.hands[0].cards, '0', { rank: '3', suit: 'C' });
      expect(project(game.state())).toEqual(before);
      Reflect.set(writable.hands, 'length', 0);
      expect(project(game.state())).toEqual(before);
    }
  });

  // B15 — G10, §4.4 GameOptions [D10, D36]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B15 rejects invalid starting bankrolls and accepts zero', () => {
    for (const bankroll of [-1, 10.5, NaN]) {
      expectRuleError(() => createGame({ bankroll }), 'INVALID_BANKROLL');
    }
    const state = createGame({ bankroll: 0 }).state();
    expect(state.phase).toBe('betting');
    expect(state.bankroll).toBe(0);
  });

  // B16 — G20, G27, G28 [D27, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B16 draws for the surviving hand but does not rescue the busted hand', () => {
    const game = createGame({ shoe: stackedShoe(['8', '6', '8', '10', '10', '5', '10', 'K']) });
    game.deal(100);
    game.act('split');
    game.act('hit');
    const state = game.act('stand');
    expectHand(state, 0, ['8', '10', '5'], 23);
    expectHand(state, 1, ['8', '10'], 18);
    expectDealer(state, ['6', '10', 'K'], 26);
    expectSettled(state, [{ outcome: 'lose', payout: 0 }, { outcome: 'win', payout: 200 }],
      { totalBet: 200, totalReturn: 200, net: 0 }, 1000, 304);
  });

  // B17 — G13, G24, G25, G27–G29 [D12, D28, R6, R7, R10]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B17 doubles both split hands and returns the settled balance from the last double', () => {
    const game = createGame({ shoe: stackedShoe(['5', '7', '5', '9', '6', '10', '5', 'K', '2']) });
    game.deal(100);
    expect(game.act('split').bankroll).toBe(800);
    const first = game.act('double');
    expect(first.bankroll).toBe(700);
    expectHand(first, 0, ['5', '6', '10'], 21);
    expect(first.hands[0].bet).toBe(200);
    const state = game.act('double');
    // The intermediate balance of 600 is not observable: this call also settles the round.
    expectHand(state, 0, ['5', '6', '10'], 21);
    expectHand(state, 1, ['5', '5', 'K'], 20);
    expect(state.hands.map((hand) => hand.bet)).toEqual([200, 200]);
    expect(state.hands.map((hand) => hand.doubled)).toEqual([true, true]);
    expectDealer(state, ['7', '9', '2'], 18);
    expectSettled(state, [{ outcome: 'win', payout: 400 }, { outcome: 'win', payout: 400 }],
      { totalBet: 400, totalReturn: 800, net: 400 }, 1400, 303);
  });

  // B18 — G9, G16, G19, G27, G28 [R4, R9, R10, D30]; expected: §9.3 [D36]. 人工確認：Will／2026-10-15
  it('B18 pushes split 21 against dealer 21 after a negative ten-card peek', () => {
    const game = createGame({ shoe: stackedShoe(['K', '10', 'K', '6', 'A', '7', '5']) });
    expect(game.deal(100).phase).toBe('playerTurn');
    const split = game.act('split');
    expectHand(split, 0, ['K', 'A'], 21, true);
    expect(split.hands[0].done).toBe(true);
    expect(split.activeHand).toBe(1);
    expectHand(split, 1, ['K', '7'], 17);
    const state = game.act('stand');
    expectHand(state, 0, ['K', 'A'], 21, true);
    expectHand(state, 1, ['K', '7'], 17);
    expectDealer(state, ['10', '6', '5'], 21);
    expectSettled(state, [{ outcome: 'push', payout: 100 }, { outcome: 'lose', payout: 0 }],
      { totalBet: 200, totalReturn: 100, net: -100 }, 900, 305);
  });
});
