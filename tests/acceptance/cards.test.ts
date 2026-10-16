import { describe, expect, it } from 'vitest';
import { handValue, isBlackjack } from '../../src/engine/index.ts';
import type { HandValue, Rank } from '../../src/engine/index.ts';
import { cards } from '../support/cards.ts';

describe('SPEC-001 §9.2 — card values', () => {
  const handValues: { ranks: Rank[]; expected: HandValue }[] = [
    { ranks: [], expected: { total: 0, soft: false } },
    { ranks: ['2', '3'], expected: { total: 5, soft: false } },
    { ranks: ['10', '7'], expected: { total: 17, soft: false } },
    { ranks: ['A', '6'], expected: { total: 17, soft: true } },
    { ranks: ['A', '2', '4'], expected: { total: 17, soft: true } },
    { ranks: ['A', 'A', '5'], expected: { total: 17, soft: true } },
    { ranks: ['A', '6', '10'], expected: { total: 17, soft: false } },
    { ranks: ['A', 'A'], expected: { total: 12, soft: true } },
    { ranks: ['A', '6', '9'], expected: { total: 16, soft: false } },
    { ranks: ['A', 'A', '9'], expected: { total: 21, soft: true } },
    { ranks: ['A', 'A', 'A', '8'], expected: { total: 21, soft: true } },
    { ranks: ['K', 'Q', 'A'], expected: { total: 21, soft: false } },
    { ranks: ['5', '6', 'K'], expected: { total: 21, soft: false } },
    { ranks: ['A', 'K'], expected: { total: 21, soft: true } },
    { ranks: ['J', 'Q'], expected: { total: 20, soft: false } },
    { ranks: ['10', '6', '9'], expected: { total: 25, soft: false } },
    { ranks: ['A', '10', 'A', '10'], expected: { total: 22, soft: false } },
  ];

  // C4 — G6, G7 [R2, R3]; expected: §9.2 C4 table. 人工確認：Will／2026-10-15
  it.each(handValues)('C4: handValue($ranks) = $expected', ({ ranks, expected }) => {
    expect(handValue(cards(...ranks))).toEqual(expected);
  });

  const blackjacks: { ranks: Rank[]; expected: boolean }[] = [
    { ranks: ['A', 'K'], expected: true },
    { ranks: ['Q', 'A'], expected: true },
    { ranks: ['A', '10'], expected: true },
    { ranks: ['J', 'A'], expected: true },
    { ranks: ['A', '5', '5'], expected: false },
    { ranks: ['10', '10'], expected: false },
    { ranks: ['A', 'A'], expected: false },
    { ranks: ['A', '9'], expected: false },
    { ranks: [], expected: false },
  ];

  // C5 — G9 [R5, R9, D12], §4.3; expected: §9.2. 人工確認：Will／2026-10-15
  it.each(blackjacks)('C5: isBlackjack($ranks) = $expected', ({ ranks, expected }) => {
    expect(isBlackjack(cards(...ranks))).toBe(expected);
  });
});
