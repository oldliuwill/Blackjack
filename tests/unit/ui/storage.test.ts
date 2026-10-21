// TASK-004 A4-1 (SPEC-001 §3.8 U7, G10, G14, G15). Expected values come from U7 and the card's A4-1 row;
// the round amounts are the §4.6 S12 example.
import { describe, expect, it } from 'vitest';
import { STARTING_BANKROLL } from '../../../src/engine/index.ts';
import { createApp } from '../../../src/ui/app.ts';
import { BANKROLL_KEY, readBankroll, writeBankroll } from '../../../src/ui/storage.ts';
import type { BankrollStorage } from '../../../src/ui/storage.ts';
import { stackedShoe } from '../../support/cards.ts';

/** In-memory Storage (SPEC-001 §5: no jsdom). Records each value written under BANKROLL_KEY. */
class MemoryStorage implements BankrollStorage {
  readonly writes: string[] = [];
  readonly #items = new Map<string, string>();

  constructor(saved?: string) {
    if (saved !== undefined) this.#items.set(BANKROLL_KEY, saved);
  }

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
    if (key === BANKROLL_KEY) this.writes.push(value);
  }
}

/** A storage the browser has disabled: every call throws, as localStorage does in that case. */
const blocked: BankrollStorage = {
  getItem() {
    throw new Error('SecurityError: storage is disabled');
  },
  setItem() {
    throw new Error('QuotaExceededError: storage is full');
  },
};

describe('readBankroll (U7)', () => {
  it.each([
    ['1500', 1500],
    ['0', 0],
  ])('accepts the digit string %j as %d', (saved, expected) => {
    expect(readBankroll(new MemoryStorage(saved))).toBe(expected);
  });

  it.each([
    ['no value', undefined],
    ['an empty string', ''],
    ['a leading space', ' 100'],
    ['exponent notation', '1e3'],
    ['letters', 'abc'],
    ['a negative number', '-5'],
    ['a decimal', '10.5'],
    ['a trailing space', '100 '],
    ['a plus sign', '+5'],
    ['digits past Number.MAX_SAFE_INTEGER', '9'.repeat(400)],
  ])('falls back to 1,000 for %s', (_name, saved) => {
    expect(readBankroll(new MemoryStorage(saved))).toBe(STARTING_BANKROLL);
  });

  it('falls back to 1,000 when getItem throws or there is no storage at all', () => {
    expect(readBankroll(blocked)).toBe(STARTING_BANKROLL);
    expect(readBankroll(null)).toBe(STARTING_BANKROLL);
  });
});

describe('writeBankroll (U7)', () => {
  it('writes the bankroll as a digit string under blackjack.bankroll', () => {
    const storage = new MemoryStorage();
    writeBankroll(storage, 1250);
    expect(BANKROLL_KEY).toBe('blackjack.bankroll');
    expect(storage.getItem('blackjack.bankroll')).toBe('1250');
  });

  it('skips the write without throwing when setItem throws or there is no storage', () => {
    expect(() => writeBankroll(blocked, 900)).not.toThrow();
    expect(() => writeBankroll(null, 900)).not.toThrow();
  });
});

describe('createApp saves the bankroll after every state change (U7, G15)', () => {
  it('starts from the saved bankroll and writes it back', () => {
    const storage = new MemoryStorage('1500');
    expect(createApp(storage).view().state.bankroll).toBe(1500);
    expect(storage.writes).toEqual(['1500']);
  });

  it('replaces an invalid saved value with 1,000', () => {
    const storage = new MemoryStorage('1e3');
    expect(createApp(storage).view().state.bankroll).toBe(STARTING_BANKROLL);
    expect(storage.getItem(BANKROLL_KEY)).toBe('1000');
  });

  it('writes the current bankroll after the deal, each action and the next hand (§4.6 S12)', () => {
    const storage = new MemoryStorage();
    const app = createApp(storage, stackedShoe(['8', '6', '8', '10', '3', 'K', '10', '4']));
    const saved = () => storage.getItem(BANKROLL_KEY);

    app.addChip(100);
    expect(app.view().bet).toBe(100);
    app.deal();
    expect(saved()).toBe('900'); // G12/G15: the bet is gone from the saved bankroll as soon as it is dealt
    app.act('split');
    expect(saved()).toBe('800');
    app.act('double');
    expect(saved()).toBe('700');
    app.act('stand');
    expect(app.view().state.phase).toBe('settled');
    expect(saved()).toBe('1100');
    app.nextHand();
    expect(app.view().state.phase).toBe('betting');
    expect(saved()).toBe('1100');
    expect(storage.writes).toEqual(['1000', '1000', '900', '800', '700', '1100', '1100']);
  });

  it('writes 1,000 after a bankroll reset (G14)', () => {
    const storage = new MemoryStorage('5');
    const app = createApp(storage);
    expect(app.view().canReset).toBe(true);
    app.resetBankroll();
    expect(app.view().state.bankroll).toBe(STARTING_BANKROLL);
    expect(storage.getItem(BANKROLL_KEY)).toBe('1000');
    expect(app.view().canReset).toBe(false);
  });

  it('keeps playing when the storage throws on every call', () => {
    const app = createApp(blocked, stackedShoe(['10', '9', '7', '8']));
    app.addChip(100);
    expect(() => app.deal()).not.toThrow();
    expect(app.view().state.phase).toBe('playerTurn');
    expect(app.view().state.bankroll).toBe(900);
  });
});
