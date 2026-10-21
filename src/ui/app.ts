// The table's state: the engine game, the bet built from chips, and the saved bankroll (SPEC-001 §3.8).
// No DOM here, so U7 (save after every change) is unit-tested without jsdom. Rules stay in the engine:
// actions come from availableActions() and every amount from the game state.
import { MAX_BET, MIN_BET, createGame } from '../engine/index.ts';
import type { Action, GameState, Shoe } from '../engine/index.ts';
import { readBankroll, writeBankroll } from './storage.ts';
import type { BankrollStorage } from './storage.ts';

/** U3: chip values, smallest first. */
export const CHIP_VALUES: readonly number[] = [10, 50, 100, 500];

export interface Chip {
  readonly value: number;
  readonly enabled: boolean;  // U3: off when the bet would pass MAX_BET or the bankroll
}

export interface AppView {
  readonly state: GameState;
  readonly actions: readonly Action[];  // availableActions(); empty outside playerTurn
  readonly bet: number;                 // the bet built from chips; kept for the next hand when it still fits
  readonly chips: readonly Chip[];
  readonly canClear: boolean;
  readonly canDeal: boolean;
  readonly canReset: boolean;           // U5, G14: betting and the bankroll is under MIN_BET
}

export interface App {
  view(): AppView;
  subscribe(listener: (view: AppView) => void): void;
  addChip(value: number): void;
  clearBet(): void;
  deal(): void;
  act(action: Action): void;  // ignored unless availableActions() offers it (U4)
  nextHand(): void;
  resetBankroll(): void;
}

/** Each method ignores a call its controls would not offer, so stale clicks and keys do nothing. */
export function createApp(storage: BankrollStorage | null, shoe?: Shoe): App {
  const game = createGame({ bankroll: readBankroll(storage), shoe });
  const listeners: ((view: AppView) => void)[] = [];
  let state = game.state();
  let bet = 0;

  const fits = (amount: number): boolean => amount <= MAX_BET && amount <= state.bankroll;
  const betting = (): boolean => state.phase === 'betting';

  function view(): AppView {
    return {
      state,
      actions: game.availableActions(),
      bet,
      chips: CHIP_VALUES.map((value) => ({ value, enabled: betting() && fits(bet + value) })),
      canClear: betting() && bet > 0,
      canDeal: betting() && bet >= MIN_BET,
      canReset: betting() && state.bankroll < MIN_BET,
    };
  }

  // U7: every change ends here, so the saved bankroll always matches the table.
  function commit(next: GameState = state): void {
    state = next;
    writeBankroll(storage, state.bankroll);
    const current = view();
    for (const listener of listeners) listener(current);
  }

  commit();
  return {
    view,
    subscribe(listener) {
      listeners.push(listener);
    },
    addChip(value) {
      if (!betting() || !CHIP_VALUES.includes(value) || !fits(bet + value)) return;
      bet += value;
      commit();
    },
    clearBet() {
      if (!view().canClear) return;
      bet = 0;
      commit();
    },
    deal() {
      if (view().canDeal) commit(game.deal(bet));
    },
    act(action) {
      if (game.availableActions().includes(action)) commit(game.act(action));
    },
    nextHand() {
      if (state.phase !== 'settled') return;
      state = game.nextRound();
      if (!fits(bet)) bet = 0;
      commit();
    },
    resetBankroll() {
      if (view().canReset) commit(game.resetBankroll());
    },
  };
}
