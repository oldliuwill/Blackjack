// Buttons and keyboard shortcuts (SPEC-001 §3.8 U3–U5). Every input goes through App, which ignores
// anything the current state does not offer, so a key for an unavailable action does nothing (U4).
import type { Action } from '../engine/index.ts';
import type { App } from './app.ts';
import type { Table } from './render.ts';

/** U4: the action buttons in availableActions() order and the key for each. */
export const ACTION_KEYS: ReadonlyMap<Action, string> = new Map<Action, string>([
  ['hit', 'H'],
  ['stand', 'S'],
  ['double', 'D'],
  ['split', 'P'],
]);

const KEY_TO_ACTION: ReadonlyMap<string, Action> = new Map<string, Action>(
  [...ACTION_KEYS].map(([action, key]) => [key.toLowerCase(), action] as const),
);

export function bindControls(table: Table, app: App): void {
  for (const { value, button } of table.chips) button.addEventListener('click', () => app.addChip(value));
  table.clear.addEventListener('click', () => app.clearBet());
  table.deal.addEventListener('click', () => app.deal());
  table.reset.addEventListener('click', () => app.resetBankroll());
  table.nextHand.addEventListener('click', () => app.nextHand());
  for (const [action, button] of table.actions) button.addEventListener('click', () => app.act(action));

  table.root.ownerDocument.addEventListener('keydown', (event) => {
    // Leave browser shortcuts such as Ctrl+D alone, and do not repeat an action while a key is held down.
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const action = KEY_TO_ACTION.get(event.key.toLowerCase());
    if (action !== undefined) app.act(action);
  });
}
