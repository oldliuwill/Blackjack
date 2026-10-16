// Rule violations raised by the engine (SPEC-001 §4.5).

export type RuleErrorCode =
  | 'WRONG_PHASE' | 'ILLEGAL_ACTION' | 'INVALID_BET'
  | 'INSUFFICIENT_FUNDS' | 'INVALID_BANKROLL' | 'SHOE_EMPTY';

export class RuleError extends Error {
  readonly code: RuleErrorCode;

  constructor(code: RuleErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RuleError';
    this.code = code;
  }
}
