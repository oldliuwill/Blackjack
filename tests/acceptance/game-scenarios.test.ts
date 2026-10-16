import { describe, expect, it } from 'vitest';
import { createGame, RuleError } from '../../src/engine/index.ts';
import type { Action, Game, GameState, Outcome, Rank, RoundSummary, RuleErrorCode } from '../../src/engine/index.ts';
import { stackedShoe } from '../support/cards.ts';

// Read every field explicitly: getter-only Card objects must be compared by value.
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

function expectRejected(game: Game, call: () => unknown, code: RuleErrorCode) {
  const before = project(game.state());
  let error: unknown;
  try {
    call();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(RuleError);
  expect(error).toHaveProperty('code', code);
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

// All expected numbers are literals supplied by each source case, not calculated by game logic.
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

describe('SPEC-001 §9.3 — game scenarios', () => {
  // S1 — G9, G17, G28 [R5, D26, D27]; expected: 規則研究表 #1、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S1 settles a natural blackjack without drawing for the dealer', () => {
    const game = createGame({ shoe: stackedShoe(['A', '9', 'K', '7']) });
    const state = game.deal(100);
    expectHand(state, 0, ['A', 'K'], 21, true);
    expectDealer(state, ['9', '7'], 16);
    expectSettled(state, [{ outcome: 'blackjack', payout: 250 }],
      { totalBet: 100, totalReturn: 250, net: 150 }, 1150, 308);
  });

  // S2 — G16, G28 [R4, R10]; expected: 規則研究表 #2、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S2 pushes when both initial hands are blackjack', () => {
    const game = createGame({ shoe: stackedShoe(['A', 'A', 'Q', 'K']) });
    const state = game.deal(100);
    expectHand(state, 0, ['A', 'Q'], 21, true);
    expectDealer(state, ['A', 'K'], 21, true);
    expectSettled(state, [{ outcome: 'push', payout: 100 }],
      { totalBet: 100, totalReturn: 100, net: 0 }, 1000, 308);
  });

  // S3 — G16, G27, G28 [R4, R11]; expected: 規則研究表 #3、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S3 peeks under an ace and settles before split or double', () => {
    const game = createGame({ shoe: stackedShoe(['8', 'A', '8', 'Q']) });
    const state = game.deal(100);
    expectHand(state, 0, ['8', '8'], 16);
    expectDealer(state, ['A', 'Q'], 21, true);
    expectSettled(state, [{ outcome: 'lose', payout: 0 }],
      { totalBet: 100, totalReturn: 0, net: -100 }, 900, 308);
    expect(game.availableActions()).toEqual([]);
    expectRejected(game, () => game.act('split'), 'WRONG_PHASE');
    expectRejected(game, () => game.act('double'), 'WRONG_PHASE');
  });

  // S4 — G16, G27, G28 [R2, R4]; expected: 規則研究表 #4、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S4 also peeks under a ten-value card before split or double', () => {
    const game = createGame({ shoe: stackedShoe(['5', 'K', '6', 'A']) });
    const state = game.deal(100);
    expectHand(state, 0, ['5', '6'], 11);
    expectDealer(state, ['K', 'A'], 21, true);
    expectSettled(state, [{ outcome: 'lose', payout: 0 }],
      { totalBet: 100, totalReturn: 0, net: -100 }, 900, 308);
    expect(game.availableActions()).toEqual([]);
    expectRejected(game, () => game.act('split'), 'WRONG_PHASE');
    expectRejected(game, () => game.act('double'), 'WRONG_PHASE');
  });

  // S5 — G12, G16, G26, G27, G28 [R3, R4, R10]; expected: 規則研究表 #5、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S5 hides the hole card after a negative peek and stands on soft 17', () => {
    const game = createGame({ shoe: stackedShoe(['10', 'A', '8', '6']) });
    const dealt = game.deal(100);
    expect(dealt.phase).toBe('playerTurn');
    expect(dealt.dealer.cards.map((card) => card.rank)).toEqual(['A']);
    expect(dealt.dealer.holeHidden).toBe(true);
    expect(dealt.dealer.value).toEqual({ total: 11, soft: true });
    expect(dealt.bankroll).toBe(900);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
    const state = game.act('stand');
    expectHand(state, 0, ['10', '8'], 18);
    expectDealer(state, ['A', '6'], 17, true);
    expectSettled(state, [{ outcome: 'win', payout: 200 }],
      { totalBet: 100, totalReturn: 200, net: 100 }, 1100, 308);
  });

  // S6 — G7, G26, G27, G28 [R2, R3, R10]; expected: 規則研究表 #6、§9.3 [D29]. 人工確認：Will／2026-10-15
  it('S6 stops the dealer at a three-card soft 17', () => {
    const game = createGame({ shoe: stackedShoe(['10', 'A', '8', '2', '4']) });
    game.deal(100);
    const state = game.act('stand');
    expectHand(state, 0, ['10', '8'], 18);
    expectDealer(state, ['A', '2', '4'], 17, true);
    expectSettled(state, [{ outcome: 'win', payout: 200 }],
      { totalBet: 100, totalReturn: 200, net: 100 }, 1100, 307);
  });

  // S7 — G26, G27, G28 [R2, R3, R10]; expected: 規則研究表 #7、§9.3 [D29]. 人工確認：Will／2026-10-15
  it('S7 draws on dealer hard 16 and pays a win after the dealer busts', () => {
    const game = createGame({ shoe: stackedShoe(['10', '6', '7', 'Q', 'K']) });
    game.deal(100);
    const state = game.act('stand');
    expectHand(state, 0, ['10', '7'], 17);
    expectDealer(state, ['6', 'Q', 'K'], 26);
    expectSettled(state, [{ outcome: 'win', payout: 200 }],
      { totalBet: 100, totalReturn: 200, net: 100 }, 1100, 307);
  });

  // S8 — G8, G16, G20, G27, G28 [R4, R10, D27]; expected: 規則研究表 #8、§9.3 [D29]. 人工確認：Will／2026-10-15
  it('S8 immediately loses a busted player hand', () => {
    const game = createGame({ shoe: stackedShoe(['10', '10', '6', '7', 'K']) });
    game.deal(100);
    const state = game.act('hit');
    expectHand(state, 0, ['10', '6', 'K'], 26);
    expectDealer(state, ['10', '7'], 17);
    expectSettled(state, [{ outcome: 'lose', payout: 0 }],
      { totalBet: 100, totalReturn: 0, net: -100 }, 900, 307);
  });

  // S9 — G24, G26, G27, G28 [R3, R6, R10]; expected: 規則研究表 #9、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S9 doubles to an ordinary 21 and wins against dealer 20', () => {
    const game = createGame({ shoe: stackedShoe(['5', '6', '6', '10', 'K', '4']) });
    game.deal(100);
    const state = game.act('double');
    expectHand(state, 0, ['5', '6', 'K'], 21);
    expect(state.hands[0].bet).toBe(200);
    expect(state.hands[0].doubled).toBe(true);
    expect(state.hands[0].cards).toHaveLength(3);
    expectDealer(state, ['6', '10', '4'], 20);
    expectSettled(state, [{ outcome: 'win', payout: 400 }],
      { totalBet: 200, totalReturn: 400, net: 200 }, 1200, 306);
  });

  // S10 — G16, G24, G27, G28 [R4, R6, R10]; expected: 規則研究表 #10、§9.3 [D29]. 人工確認：Will／2026-10-15
  it('S10 permits doubling a two-card five and loses the doubled bet', () => {
    const game = createGame({ shoe: stackedShoe(['2', '10', '3', '8', 'K']) });
    game.deal(100);
    const state = game.act('double');
    expectHand(state, 0, ['2', '3', 'K'], 15);
    expect(state.hands[0].bet).toBe(200);
    expect(state.hands[0].doubled).toBe(true);
    expectDealer(state, ['10', '8'], 18);
    expectSettled(state, [{ outcome: 'lose', payout: 0 }],
      { totalBet: 200, totalReturn: 0, net: -200 }, 800, 307);
  });

  // S11 — G25, G27, G28 [R4, R7, R10, D27]; expected: 規則研究表 #11、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S11 delays the second split hand card and settles one win and one loss', () => {
    const game = createGame({ shoe: stackedShoe(['8', '10', '8', '7', '10', '7']) });
    game.deal(100);
    const split = game.act('split');
    expect(split.hands).toHaveLength(2);
    expect(split.activeHand).toBe(0);
    expectHand(split, 0, ['8', '10'], 18);
    expectHand(split, 1, ['8'], 8);
    const second = game.act('stand');
    expect(second.activeHand).toBe(1);
    expectHand(second, 1, ['8', '7'], 15);
    const state = game.act('stand');
    expectHand(state, 0, ['8', '10'], 18);
    expectHand(state, 1, ['8', '7'], 15);
    expectDealer(state, ['10', '7'], 17);
    expectSettled(state, [{ outcome: 'win', payout: 200 }, { outcome: 'lose', payout: 0 }],
      { totalBet: 200, totalReturn: 200, net: 0 }, 1000, 306);
  });

  // S12 — G12, G24, G25, G27, G28 [R6, R7, R10, D27]; expected: 規則研究表 #12、§9.3 [D29], §4.6; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S12 doubles after splitting and follows the §4.6 dealing order', () => {
    const game = createGame({ shoe: stackedShoe(['8', '6', '8', '10', '3', 'K', '10', '4']) });
    const dealt = game.deal(100);
    expect(dealt.phase).toBe('playerTurn');
    expect(dealt.bankroll).toBe(900);
    expectHand(dealt, 0, ['8', '8'], 16);
    expect(dealt.dealer.cards.map((card) => card.rank)).toEqual(['6']);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double', 'split']);
    const split = game.act('split');
    expect(split.hands).toHaveLength(2);
    expect(split.activeHand).toBe(0);
    expect(split.bankroll).toBe(800);
    expectHand(split, 0, ['8', '3'], 11);
    expectHand(split, 1, ['8'], 8);
    const doubled = game.act('double');
    expect(doubled.bankroll).toBe(700);
    expectHand(doubled, 0, ['8', '3', 'K'], 21);
    expect(doubled.hands[0].bet).toBe(200);
    expect(doubled.hands[0].done).toBe(true);
    expect(doubled.activeHand).toBe(1);
    expectHand(doubled, 1, ['8', '10'], 18);
    const state = game.act('stand');
    expectHand(state, 0, ['8', '3', 'K'], 21);
    expectHand(state, 1, ['8', '10'], 18);
    expectDealer(state, ['6', '10', '4'], 20);
    expectSettled(state, [{ outcome: 'win', payout: 400 }, { outcome: 'lose', payout: 0 }],
      { totalBet: 300, totalReturn: 400, net: 100 }, 1100, 304);
  });

  // S13 — G9, G25, G28 [R4, R8, R9, D12]; expected: 規則研究表 #13、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S13 ends both split aces after one card and pays ordinary wins', () => {
    const game = createGame({ shoe: stackedShoe(['A', '10', 'A', '8', 'K', '9']) });
    game.deal(100);
    const state = game.act('split');
    expectHand(state, 0, ['A', 'K'], 21, true);
    expectHand(state, 1, ['A', '9'], 20, true);
    for (const hand of state.hands) {
      expect(hand.splitAces).toBe(true);
      expect(hand.cards).toHaveLength(2);
    }
    expect(game.availableActions()).toEqual([]);
    expectDealer(state, ['10', '8'], 18);
    expectSettled(state, [{ outcome: 'win', payout: 200 }, { outcome: 'win', payout: 200 }],
      { totalBet: 200, totalReturn: 400, net: 200 }, 1200, 306);
  });

  // S14 — G25, G27, G28, §4.4 [R4, R10, R11, D9]; expected: 規則研究表 #14、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S14 rejects surrender and insurance without changes, then pushes', () => {
    const game = createGame({ shoe: stackedShoe(['10', '10', '8', '8']) });
    game.deal(100);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
    expectRejected(game, () => game.act('surrender' as Action), 'ILLEGAL_ACTION');
    expectRejected(game, () => game.act('insurance' as Action), 'ILLEGAL_ACTION');
    const state = game.act('stand');
    expectHand(state, 0, ['10', '8'], 18);
    expectDealer(state, ['10', '8'], 18);
    expectSettled(state, [{ outcome: 'push', payout: 100 }],
      { totalBet: 100, totalReturn: 100, net: 0 }, 1000, 308);
  });

  // S15 — G7, G22, G27, G28 [R2, R10]; expected: 規則研究表 #15、§9.3 [D29]. 人工確認：Will／2026-10-15
  it('S15 demotes the ace to one and permits another hit', () => {
    const game = createGame({ shoe: stackedShoe(['A', '10', '6', '8', '9', '4']) });
    const dealt = game.deal(100);
    expectHand(dealt, 0, ['A', '6'], 17, true);
    const firstHit = game.act('hit');
    expectHand(firstHit, 0, ['A', '6', '9'], 16);
    expect(firstHit.phase).toBe('playerTurn');
    expectHand(game.act('hit'), 0, ['A', '6', '9', '4'], 20);
    const state = game.act('stand');
    expectHand(state, 0, ['A', '6', '9', '4'], 20);
    expectDealer(state, ['10', '8'], 18);
    expectSettled(state, [{ outcome: 'win', payout: 200 }],
      { totalBet: 100, totalReturn: 200, net: 100 }, 1100, 306);
  });

  // S16 — G25, G27, G28, §4.4 [R7, R10, D9, D27]; expected: 規則研究表 #16、§9.3 [D29]; 追加：§9.3 [D36]. 人工確認：Will／2026-10-15
  it('S16 rejects resplitting without spending money or consuming cards', () => {
    const game = createGame({ shoe: stackedShoe(['8', '10', '8', '7', '8', '2', '10']) });
    game.deal(100);
    const split = game.act('split');
    expect(split.hands).toHaveLength(2);
    expect(split.activeHand).toBe(0);
    expectHand(split, 0, ['8', '8'], 16);
    expectHand(split, 1, ['8'], 8);
    expect(game.availableActions()).toEqual(['hit', 'stand', 'double']);
    expectRejected(game, () => game.act('split'), 'ILLEGAL_ACTION');
    const hit = game.act('hit');
    expectHand(hit, 0, ['8', '8', '2'], 18);
    expectHand(hit, 1, ['8'], 8);
    const second = game.act('stand');
    expect(second.activeHand).toBe(1);
    expectHand(second, 1, ['8', '10'], 18);
    const state = game.act('stand');
    expectHand(state, 0, ['8', '8', '2'], 18);
    expectHand(state, 1, ['8', '10'], 18);
    expectDealer(state, ['10', '7'], 17);
    expectSettled(state, [{ outcome: 'win', payout: 200 }, { outcome: 'win', payout: 200 }],
      { totalBet: 200, totalReturn: 400, net: 200 }, 1200, 305);
  });
});
