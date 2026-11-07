import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dismissRules, open } from './helpers';

/**
 * Play Store phone screenshots, 1080×1920 (9:16), to docs/design/store/screenshots/.
 * Only runs on demand: STORE=1 npx playwright test e2e/store-screenshots.spec.ts (in apps/web).
 */

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/design/store/screenshots');

test.describe('store screenshots', () => {
  test.skip(!process.env.STORE, 'Set STORE=1 to take the Play Store screenshots');
  test.use({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });

  const shot = async (page: Page, name: string) => {
    fs.mkdirSync(out, { recursive: true });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
  };

  async function seed(page: Page, current: number, stars = 3): Promise<void> {
    const levels: Record<string, { stars: number; bestMoves: number }> = {};
    for (let n = 1; n < current; n++) levels[n] = { stars, bestMoves: 20 };
    await page.addInitScript((save) => localStorage.setItem('pour-decisions:save', JSON.stringify(save)), {
      version: 2,
      levels,
      stock: { undo: 5, extraGlass: 2, hint: 3 },
      streak: 4,
      current,
      settings: { muted: true },
      daily: {},
      training: { rating: 2, sessions: [] },
    });
  }

  async function win(page: Page, city: string, bar: number, index: number): Promise<void> {
    const pack = JSON.parse(fs.readFileSync(`../../levels/${city}/${bar}.json`, 'utf8'));
    const lv = pack.levels[index];
    await seed(page, lv.number);
    await open(page, `#/level/${lv.number}`);
    await dismissRules(page);
    for (const [from, to] of lv.solution) {
      await page.locator(`.lv-glass[data-index="${from}"]`).click();
      await page.locator(`.lv-glass[data-index="${to}"]`).click();
    }
    await expect(page.getByRole('dialog')).toBeVisible();
  }

  test('1 first level with the bartender', async ({ page }) => {
    await open(page, '#/level/1');
    await shot(page, '1-first-level');
  });

  test('2 london level', async ({ page }) => {
    await open(page, '#/fixture/london-151');
    await shot(page, '2-london-level');
  });

  test('3 new york win', async ({ page }) => {
    await win(page, 'newyork', 1, 0);
    await shot(page, '3-new-york-win');
  });

  test('4 recipe card', async ({ page }) => {
    await win(page, 'tokyo', 3, 19);
    await page.getByRole('link', { name: 'Collect rewards' }).click();
    await page.locator('.complete-screen[data-ready="true"]').waitFor();
    await shot(page, '4-recipe-card');
  });

  test('5 amsterdam map', async ({ page }) => {
    await seed(page, 100);
    await open(page, '#/map/amsterdam');
    await page.locator('.map-scroll').evaluate((e) => (e.scrollTop = 0));
    await shot(page, '5-amsterdam-map');
  });

  test('6 tokyo level', async ({ page }) => {
    await open(page, '#/fixture/tokyo-327');
    await shot(page, '6-tokyo-level');
  });

  test('7 tokyo map', async ({ page }) => {
    await seed(page, 400);
    await open(page, '#/map/tokyo');
    await page.locator('.map-scroll').evaluate((e) => (e.scrollTop = 0));
    await shot(page, '7-tokyo-map');
  });

  test('8 passport', async ({ page }) => {
    await seed(page, 330);
    await open(page, '#/passport');
    await shot(page, '8-passport');
  });
});
