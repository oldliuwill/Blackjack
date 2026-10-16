import { describe, expect, it } from 'vitest';
import { RuleError, Shoe } from '../../src/engine/index.ts';
import type { Card } from '../../src/engine/index.ts';
import { cards, seededRandom } from '../support/cards.ts';

// Compare cards by value: toEqual on objects without own enumerable keys (e.g. getter-only classes) always passes.
const key = (card: Card): string => `${card.suit}:${card.rank}`;

describe('SPEC-001 §9.2 — shoe', () => {
  // C1 — G1 [D9, R1], §4.5; expected: §9.2. 人工確認：Will／2026-10-15
  it('contains six of each of the 52 cards and rejects draw 313', () => {
    const shoe = Shoe.create(seededRandom(20261015));
    const counts = new Map<string, number>();

    expect(shoe.remaining).toBe(312);
    for (let index = 0; index < 312; index += 1) {
      const card = shoe.draw();
      const key = `${card.suit}:${card.rank}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      expect(shoe.remaining).toBe(311 - index);
    }

    expect(counts.size).toBe(52);
    for (const suit of ['S', 'H', 'D', 'C']) {
      for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) {
        expect(counts.get(`${suit}:${rank}`), `${suit}:${rank}`).toBe(6);
      }
    }

    // Capture one call so the type and code assertions both concern draw 313.
    let error: unknown;
    try {
      shoe.draw();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(RuleError);
    expect(error).toHaveProperty('code', 'SHOE_EMPTY');
    expect(shoe.remaining).toBe(0);
  });

  // C2 — G2 [D12], §4.2; expected: §9.2. 人工確認：Will／2026-10-15
  it('reproduces all 312 cards from the same random sequence', () => {
    const first = Shoe.create(seededRandom(20261015));
    const second = Shoe.create(seededRandom(20261015));
    const firstOrder: Card[] = [];
    const secondOrder: Card[] = [];

    expect(first.remaining).toBe(312);
    expect(second.remaining).toBe(312);
    for (let index = 0; index < 312; index += 1) {
      firstOrder.push(first.draw());
      secondOrder.push(second.draw());
    }

    expect(firstOrder).toHaveLength(312);
    expect(secondOrder.map(key)).toEqual(firstOrder.map(key));
    expect(first.remaining).toBe(0);
    expect(second.remaining).toBe(0);
  });

  // C3 — §4.2, §4.5 [D12, D36]; expected: §9.2. 人工確認：Will／2026-10-15
  it('copies the input array and draws in its original order', () => {
    const input = cards('A', '2', 'K');
    const shoe = Shoe.fromCards(input);

    input.reverse();
    input[1] = { rank: 'Q', suit: 'C' };
    input.push({ rank: '9', suit: 'D' });

    expect(shoe.remaining).toBe(3);
    expect(key(shoe.draw())).toBe('S:A');
    expect(shoe.remaining).toBe(2);
    expect(key(shoe.draw())).toBe('H:2');
    expect(shoe.remaining).toBe(1);
    expect(key(shoe.draw())).toBe('D:K');
    expect(shoe.remaining).toBe(0);
  });

  // C3 — §4.2, §4.5 [D12, D36]; expected: §9.2. 人工確認：Will／2026-10-15
  it('rejects a draw from an empty input array with SHOE_EMPTY', () => {
    const shoe = Shoe.fromCards([]);
    expect(shoe.remaining).toBe(0);

    let error: unknown;
    try {
      shoe.draw();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(RuleError);
    expect(error).toHaveProperty('code', 'SHOE_EMPTY');
    expect(shoe.remaining).toBe(0);
  });
});
