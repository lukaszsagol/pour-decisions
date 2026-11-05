import { expect, test, type Page } from '@playwright/test';
import bar1 from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open, shot } from './helpers';

async function seed(page: Page, current: number): Promise<void> {
  const levels: Record<string, { stars: number; bestMoves: number }> = {};
  for (let n = 1; n < current; n++) levels[n] = { stars: n % 7 === 0 ? 2 : 3, bestMoves: 20 };
  await page.addInitScript((save) => localStorage.setItem('pour-decisions:save', JSON.stringify(save)), {
    version: 1,
    levels,
    coins: 2340,
    stock: { undo: 5, extraGlass: 2, hint: 3 },
    streak: 0,
    current,
    settings: { muted: false },
  });
}

test('a new player sees Amsterdam as the current city and the rest locked', async ({ page }) => {
  await open(page, '');
  await expect(page.getByRole('heading', { name: 'Your passport' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Now visiting Amsterdam' })).toBeVisible();
  await expect(page.getByLabel('Locked')).toHaveCount(3);
  await expect(page.getByText('1 of 20 bars visited · 0 stars')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Passport' })).toHaveAttribute('aria-current', 'page');
  await shot(page, 'T14-passport-new-player');
});

test('a late-game player sees finished cities stamped, like the design', async ({ page }) => {
  await seed(page, 327);
  await open(page, '');
  await expect(page.getByRole('region', { name: 'Now visiting Tokyo' })).toBeVisible();
  await expect(page.getByLabel(/^Stamped/)).toHaveCount(3);
  await expect(page.getByText('Level 327 · 26 of 100')).toBeVisible();
  await shot(page, 'T14-passport-tokyo');
});

test('navigates Passport → Map → Level → Complete → Map, with tabs', async ({ page }) => {
  await open(page, '');
  await page.getByRole('link', { name: 'Continue' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page');
  await shot(page, 'T14-map-with-tabs');
  await page.getByRole('link', { name: 'Play level 1' }).click();
  await page.locator('.level-screen[data-ready="true"]').waitFor();
  await expect(page.locator('.tabbar')).toHaveCount(0);
  for (const [from, to] of bar1.levels[0]!.solution) {
    await page.locator(`.lv-glass[data-index="${from}"]`).click();
    await page.locator(`.lv-glass[data-index="${to}"]`).click();
  }
  await page.getByRole('link', { name: 'Collect rewards' }).click();
  await page.getByRole('link', { name: 'Next level' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('button', { name: 'Level 1, 3 stars' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to passport' }).click();
  await expect(page.getByRole('heading', { name: 'Your passport' })).toBeVisible();
  await page.getByRole('link', { name: 'Recipes' }).click();
  await expect(page.getByRole('heading', { name: 'Cocktail book' })).toBeVisible();
  await expect(page.getByText('Finish a bar to add its drink to your book.')).toBeVisible();
});

test('the level back button returns to its city map', async ({ page }) => {
  await open(page, '#/level/3');
  await page.getByRole('link', { name: 'Back to map' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('heading', { name: 'Amsterdam' })).toBeVisible();
});
