import { expect, test, type Page } from '@playwright/test';
import { open, shot } from './helpers';

/** A save like the design's late-game player: levels 1–63 done, current 64. */
async function seedSave(page: Page, current: number, stars: Record<number, number> = {}): Promise<void> {
  const levels: Record<string, { stars: number; bestMoves: number }> = {};
  for (let n = 1; n < current; n++) levels[n] = { stars: stars[n] ?? 3, bestMoves: 20 };
  await page.addInitScript((save) => localStorage.setItem('pour-decisions:save', JSON.stringify(save)), {
    version: 1,
    levels,
    coins: 2340,
    stock: { undo: 5, extraGlass: 2, hint: 3 },
    streak: 2,
    current,
    settings: { muted: false },
  });
}

test('a new player sees Amsterdam level 1 ready to play', async ({ page }) => {
  await open(page, '');
  await expect(page.getByRole('heading', { name: 'Amsterdam' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Level 1, play now' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Level 2,.*locked/ })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('link', { name: 'Play level 1' })).toBeVisible();
  await expect(page.getByText(/20 levels left to/)).toBeVisible();
  await shot(page, 'T13-amsterdam-map-new-player');
});

test('matches the Amsterdam map design for a player on level 64', async ({ page }) => {
  await seedSave(page, 64, { 60: 1, 61: 3, 62: 3, 63: 2 });
  await open(page, '#/map/amsterdam');
  await expect(page.getByRole('button', { name: 'Level 64, play now' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Level 63, 2 stars' })).toBeVisible();
  await expect(page.getByText('Super hard')).toBeVisible();
  await expect(page.getByText('Bar 4 · Café de Gracht').first()).toBeVisible();
  await shot(page, 'T13-amsterdam-map-64');
});

test('selecting a finished level offers a replay, and the map scrolls through all 100 levels', async ({ page }) => {
  await seedSave(page, 64);
  await open(page, '#/map/amsterdam');
  await page.getByRole('button', { name: 'Level 62, 3 stars' }).click();
  await expect(page.getByRole('link', { name: 'Replay level 62' })).toBeVisible();
  await expect(page.locator('.map-node')).toHaveCount(100);
  await expect(page.locator('.map-gate')).toHaveCount(4);
  await page.locator('.map-scroll').evaluate((el) => (el.scrollTop = 0));
  await expect(page.getByRole('button', { name: /^Level 100,/ })).toBeInViewport();
});
