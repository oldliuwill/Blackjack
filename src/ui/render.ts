// Draws the table (SPEC-001 §3.8 U2, U3, U5, U6, U8). mountTable builds the DOM once; render updates it
// from an AppView and keeps card elements that did not change, so only new cards play the deal animation.
import { isBlackjack } from '../engine/index.ts';
import type { Action, Card, GameState, HandValue, Outcome, PlayerHand, Rank, Suit } from '../engine/index.ts';
import { CHIP_VALUES } from './app.ts';
import type { AppView } from './app.ts';
import { ACTION_KEYS } from './controls.ts';

export interface Table {
  readonly root: HTMLElement;
  readonly bankroll: HTMLElement;
  readonly dealerTotal: HTMLElement;
  readonly dealerCards: HTMLElement;
  readonly hands: HTMLElement;
  readonly status: HTMLElement;
  readonly betPanel: HTMLElement;
  readonly betAmount: HTMLElement;
  readonly chips: readonly { readonly value: number; readonly button: HTMLButtonElement }[];
  readonly clear: HTMLButtonElement;
  readonly deal: HTMLButtonElement;
  readonly reset: HTMLButtonElement;
  readonly actionPanel: HTMLElement;
  readonly actions: ReadonlyMap<Action, HTMLButtonElement>;
  readonly settlePanel: HTMLElement;
  readonly nextHand: HTMLButtonElement;
}

// U8: decorative images from public/assets/ (TASK-005). CSS keeps a solid color under each one, so a missing
// file leaves the table plain but intact. BASE_URL keeps the Pages sub-path.
const ASSETS = `${import.meta.env.BASE_URL}assets/`;

const ACTION_LABELS: Readonly<Record<Action, string>> = { hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split' };
const OUTCOME_LABELS: Readonly<Record<Outcome, string>> = { blackjack: 'Blackjack', win: 'Win', push: 'Push', lose: 'Lose' };
const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_NAMES: Readonly<Record<Suit, string>> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
const RED_SUITS: ReadonlySet<Suit> = new Set(['H', 'D']);
const RANK_NAMES: Readonly<Partial<Record<Rank, string>>> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
const FACE_DOWN = 'face-down';

/** A card slot: a card, or null for the dealer's face-down hole card. */
type Slot = Card | null;

const amount = (value: number): string => value.toLocaleString('en-US');
const signed = (value: number): string => {
  if (value > 0) return `+${amount(value)}`;
  if (value < 0) return `−${amount(-value)}`;
  return '0';
};
const totalText = ({ total, soft }: HandValue): string => (soft ? `Soft ${total}` : String(total));

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, className = 'btn'): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

export function mountTable(root: HTMLElement): Table {
  root.style.setProperty('--felt-image', `url("${ASSETS}felt.png")`);
  root.style.setProperty('--card-back-image', `url("${ASSETS}card-back.png")`);

  const logo = el('img', 'logo');
  logo.alt = '';
  logo.addEventListener('error', () => {
    logo.hidden = true;
  });
  logo.src = `${ASSETS}logo.png`;
  const title = el('h1', 'title');
  title.append(logo, 'Blackjack');
  const bankroll = el('strong', 'bankroll__amount');
  bankroll.dataset.testid = 'bankroll';
  const bankrollLine = el('p', 'bankroll', 'Bankroll ');
  bankrollLine.append(bankroll);
  const header = el('header', 'topbar');
  header.append(title, bankrollLine);

  const dealerTotal = el('span', 'seat__total');
  const dealerLabel = el('p', 'seat__label', 'Dealer ');
  dealerLabel.append(dealerTotal);
  const dealerCards = el('div', 'cards');
  const dealer = el('section', 'seat');
  dealer.setAttribute('aria-label', 'Dealer');
  dealer.append(dealerLabel, dealerCards);
  const status = el('p', 'status');
  status.setAttribute('aria-live', 'polite');
  const hands = el('section', 'hands');
  hands.setAttribute('aria-label', 'Player');
  const felt = el('main', 'felt');
  felt.append(dealer, status, hands);

  const betAmount = el('strong', 'bet__amount');
  const betLine = el('p', 'bet', 'Bet ');
  betLine.append(betAmount);
  const chips = CHIP_VALUES.map((value) => {
    const chip = button(amount(value), 'chip');
    chip.dataset.value = String(value);
    chip.setAttribute('aria-label', `Add ${amount(value)}`);
    return { value, button: chip };
  });
  const chipRow = el('div', 'chips');
  chipRow.append(...chips.map((chip) => chip.button));
  const clear = button('Clear');
  const deal = button('Deal', 'btn btn--primary');
  const betButtons = el('div', 'row');
  betButtons.append(clear, deal);
  const reset = button('Reset bankroll', 'btn btn--primary');
  const betPanel = el('div', 'panel');
  betPanel.append(betLine, chipRow, betButtons, reset);

  const actions = new Map<Action, HTMLButtonElement>();
  const actionPanel = el('div', 'panel panel--actions');
  for (const [action, key] of ACTION_KEYS) {
    const actionButton = button(ACTION_LABELS[action]);
    actionButton.setAttribute('aria-keyshortcuts', key);
    const hint = el('kbd', 'key', key);
    hint.setAttribute('aria-hidden', 'true');
    actionButton.append(hint);
    actions.set(action, actionButton);
    actionPanel.append(actionButton);
  }

  const nextHand = button('Next hand', 'btn btn--primary');
  const settlePanel = el('div', 'panel');
  settlePanel.append(nextHand);
  const controls = el('footer', 'controls');
  controls.append(betPanel, actionPanel, settlePanel);

  root.replaceChildren(header, felt, controls);
  return {
    root, bankroll, dealerTotal, dealerCards, hands, status, betPanel, betAmount, chips, clear, deal, reset,
    actionPanel, actions, settlePanel, nextHand,
  };
}

export function render(table: Table, view: AppView): void {
  const { state } = view;
  const previousPhase = table.root.dataset.phase;
  table.root.dataset.phase = state.phase;

  table.bankroll.textContent = amount(state.bankroll);
  // New cards in this update deal one after another (U2): the order is their animation delay.
  const order = { next: 0 };
  const dealerSlots: Slot[] = state.dealer.holeHidden ? [...state.dealer.cards, null] : [...state.dealer.cards];
  syncCards(table.dealerCards, dealerSlots, order);
  table.dealerTotal.textContent = dealerTotalText(state);
  syncHands(table.hands, state, order);
  table.status.textContent = statusText(view);

  table.betPanel.hidden = state.phase !== 'betting';
  table.betAmount.textContent = amount(view.bet);
  for (const { value, button: chip } of table.chips) {
    chip.disabled = !view.chips.some((entry) => entry.value === value && entry.enabled);
  }
  table.clear.disabled = !view.canClear;
  table.deal.disabled = !view.canDeal;
  table.reset.hidden = !view.canReset;

  table.actionPanel.hidden = state.phase !== 'playerTurn';
  for (const [action, actionButton] of table.actions) actionButton.disabled = !view.actions.includes(action);
  table.settlePanel.hidden = state.phase !== 'settled';

  if (previousPhase !== undefined && previousPhase !== state.phase) moveFocus(table, view);
}

function dealerTotalText({ phase, dealer }: GameState): string {
  if (dealer.cards.length === 0) return '';
  if (phase === 'settled' && isBlackjack(dealer.cards)) return 'Blackjack';
  return totalText(dealer.value);
}

function statusText({ state, canReset }: AppView): string {
  const { phase, hands, activeHand, summary } = state;
  if (phase === 'betting') return canReset ? 'Out of chips. Reset your bankroll to play on.' : 'Place your bet, then deal.';
  if (phase === 'playerTurn') {
    return hands.length > 1 && activeHand !== null ? `Hand ${activeHand + 1} of ${hands.length}: your move.` : 'Your move.';
  }
  if (summary === null) return '';
  return `${resultHeadline(hands, summary.net)} Net ${signed(summary.net)}`;
}

function resultHeadline(hands: readonly PlayerHand[], net: number): string {
  if (hands.some((hand) => hand.outcome === 'blackjack')) return 'Blackjack!';
  if (net > 0) return 'You win.';
  if (net < 0) return 'You lose.';
  return hands.every((hand) => hand.outcome === 'push') ? 'Push.' : 'Break even.';
}

/** One hand element per hand, in order; each keeps its card row so unchanged cards are not redrawn. */
function syncHands(container: HTMLElement, state: GameState, order: { next: number }): void {
  const { hands, activeHand } = state;
  while (container.children.length > hands.length) container.lastElementChild?.remove();
  hands.forEach((hand, index) => {
    let node = container.children[index] as HTMLElement | undefined;
    if (node === undefined) {
      node = el('div', 'hand');
      node.setAttribute('role', 'group');
      node.append(el('div', 'cards'), el('p', 'hand__info'));
      container.append(node);
    }
    const cardRow = node.children[0] as HTMLElement;
    const info = node.children[1] as HTMLElement;
    node.setAttribute('aria-label', hands.length > 1 ? `Hand ${index + 1}` : 'Your hand');
    node.classList.toggle('hand--active', index === activeHand);
    syncCards(cardRow, hand.cards, order);

    const parts = [el('span', 'hand__total', totalText(hand.value)), el('span', 'hand__bet', `Bet ${amount(hand.bet)}`)];
    if (hand.outcome !== null) {
      const outcome = el('span', `hand__outcome hand__outcome--${hand.outcome}`, OUTCOME_LABELS[hand.outcome]);
      parts.push(outcome);
    }
    info.replaceChildren(...parts);
  });
}

/** Keeps the card elements whose slot did not change; a replaced face-down card flips, a new one is dealt. */
function syncCards(row: HTMLElement, slots: readonly Slot[], order: { next: number }): void {
  slots.forEach((slot, index) => {
    const current = row.children[index] as HTMLElement | undefined;
    const key = slotKey(slot);
    if (current?.dataset.key === key) return;
    const node = cardElement(slot);
    node.style.setProperty('--deal-order', String(order.next));
    order.next += 1;
    if (current === undefined) {
      row.append(node);
      return;
    }
    if (current.dataset.key === FACE_DOWN) node.classList.add('card--flip');
    current.replaceWith(node);
  });
  while (row.children.length > slots.length) row.lastElementChild?.remove();
}

const slotKey = (slot: Slot): string => (slot === null ? FACE_DOWN : `${slot.rank}${slot.suit}`);

function cardElement(slot: Slot): HTMLElement {
  const node = el('div', 'card');
  node.dataset.key = slotKey(slot);
  node.setAttribute('role', 'img');
  const face = el('div', 'card__face');
  node.append(face);
  if (slot === null) {
    node.classList.add('card--back');
    node.setAttribute('aria-label', 'Face-down card');
    return node;
  }
  const symbol = SUIT_SYMBOLS[slot.suit];
  if (RED_SUITS.has(slot.suit)) node.classList.add('card--red');
  node.setAttribute('aria-label', `${RANK_NAMES[slot.rank] ?? slot.rank} of ${SUIT_NAMES[slot.suit]}`);
  const corner = el('span', 'card__corner');
  corner.append(el('span', 'card__rank', slot.rank), el('span', 'card__suit', symbol));
  face.append(corner, el('span', 'card__pip', symbol));
  return node;
}

/**
 * A phase change hides the panel that held focus; hand focus to the new panel's main button so keyboard
 * players can go on without the mouse. Focus elsewhere on the page is left alone.
 */
function moveFocus(table: Table, view: AppView): void {
  const focused = table.root.ownerDocument.activeElement;
  const lost = focused === null || focused === table.root.ownerDocument.body || focused.closest('[hidden]') !== null;
  if (!lost) return;
  const candidates: HTMLButtonElement[] = {
    betting: [table.deal, table.reset, ...table.chips.map((chip) => chip.button)],
    playerTurn: [...table.actions.values()],
    settled: [table.nextHand],
  }[view.state.phase];
  candidates.find((candidate) => !candidate.disabled && !candidate.hidden)?.focus();
}
