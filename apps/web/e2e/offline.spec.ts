import { expect, test } from '@playwright/test';

test('the installed build works offline', async ({ page, context }) => {
  await page.goto('http://localhost:4318/');
  await page.locator('.screen[data-ready="true"]').waitFor();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.locator('.screen[data-ready="true"]').waitFor();
  await context.setOffline(true);
  await page.goto('http://localhost:4318/#/level/1');
  await page.reload();
  await page.locator('.level-screen[data-ready="true"]').waitFor();
  await expect(page.getByText('Amsterdam · Level 1')).toBeVisible();
});
