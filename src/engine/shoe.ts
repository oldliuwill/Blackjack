// The shoe and the default random source (SPEC-001 §3.1 G1–G2, §4.2).
import { RuleError } from './errors.ts';
import { DECKS } from './rules.ts';
import type { Card, RandomSource, Rank, Suit } from './types.ts';

// G2's starting order within each deck: suits S, H, D, C; ranks A, 2…10, J, Q, K.
const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const UINT32_RANGE = 2 ** 32;

/** [0, 1) from crypto.getRandomValues: a uint32 divided by 2^32, so the largest value is 1 − 2^−32. */
export const cryptoRandom: RandomSource = () => {
  const word = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  return word / UINT32_RANGE;
};

export class Shoe {
  readonly #cards: readonly Card[];
  #next = 0;

  private constructor(cards: readonly Card[]) {
    this.#cards = cards;
  }

  /** 312 張，依 G2 用 random 洗好。random 預設為 cryptoRandom。 */
  static create(random: RandomSource = cryptoRandom): Shoe {
    const cards: Card[] = [];
    for (let deck = 0; deck < DECKS; deck += 1) {
      for (const suit of SUITS) {
        for (const rank of RANKS) cards.push({ rank, suit });
      }
    }
    // G2: Fisher–Yates, i from n − 1 down to 1.
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return new Shoe(cards);
  }

  /** 依陣列順序抽牌（cards[0] 最先抽出）。會複製輸入，張數與內容不限，供測試排定牌序。 */
  static fromCards(cards: readonly Card[]): Shoe {
    return new Shoe(cards.map(({ rank, suit }) => ({ rank, suit })));
  }

  get remaining(): number {
    return this.#cards.length - this.#next;
  }

  /** 從頂端抽一張；牌靴已空時丟 RuleError('SHOE_EMPTY')。 */
  draw(): Card {
    if (this.remaining === 0) throw new RuleError('SHOE_EMPTY', 'The shoe is empty.');
    const card = this.#cards[this.#next];
    this.#next += 1;
    return card;
  }
}
