import { expect, test, type Page } from '@playwright/test';
import { open, shot } from './helpers';

/** A save part-way through each city, for map screenshots. */
async function seed(page: Page, current: number): Promise<void> {
  const levels: Record<string, { stars: number; bestMoves: number }> = {};
  for (let n = 1; n < current; n++) levels[n] = { stars: (n % 3) + 1, bestMoves: 20 };
  await page.addInitScript((save) => localStorage.setItem('pour-decisions:save', JSON.stringify(save)), {
    version: 2,
    levels,
    stock: { undo: 5, extraGlass: 2, hint: 3 },
    streak: 0,
    current,
    settings: { muted: false },
    daily: {},
    training: { rating: 2, sessions: [] },
  });
}

for (const [city, current] of [
  ['amsterdam', 64],
  ['london', 151],
  ['newyork', 247],
  ['tokyo', 327],
] as const) {
  test(`${city} map shows done coins with stars and the current coin`, async ({ page }) => {
    await seed(page, current);
    await open(page, `#/map/${city}`);
    await expect(page.getByRole('button', { name: `Level ${current}, play now` })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^Level ${current - 1}, .*stars?$`) })).toBeVisible();
    await shot(page, `pixel/T28-${city}-map`);
  });
}
