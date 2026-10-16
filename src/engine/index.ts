// The engine's only public entry point (SPEC-001 §4). Export exactly what §4 lists; createGame, Game and
// GameOptions arrive with TASK-003.
export type {
  Action,
  Card,
  DealerView,
  GameState,
  HandValue,
  Outcome,
  Phase,
  PlayerHand,
  RandomSource,
  Rank,
  RoundSummary,
  Suit,
} from './types.ts';
export {
  BET_STEP,
  DEALER_STANDS_ON,
  DECKS,
  MAX_BET,
  MIN_BET,
  RESHUFFLE_AT,
  SHOE_SIZE,
  STARTING_BANKROLL,
} from './rules.ts';
export { RuleError } from './errors.ts';
export type { RuleErrorCode } from './errors.ts';
export { Shoe, cryptoRandom } from './shoe.ts';
export { handValue, isBlackjack } from './cards.ts';
