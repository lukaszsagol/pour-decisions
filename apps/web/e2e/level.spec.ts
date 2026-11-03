import { expect, test } from '@playwright/test';
import { open, shot } from './helpers';

test('renders the Amsterdam level screen like the design', async ({ page }) => {
  await open(page, '#/fixture/amsterdam-64');
  await expect(page.getByText('Café de Gracht')).toBeVisible();
  await expect(page.getByText('Amsterdam · Level 64')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Glass \d/ })).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Undo, 4 left' })).toBeVisible();
  await shot(page, 'T08-amsterdam-level-64');
});

test('a new player starts on Amsterdam level 1', async ({ page }) => {
  await open(page, '');
  await expect(page.getByText('Amsterdam · Level 1')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Glass \d/ })).toHaveCount(3);
  await shot(page, 'T08-amsterdam-level-1');
});

test('fits a 360 px wide phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await open(page, '');
  const box = await page.locator('.stage').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(360);
  expect(box!.height).toBeLessThanOrEqual(740);
  expect(box!.x).toBeGreaterThanOrEqual(0);
});
