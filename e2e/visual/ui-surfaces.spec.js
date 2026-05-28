const { test, expect } = require('@playwright/test');

test('start screen visual baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.start')).toHaveScreenshot('start-screen.png');
});

test('loading screen visual baseline', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__OPEN_TRISTAM_TEST_PROGRESS__ = { loaded: 25, total: 100, text: 'Loading assets' };
  });
  await expect(page.locator('.loading')).toHaveScreenshot('loading-screen.png');
});
