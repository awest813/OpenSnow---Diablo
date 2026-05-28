const { test, expect } = require('@playwright/test');

test('shareware path reaches start controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play Shareware' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select MPQ' })).toBeVisible();
  await expect(page.getByText('Choose how to load data')).toBeVisible();
});

test('save manager and error overlay chrome are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.start')).toBeVisible();
});
