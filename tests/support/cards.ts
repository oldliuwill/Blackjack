// Fixed card orders and injected randomness for unit and acceptance tests (SPEC-001 §9.1).
// No assertions live here. Written by the orchestrator, reviewed by Codex (baseline A17).
import { SHOE_SIZE, Shoe } from '../../src/engine/index.ts';
import type { Card, RandomSource, Rank, Suit } from '../../src/engine/index.ts';

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Padding for stackedShoe: one deck in G2's starting order (S, H, D, C; A, 2…10, J, Q, K), repeated.
const FILLER: readonly Card[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));

/** Cards with the given ranks, in order. Suits rotate S, H, D, C; a suit never affects a result. */
export function cards(...ranks: Rank[]): Card[] {
  return ranks.map((rank, i) => ({ rank, suit: SUITS[i % SUITS.length] }));
}

/**
 * A shoe that deals `ranks` first, in order, then fixed filler up to `total` cards.
 * The default total of SHOE_SIZE keeps G3 from reshuffling; cases that test reshuffling use Shoe.fromCards.
 */
export function stackedShoe(ranks: readonly Rank[], total: number = SHOE_SIZE): Shoe {
  if (!Number.isInteger(total) || total < ranks.length) {
    throw new Error(`stackedShoe: total must be an integer >= ${ranks.length}, got ${total}`);
  }
  const filler = Array.from({ length: total - ranks.length }, (_, i) => FILLER[i % FILLER.length]);
  return Shoe.fromCards([...cards(...ranks), ...filler]);
}

/** A deterministic RandomSource in [0, 1): the same seed always yields the same sequence (mulberry32). */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
