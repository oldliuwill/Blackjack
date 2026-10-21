// Saves the bankroll between visits (SPEC-001 §3.8 U7). The only module that touches Web Storage.
import { STARTING_BANKROLL } from '../engine/index.ts';

export const BANKROLL_KEY = 'blackjack.bankroll';
const WHOLE_NUMBER = /^\d+$/;

/** The part of the Storage interface used here; unit tests pass an in-memory fake (SPEC-001 §5). */
export type BankrollStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** window.localStorage, or null when the browser blocks it: reading the property itself can throw. */
export function browserStorage(): BankrollStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** U7: only a string of digits is a saved bankroll; anything else, or a storage that throws, gives 1,000. */
export function readBankroll(storage: BankrollStorage | null): number {
  let saved: string | null;
  try {
    saved = storage?.getItem(BANKROLL_KEY) ?? null;
  } catch {
    return STARTING_BANKROLL;
  }
  if (saved === null || !WHOLE_NUMBER.test(saved)) return STARTING_BANKROLL;
  const bankroll = Number(saved);
  // Enough digits pass the pattern but lose precision or become Infinity, which createGame rejects.
  return Number.isSafeInteger(bankroll) ? bankroll : STARTING_BANKROLL;
}

/** U7: a storage that throws (disabled or full) skips the write and the game goes on. */
export function writeBankroll(storage: BankrollStorage | null, bankroll: number): void {
  try {
    storage?.setItem(BANKROLL_KEY, String(bankroll));
  } catch {
    // The bankroll is not saved this time; nothing else depends on it.
  }
}
