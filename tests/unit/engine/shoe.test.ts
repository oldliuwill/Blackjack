import { afterEach, describe, expect, it, vi } from 'vitest';
import { DECKS, RuleError, SHOE_SIZE, Shoe, cryptoRandom } from '../../../src/engine/index.ts';
import type { Card, RandomSource, Rank, Suit } from '../../../src/engine/index.ts';
import { cards } from '../../support/cards.ts';

const key = (card: Card): string => `${card.suit}:${card.rank}`;

// G2's starting order, written out from the SPEC text: decks 1–6; per deck S, H, D, C; per suit A, 2…10, J, Q, K.
const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const STARTING_ORDER: readonly string[] = Array.from({ length: DECKS }, () =>
  SUITS.flatMap((suit) => RANKS.map((rank) => `${suit}:${rank}`)),
).flat();

// floor(0.999 × (i + 1)) = i for every i < 999, so this value never moves a card.
const NO_SWAP = 0.999;

function drawAll(shoe: Shoe): string[] {
  const order: string[] = [];
  while (shoe.remaining > 0) order.push(key(shoe.draw()));
  return order;
}

/** Returns `values` in order, then `rest` forever, and counts the calls. */
function scripted(values: readonly number[], rest: number): { random: RandomSource; calls: () => number } {
  let calls = 0;
  return {
    random: () => {
      calls += 1;
      return calls <= values.length ? values[calls - 1] : rest;
    },
    calls: () => calls,
  };
}

describe('Shoe.create shuffle (G2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the starting order and deals from index 0 when no swap happens', () => {
    const { random, calls } = scripted([], NO_SWAP);
    const order = drawAll(Shoe.create(random));

    expect(order).toEqual(STARTING_ORDER);
    expect(order[0]).toBe('S:A');
    expect(order[13]).toBe('H:A');
    expect(order[52]).toBe('S:A');
    expect(order[SHOE_SIZE - 1]).toBe('C:K');
    // One call per i from n − 1 down to 1.
    expect(calls()).toBe(SHOE_SIZE - 1);
  });

  it('swaps each i with j = 0 when random returns 0, rotating the starting order by one', () => {
    const order = drawAll(Shoe.create(() => 0));

    expect(order).toEqual([...STARTING_ORDER.slice(1), STARTING_ORDER[0]]);
    expect(order[0]).toBe('S:2');
    expect(order[SHOE_SIZE - 1]).toBe('S:A');
  });

  it('uses j = floor(random × (i + 1)) with i counting down from n − 1', () => {
    // i = 311: j = floor(0.25 × 312) = 78, swap 311 ↔ 78. i = 310: j = 0, swap 310 ↔ 0. No other swaps.
    const { random, calls } = scripted([0.25, 0], NO_SWAP);
    const order = drawAll(Shoe.create(random));

    const expected = [...STARTING_ORDER];
    expected[0] = 'C:Q'; // starting index 310: deck 6, 50th card
    expected[78] = 'C:K'; // starting index 311: deck 6, last card
    expected[310] = 'S:A'; // starting index 0: deck 1, first card
    expected[311] = 'D:A'; // starting index 78: deck 2, 26th card
    expect(order).toEqual(expected);
    expect(calls()).toBe(SHOE_SIZE - 1);
  });

  it('uses cryptoRandom when no random is given', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    const shoe = Shoe.create();

    expect(shoe.remaining).toBe(SHOE_SIZE);
    expect(spy).toHaveBeenCalledTimes(SHOE_SIZE - 1);
  });
});

describe('cryptoRandom', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns numbers in [0, 1)', () => {
    for (let n = 0; n < 10_000; n += 1) {
      const value = cryptoRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it.each([
    { word: 0, expected: 0 },
    { word: 0xffffffff, expected: 1 - 2 ** -32 },
  ])('maps the extreme word $word to $expected', ({ word, expected }) => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      if (array instanceof Uint32Array) array.fill(word);
      return array;
    });

    const value = cryptoRandom();
    expect(value).toBe(expected);
    expect(value).toBeLessThan(1);
  });
});

describe('Shoe.fromCards', () => {
  it('copies the card objects, so mutating an input card does not change the shoe', () => {
    const input = cards('A', '2');
    const shoe = Shoe.fromCards(input);

    (input[0] as { rank: Rank }).rank = 'K';

    expect(key(shoe.draw())).toBe('S:A');
    expect(key(shoe.draw())).toBe('H:2');
  });
});

describe('RuleError', () => {
  it('is an Error carrying the SHOE_EMPTY code when the shoe runs out', () => {
    const shoe = Shoe.fromCards(cards('9'));
    shoe.draw();

    let error: unknown;
    try {
      shoe.draw();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RuleError);
    expect(error).toMatchObject({ name: 'RuleError', code: 'SHOE_EMPTY' });
    expect(shoe.remaining).toBe(0);
  });

  it('defaults the message to the code and keeps a given message', () => {
    expect(new RuleError('WRONG_PHASE').message).toBe('WRONG_PHASE');
    expect(new RuleError('INVALID_BET', 'Bet must be a multiple of 10.').message).toBe('Bet must be a multiple of 10.');
  });
});
