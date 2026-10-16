import { describe, expect, it } from 'vitest';
import { handValue, isBlackjack } from '../../../src/engine/index.ts';
import type { Card, HandValue, Rank } from '../../../src/engine/index.ts';
import { cards } from '../../support/cards.ts';

describe('handValue', () => {
  // G6: a lone ace is soft 11; 2–10 count face value; J, Q, K count 10.
  it.each<{ rank: Rank; expected: HandValue }>([
    { rank: 'A', expected: { total: 11, soft: true } },
    { rank: '2', expected: { total: 2, soft: false } },
    { rank: '3', expected: { total: 3, soft: false } },
    { rank: '4', expected: { total: 4, soft: false } },
    { rank: '5', expected: { total: 5, soft: false } },
    { rank: '6', expected: { total: 6, soft: false } },
    { rank: '7', expected: { total: 7, soft: false } },
    { rank: '8', expected: { total: 8, soft: false } },
    { rank: '9', expected: { total: 9, soft: false } },
    { rank: '10', expected: { total: 10, soft: false } },
    { rank: 'J', expected: { total: 10, soft: false } },
    { rank: 'Q', expected: { total: 10, soft: false } },
    { rank: 'K', expected: { total: 10, soft: false } },
  ])('values a lone $rank as $expected', ({ rank, expected }) => {
    expect(handValue(cards(rank))).toEqual(expected);
  });

  // G7: at most one ace counts 11, and only while hard + 10 ≤ 21.
  it.each<{ ranks: Rank[]; expected: HandValue }>([
    { ranks: ['A', 'A', 'A', 'A'], expected: { total: 14, soft: true } },
    { ranks: ['A', '10'], expected: { total: 21, soft: true } },
    { ranks: ['A', 'A', '10'], expected: { total: 12, soft: false } },
    { ranks: ['A', '5', '5'], expected: { total: 21, soft: true } },
    { ranks: ['A', '5', '6'], expected: { total: 12, soft: false } },
    { ranks: ['K', 'Q', 'J'], expected: { total: 30, soft: false } },
  ])('values $ranks as $expected', ({ ranks, expected }) => {
    expect(handValue(cards(...ranks))).toEqual(expected);
  });

  it('ignores suits', () => {
    const spades: Card[] = [{ rank: 'A', suit: 'S' }, { rank: '6', suit: 'S' }];
    const mixed: Card[] = [{ rank: 'A', suit: 'D' }, { rank: '6', suit: 'C' }];
    expect(handValue(mixed)).toEqual(handValue(spades));
  });

  it('does not modify its input', () => {
    const hand = cards('A', 'K', '5');
    const before = structuredClone(hand);
    handValue(hand);
    expect(hand).toEqual(before);
  });
});

describe('isBlackjack', () => {
  const tens: Rank[] = ['10', 'J', 'Q', 'K'];

  // G9: an ace and a ten-value card, in either order.
  it.each(tens.flatMap((ten) => [[ten, 'A'] as Rank[], ['A', ten] as Rank[]]))('is true for %s, %s', (...ranks) => {
    expect(isBlackjack(cards(...ranks))).toBe(true);
  });

  it.each<Rank[][]>([
    [['A']],
    [['K']],
    [['A', '9']],
    [['9', 'K']],
    [['A', 'K', '10']],
    [['7', '7', '7']],
    [['A', 'A', '9']],
  ])('is false for %j', (ranks) => {
    expect(isBlackjack(cards(...ranks))).toBe(false);
  });
});
