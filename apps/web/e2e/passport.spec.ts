import { expect, test, type Page } from '@playwright/test';
import bar1 from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open, played, shot, welcomed } from './helpers';

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

test('the first launch welcomes the player and goes straight into level 1', async ({ page }) => {
  await open(page, '');
  await expect(page.getByRole('heading', { name: "Welcome to Café 't Hoekje!" })).toBeVisible();
  await expect(page.getByText(/fewer pours, more stars/)).toBeVisible();
  await shot(page, 'first-night/welcome');
  await page.getByRole('button', { name: 'Pour your first drink' }).click();
  await page.locator('.level-screen[data-ready="true"]').waitFor();
  await expect(page.getByText('Amsterdam · Level 1')).toBeVisible();
  // Seen once: the passport opens from now on.
  await open(page, '#/passport');
  await expect(page.getByRole('heading', { name: 'Your night out' })).toBeVisible();
});

test("a beginner's passport shows the next level, the stops ahead, the cocktails and what opens later", async ({
  page,
}) => {
  await welcomed(page);
  await open(page, '');
  await expect(page.getByRole('heading', { name: 'Your night out' })).toBeVisible();
  await expect(page.getByText('Bar 1 of 20 · your night starts here')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Now visiting Amsterdam' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Play level 1' })).toHaveAttribute('href', '#/level/1');
  await expect(page.getByRole('region', { name: 'Next stops' })).toContainText('London');
  await expect(page.getByRole('region', { name: 'Your cocktail book' })).toContainText('0 of 5');
  await expect(page.getByRole('region', { name: 'Opens later' })).toContainText("Tonight's pour after level 5");
  await expect(page.getByRole('link', { name: /^Training/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Passport' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Daily, opens after level 5' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Daily opens after level 5.' })).toBeVisible();
  await shot(page, 'first-night/passport-beginner');
  await shot(page, 'T14-passport-new-player');
});

test('features open one at a time, each announced once, with NEW on its tab until visited', async ({ page }) => {
  // Level 5 just won by a new player: Tonight's pour opens.
  await page.addInitScript(() => {
    if (localStorage.getItem('pour-decisions:save')) return;
    const levels: Record<string, { stars: number; bestMoves: number }> = {};
    for (let n = 1; n <= 5; n++) levels[n] = { stars: 3, bestMoves: 5 };
    localStorage.setItem(
      'pour-decisions:save',
      JSON.stringify({ version: 2, levels, current: 6, intro: { welcomed: true, announced: [], opened: [] } }),
    );
  });
  await open(page, '#/passport');
  const card = page.getByRole('dialog', { name: "Tonight's pour" });
  await expect(card).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, 'first-night/unlocked');
  await card.getByRole('button', { name: 'Later' }).click();
  await expect(page.getByRole('link', { name: /Daily/ })).toContainText('New');
  await open(page, '#/passport');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: /Daily/ }).click();
  await page.locator('.daily-screen[data-ready="true"]').waitFor();
  await page.getByRole('link', { name: 'Passport', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Daily' })).not.toContainText('New');
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
  await welcomed(page);
  await open(page, '');
  await page.getByRole('link', { name: 'Map', exact: true }).click();
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
  await expect(page.getByRole('heading', { name: 'Your night out' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recipes, opens after the first bar' })).toBeVisible();
});

test('after the first bar, the cocktail book tab opens', async ({ page }) => {
  await played(page, 21);
  await open(page, '');
  await page.getByRole('link', { name: 'Recipes' }).click();
  await expect(page.getByRole('heading', { name: 'Cocktail book' })).toBeVisible();
  await expect(page.getByText('Finish a bar to add its drink to your book.')).toBeVisible();
});

test('the level back button returns to its city map', async ({ page }) => {
  await open(page, '#/level/3');
  await page.getByRole('button', { name: "Let's pour" }).click();
  await page.getByRole('link', { name: 'Back to map' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('heading', { name: 'Amsterdam' })).toBeVisible();
});

test('after a back arrow, the browser back button does not reopen the screen just left', async ({ page }) => {
  await welcomed(page);
  await open(page, '#/passport');
  await page.getByRole('link', { name: 'Map', exact: true }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await page.evaluate(() => (location.hash = '#/level/1'));
  await page.locator('.level-screen[data-ready="true"]').waitFor();
  await page.getByRole('link', { name: 'Back to map' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Your night out' })).toBeVisible();
  await expect(page).toHaveURL(/#\/passport$/);

  // Opened straight on a level, the arrow replaces it with the map: back leaves the game.
  await open(page, '#/level/7');
  await page.getByRole('link', { name: 'Back to map' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await page.goBack();
  await expect(page).not.toHaveURL(/#\/level/);
});
