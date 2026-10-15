import { expect, test } from '@playwright/test';

// Page-load smoke test; TASK-004 adds the deal / hit / stand / settle flow.
test('page loads with the Blackjack title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Blackjack');
  await expect(page.getByRole('heading', { name: 'Blackjack' })).toBeVisible();
});
