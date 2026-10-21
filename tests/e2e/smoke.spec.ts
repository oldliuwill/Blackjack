// Smoke tests for the playable page (TASK-004 A4-2 to A4-6; SPEC-001 §3.8 U1–U8). They run against the
// production build under the Pages sub-path. Expected amounts follow G12, G26–G29 for the fixed card orders.
import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

type Action = 'hit' | 'stand' | 'double' | 'split';
const LABELS: Readonly<Record<Action, string>> = { hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split' };
const KEYS: Readonly<Record<Action, string>> = { hit: 'h', stand: 's', double: 'd', split: 'p' };
const ACTION_NAMES = Object.values(LABELS);
const CHIP_NAMES = ['Add 10', 'Add 50', 'Add 100', 'Add 500'];

// U8: decorative images come from TASK-005 and may be missing; the table falls back to plain colors.
const DECORATIONS = ['felt.png', 'card-back.png', 'logo.png'];

/**
 * Fixes the deal order (A4-2): replaces crypto.getRandomValues, the engine's only randomness, with values that
 * make Shoe.create's Fisher–Yates (G2) put `top` on top of the shoe, in order. The product has no such hook.
 */
async function stackShoe(page: Page, top: readonly string[]): Promise<void> {
  await page.addInitScript((ranks: readonly string[]) => {
    // G2's starting order: 6 decks × 4 suits of A, 2…10, J, Q, K. Suits do not matter here.
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const COPIES = 24;
    const deck = Array.from({ length: COPIES }, () => RANKS).flat();
    const needed = new Map<string, number>();
    for (const rank of ranks) needed.set(rank, (needed.get(rank) ?? 0) + 1);
    const left = new Map(RANKS.map((rank) => [rank, COPIES]));

    // G2 swaps slot i with j = floor(random × (i + 1)) for i = n − 1 … 1, and slot i is final after its step.
    // Slots past the wanted ones take a card the top does not need; the last steps lay out `ranks`.
    const words: number[] = [];
    for (let i = deck.length - 1; i > 0; i -= 1) {
      let j = i;
      if (i < ranks.length) {
        j = deck.lastIndexOf(ranks[i], i);
      } else {
        while ((left.get(deck[j]) ?? 0) <= (needed.get(deck[j]) ?? 0)) j -= 1;
      }
      [deck[i], deck[j]] = [deck[j], deck[i]];
      left.set(deck[i], (left.get(deck[i]) ?? 0) - 1);
      // The middle of j's interval, as the uint32 cryptoRandom divides by 2^32.
      words.push(Math.floor(((j + 0.5) / (i + 1)) * 2 ** 32));
    }

    let next = 0;
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = <T extends Exclude<BufferSource, ArrayBuffer>>(array: T): T => {
      if (!(array instanceof Uint32Array) || next + array.length > words.length) return original(array);
      for (let index = 0; index < array.length; index += 1) {
        array[index] = words[next];
        next += 1;
      }
      return array;
    };
  }, top);
}

/** Starts the page with this saved bankroll (U7); set before the app reads it. */
async function saveBankroll(page: Page, value: string): Promise<void> {
  await page.addInitScript((saved: string) => localStorage.setItem('blackjack.bankroll', saved), value);
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const bankroll = (page: Page) => page.getByTestId('bankroll');
const status = (page: Page) => page.locator('[aria-live]');
const hand = (page: Page, name: string) => page.getByRole('group', { name, exact: true });
const handTotal = (page: Page, name: string) => hand(page, name).locator('.hand__total');
const dealerTotal = (page: Page) => page.getByRole('region', { name: 'Dealer' }).locator('.seat__total');

/** Bankroll text such as "1,300" as a number. */
async function bankrollValue(page: Page): Promise<number> {
  return Number((await bankroll(page).innerText()).replaceAll(',', ''));
}

async function betAndDeal(page: Page, chips: readonly string[]): Promise<void> {
  for (const chip of chips) await button(page, chip).click();
  await button(page, 'Deal').click();
}

/** Everything a player can read on the table, to compare two ways of playing the same round. */
async function snapshot(page: Page): Promise<string> {
  return `${await bankroll(page).innerText()}\n${await page.locator('main').innerText()}`;
}

test('page loads under the Pages sub-path and every request succeeds', async ({ page, baseURL }) => {
  const root = String(baseURL);
  const problems: string[] = [];
  page.on('request', (request) => {
    // vite preview falls back to index.html, so a wrong `base` would still render; catch it by URL.
    if (/^https?:/.test(request.url()) && !request.url().startsWith(root)) {
      problems.push(`outside ${root}: ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const decoration = DECORATIONS.some((name) => response.url() === `${root}assets/${name}`);
    if (response.status() === 404 && decoration) return; // U8: not added yet is allowed
    problems.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => problems.push(`failed ${request.url()}`));
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));

  // './' resolves against baseURL (/Blackjack/); '/' would leave the sub-path.
  await page.goto('./');
  await expect(page).toHaveTitle('Blackjack');
  await expect(page.getByRole('heading', { name: 'Blackjack' })).toBeVisible();
  await expect(button(page, 'Deal')).toBeVisible();
  expect(problems).toEqual([]);
});

test('A4-2: bet 100 with a chip, deal, hit, stand; the bankroll moves by the net shown', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Player 10, 2 against a 9 up; hit 6 makes 18; the dealer's 9, 7 draws 10 and busts (G26, G27): win, net +100.
  await stackShoe(page, ['10', '9', '2', '7', '6', '10']);
  await page.goto('./');
  await expect(bankroll(page)).toHaveText('1,000');
  const before = await bankrollValue(page);

  await button(page, 'Add 100').click();
  await expect(page.getByText('Bet 100')).toBeVisible();
  await button(page, 'Deal').click();
  await expect(bankroll(page)).toHaveText('900');
  await expect(handTotal(page, 'Your hand')).toHaveText('12');

  await button(page, 'Hit').click();
  await expect(handTotal(page, 'Your hand')).toHaveText('18');
  await button(page, 'Stand').click();

  await expect(status(page)).toHaveText('You win. Net +100');
  await expect(hand(page, 'Your hand')).toContainText('Win');
  await expect(dealerTotal(page)).toHaveText('26');
  await expect(bankroll(page)).toHaveText('1,100');
  const shown = (await status(page).innerText()).replace(/^.*Net /, '');
  const net = Number(shown.replace('−', '-').replaceAll(',', ''));
  expect((await bankrollValue(page)) - before).toBe(net);
  await expect(button(page, 'Next hand')).toBeVisible();
  expect(errors).toEqual([]);
});

// Pair of 8s against a 6: split, double hand 1 to 21, hit hand 2 to 12, stand; the dealer's 6, 10 draws 9 and
// busts. Both hands win: returns 400 + 200 on a total bet of 300, net +300, bankroll 1,300 (G24, G25, G27–G29).
const SPLIT_ROUND = ['8', '6', '8', '10', '3', 'K', '2', '2', '9'];
const SPLIT_STEPS: readonly { action: Action; check: (page: Page) => Promise<void> }[] = [
  { action: 'split', check: (page) => expect(bankroll(page)).toHaveText('800') },
  { action: 'double', check: (page) => expect(bankroll(page)).toHaveText('700') },
  { action: 'hit', check: (page) => expect(handTotal(page, 'Hand 2')).toHaveText('12') },
  { action: 'stand', check: (page) => expect(bankroll(page)).toHaveText('1,300') },
];

/** Plays SPLIT_ROUND in a fresh context (its own localStorage) and returns the table after each step. */
async function playSplitRound(
  browser: Browser,
  baseURL: string | undefined,
  press: (page: Page, action: Action) => Promise<void>,
): Promise<string[]> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await stackShoe(page, SPLIT_ROUND);
  await page.goto('./');
  await betAndDeal(page, ['Add 100']);
  await expect(bankroll(page)).toHaveText('900');
  const seen = [await snapshot(page)];
  for (const step of SPLIT_STEPS) {
    await press(page, step.action);
    await step.check(page);
    seen.push(await snapshot(page));
  }
  await context.close();
  return seen;
}

test('A4-3: keys H, S, D, P have the same effect as the buttons', async ({ browser, baseURL }) => {
  const clicked = await playSplitRound(browser, baseURL, (page, action) => button(page, LABELS[action]).click());
  const typed = await playSplitRound(browser, baseURL, (page, action) => page.keyboard.press(KEYS[action]));
  expect(typed).toEqual(clicked);
  expect(clicked.at(-1)).toContain('You win. Net +300');
});

test('A4-3: a key for an unavailable action does nothing', async ({ page }) => {
  await stackShoe(page, SPLIT_ROUND);
  await page.goto('./');

  // Betting: no action is available, so no key deals or changes anything.
  const betting = await snapshot(page);
  for (const key of Object.values(KEYS)) await page.keyboard.press(key);
  expect(await snapshot(page)).toBe(betting);

  await betAndDeal(page, ['Add 100']);
  await page.keyboard.press('h');
  await expect(handTotal(page, 'Your hand')).toHaveText('19'); // 8, 8, 3
  // Three cards: double and split are gone (G24, G25).
  await expect(button(page, 'Double')).toBeDisabled();
  await expect(button(page, 'Split')).toBeDisabled();
  const threeCards = await snapshot(page);
  await page.keyboard.press('d');
  await page.keyboard.press('p');
  expect(await snapshot(page)).toBe(threeCards);
  await expect(bankroll(page)).toHaveText('900');

  // Settled: the dealer's 6, 10 draws K and busts; keys do nothing more.
  await page.keyboard.press('s');
  await expect(status(page)).toHaveText('You win. Net +100');
  const settled = await snapshot(page);
  for (const key of Object.values(KEYS)) await page.keyboard.press(key);
  expect(await snapshot(page)).toBe(settled);
});

test('A4-3: D and P do nothing when the bankroll cannot cover them (G13)', async ({ page }) => {
  await saveBankroll(page, '150');
  await stackShoe(page, ['8', '9', '8', '7']);
  await page.goto('./');
  await betAndDeal(page, ['Add 100']);
  await expect(bankroll(page)).toHaveText('50');
  await expect(button(page, 'Double')).toBeDisabled();
  await expect(button(page, 'Split')).toBeDisabled();
  const dealt = await snapshot(page);
  await page.keyboard.press('d');
  await page.keyboard.press('p');
  expect(await snapshot(page)).toBe(dealt);
  await expect(button(page, 'Hit')).toBeEnabled();
});

test('U3: chips that would pass 500 or the bankroll are disabled', async ({ page }) => {
  await saveBankroll(page, '120');
  await page.goto('./');
  await expect(button(page, 'Add 500')).toBeDisabled();
  await button(page, 'Add 100').click();
  await expect(button(page, 'Add 10')).toBeEnabled();
  await expect(button(page, 'Add 50')).toBeDisabled();
  await expect(button(page, 'Add 100')).toBeDisabled();
  await button(page, 'Clear').click();
  await expect(page.getByText('Bet 0')).toBeVisible();
  await expect(button(page, 'Add 100')).toBeEnabled();
});

test.describe('A4-4: phone portrait, 360 × 740', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  /** Each control lies fully inside the viewport and takes a click if enabled; the page has no sideways scroll. */
  async function expectControlsFit(page: Page, names: readonly string[]): Promise<void> {
    for (const name of names) {
      const control = button(page, name);
      await expect(control).toBeInViewport({ ratio: 1 });
      if (await control.isEnabled()) await control.click({ trial: true });
    }
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sideways).toBe(0);
  }

  test('every control is visible and clickable in each phase', async ({ page }) => {
    await stackShoe(page, SPLIT_ROUND);
    await page.goto('./');
    await expectControlsFit(page, [...CHIP_NAMES, 'Clear', 'Deal']);
    await button(page, 'Add 100').click();
    await expectControlsFit(page, [...CHIP_NAMES, 'Clear', 'Deal']);

    await button(page, 'Deal').click();
    await expectControlsFit(page, ACTION_NAMES);
    await button(page, 'Split').click();
    await expect(hand(page, 'Hand 2')).toBeInViewport();
    await expectControlsFit(page, ACTION_NAMES);
    await button(page, 'Double').click();
    await button(page, 'Hit').click();
    await button(page, 'Stand').click();
    await expect(status(page)).toHaveText('You win. Net +300');
    await expect(status(page)).toBeInViewport();
    await expectControlsFit(page, ['Next hand']);
  });

  test('Reset bankroll fits too', async ({ page }) => {
    await saveBankroll(page, '5');
    await page.goto('./');
    await expectControlsFit(page, [...CHIP_NAMES, 'Clear', 'Deal', 'Reset bankroll']);
  });
});

test('A4-5: reloading during the player turn keeps the reduced bankroll and drops the round (G15)', async ({ page }) => {
  // 10, 7 against a 9 up: no blackjack on either side, so the round waits for the player.
  await stackShoe(page, ['10', '9', '7', '8']);
  await page.goto('./');
  await betAndDeal(page, ['Add 100']);
  await expect(button(page, 'Hit')).toBeEnabled();
  await expect(bankroll(page)).toHaveText('900');
  expect(await page.evaluate(() => localStorage.getItem('blackjack.bankroll'))).toBe('900');

  await page.reload();
  await expect(bankroll(page)).toHaveText('900');
  await expect(button(page, 'Deal')).toBeVisible();
  await expect(button(page, 'Hit')).toBeHidden();
  await expect(page.locator('main').getByRole('img')).toHaveCount(0);
  await expect(status(page)).toHaveText('Place your bet, then deal.');
});

test.describe('A4-6: Reset bankroll (U5, G14)', () => {
  test('is absent while the bankroll covers the minimum bet', async ({ page }) => {
    await page.goto('./');
    await expect(bankroll(page)).toHaveText('1,000');
    await expect(button(page, 'Reset bankroll')).toBeHidden();
  });

  test('appears in betting under 10 and restores 1,000', async ({ page }) => {
    await saveBankroll(page, '5');
    await page.goto('./');
    await expect(bankroll(page)).toHaveText('5');
    for (const chip of CHIP_NAMES) await expect(button(page, chip)).toBeDisabled();
    await button(page, 'Reset bankroll').click();
    await expect(bankroll(page)).toHaveText('1,000');
    await expect(button(page, 'Reset bankroll')).toBeHidden();
    await expect(button(page, 'Add 500')).toBeEnabled();
  });

  test('stays away after going all in, in the player turn and on the result', async ({ page }) => {
    await saveBankroll(page, '10');
    // 10, 6 against a 10 up with 8 in the hole: the peek finds no blackjack (G16); standing on 16 loses to 18.
    await stackShoe(page, ['10', '10', '6', '8']);
    await page.goto('./');
    await expect(button(page, 'Reset bankroll')).toBeHidden();
    await betAndDeal(page, ['Add 10']);
    await expect(bankroll(page)).toHaveText('0');
    await expect(button(page, 'Stand')).toBeEnabled();
    await expect(button(page, 'Reset bankroll')).toBeHidden();

    await button(page, 'Stand').click();
    await expect(status(page)).toHaveText('You lose. Net −10');
    await expect(bankroll(page)).toHaveText('0');
    await expect(button(page, 'Reset bankroll')).toBeHidden();

    await button(page, 'Next hand').click();
    await button(page, 'Reset bankroll').click();
    await expect(bankroll(page)).toHaveText('1,000');
  });
});
