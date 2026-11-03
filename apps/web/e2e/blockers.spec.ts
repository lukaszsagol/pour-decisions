import { expect, test } from '@playwright/test';
import bar2 from '../../../levels/amsterdam/2.json' with { type: 'json' };
import { open, shot } from './helpers';

test('draws the Amsterdam blocker skins', async ({ page }) => {
  await open(page, '#/fixture/amsterdam-64');
  await shot(page, 'T11-amsterdam-level-64');
  await open(page, '#/fixture/amsterdam-skins');
  await expect(page.getByRole('button', { name: /chained shut until the cherry brandy is complete/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /only takes advocaat/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /hidden/ })).toHaveCount(1);
  await shot(page, 'T11-amsterdam-skins');
});

test('the locked glass opens when its drink is completed (level 21)', async ({ page }) => {
  const level = bar2.levels[0]!;
  expect(level.number).toBe(21);
  await open(page, '#/level/21');
  await expect(page.getByRole('button', { name: /chained shut/ })).toHaveCount(1);
  for (const [from, to] of level.solution) {
    await page.locator(`.lv-glass[data-index="${from}"]`).click();
    await page.locator(`.lv-glass[data-index="${to}"]`).click();
  }
  await expect(page.getByRole('button', { name: /chained shut/ })).toHaveCount(0);
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
});
