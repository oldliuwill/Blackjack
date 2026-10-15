import { expect, test } from '@playwright/test';

// Page-load smoke test under the Pages sub-path; TASK-004 adds the deal / hit / stand / settle flow.
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
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => problems.push(`failed ${request.url()}`));

  // './' resolves against baseURL (/Blackjack/); '/' would leave the sub-path.
  await page.goto('./');
  await expect(page).toHaveTitle('Blackjack');
  await expect(page.getByRole('heading', { name: 'Blackjack' })).toBeVisible();
  expect(problems).toEqual([]);
});
