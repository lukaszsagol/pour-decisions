import { expect, test } from '@playwright/test';
import bar1 from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open, shot } from './helpers';

test('finishing a bar shows the complete screen with a recipe card, and no Share button', async ({ page }) => {
  const level = bar1.levels[19]!;
  await open(page, `#/level/${level.number}`);
  for (const [from, to] of level.solution) {
    await page.locator(`.lv-glass[data-index="${from}"]`).click();
    await page.locator(`.lv-glass[data-index="${to}"]`).click();
  }
  await page.getByRole('link', { name: 'Collect rewards' }).click();
  await page.locator('.complete-screen[data-ready="true"]').waitFor();
  await expect(page.getByText(`Level ${level.number} cleared`)).toBeVisible();
  await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
  await expect(page.getByText('Win streak')).toBeVisible();
  await expect(page.getByText('Bar boosters')).toBeVisible();
  await expect(page.getByRole('article', { name: 'New recipe card: Kopstootje' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await shot(page, 'T12-amsterdam-complete');
  // Sharing is off until a better way to share is decided.
  await expect(page.getByRole('button', { name: 'Share result' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Next level' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('heading', { name: `Level ${level.number + 1}` })).toBeVisible();
});
