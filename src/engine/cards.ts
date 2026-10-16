// Hand values (SPEC-001 §3.2 G6–G9, §4.3).
import type { Card, HandValue, Rank } from './types.ts';

// G6: aces count 1 here; G7 adds SOFT_ACE_BONUS when it fits.
const RANK_VALUES: Readonly<Record<Rank, number>> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10,
};
const SOFT_ACE_BONUS = 10; // one ace counted as 11 instead of 1
const BLACKJACK_TOTAL = 21;
const BLACKJACK_CARDS = 2;

/** G7: count every ace as 1 (`hard`); with an ace and `hard + 10 ≤ 21`, the total is `hard + 10` and soft. */
export function handValue(cards: readonly Card[]): HandValue {
  let hard = 0;
  let hasAce = false;
  for (const card of cards) {
    hard += RANK_VALUES[card.rank];
    if (card.rank === 'A') hasAce = true;
  }
  if (hasAce && hard + SOFT_ACE_BONUS <= BLACKJACK_TOTAL) {
    return { total: hard + SOFT_ACE_BONUS, soft: true };
  }
  return { total: hard, soft: false };
}

/**
 * G9: exactly two cards, an ace and a ten-value card. Whether the hand came from a split is the game's call.
 * Two cards reach 21 only as ace + ten-value (A+A is 12, two non-aces at most 20), so the total decides.
 */
export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === BLACKJACK_CARDS && handValue(cards).total === BLACKJACK_TOTAL;
}
