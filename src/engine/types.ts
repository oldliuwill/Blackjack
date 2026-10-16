// Public engine types (SPEC-001 §4.1). Includes the game types TASK-003 needs, so that card does not touch this file.

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export interface Card { readonly rank: Rank; readonly suit: Suit; }

/** 回傳 [0, 1) 的亂數。 */
export type RandomSource = () => number;

export type Action = 'hit' | 'stand' | 'double' | 'split';
export type Phase = 'betting' | 'playerTurn' | 'settled';
export type Outcome = 'blackjack' | 'win' | 'push' | 'lose';

export interface HandValue { readonly total: number; readonly soft: boolean; }

export interface PlayerHand {
  readonly cards: readonly Card[];
  readonly bet: number;            // 該手注額，含加倍追加的部分
  readonly value: HandValue;       // 一律等於 handValue(cards)
  readonly doubled: boolean;
  readonly fromSplit: boolean;
  readonly splitAces: boolean;     // 由分 A 而來
  readonly done: boolean;          // 已停牌、爆牌、加倍完成、分 A 補牌完成，或已結算
  readonly outcome: Outcome | null;  // settled 之前為 null
  readonly payout: number | null;    // 返還額（含本金），settled 之前為 null
}

export interface DealerView {
  readonly cards: readonly Card[];  // playerTurn 時只有明牌；其餘階段是全部的牌（betting 時為空）
  readonly holeHidden: boolean;     // 只有 playerTurn 時為 true
  readonly value: HandValue;        // 一律等於 handValue(cards)，即只算看得到的牌
}

export interface RoundSummary {
  readonly totalBet: number;
  readonly totalReturn: number;
  readonly net: number;             // totalReturn − totalBet
}

export interface GameState {
  readonly phase: Phase;
  readonly bankroll: number;
  readonly hands: readonly PlayerHand[];  // betting 時為空陣列
  readonly activeHand: number | null;     // playerTurn 時是作用中手的索引，其餘為 null
  readonly dealer: DealerView;
  readonly shoeRemaining: number;
  readonly reshuffled: boolean;           // 本局的 deal() 是否先換了新牌靴；betting 時為 false
  readonly summary: RoundSummary | null;  // 只有 settled 時有值
}
