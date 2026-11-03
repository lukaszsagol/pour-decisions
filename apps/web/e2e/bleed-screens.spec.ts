import { expect, test, type Page } from '@playwright/test';
import type { LevelPack } from '@pour/engine';
import ams from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open, shot } from './helpers';

/**
 * Every kind of screen on phones, a tablet and a laptop, where the stage is
 * smaller than the screen and the art continues into the margins. Saved to
 * agent-logs/assets/pixel/bleed/ for review.
 */

const viewports = [
  { name: 'phone', width: 412, height: 915, deviceScaleFactor: 2.625 },
  { name: 'tall-phone', width: 360, height: 800, deviceScaleFactor: 3 },
  { name: 'tablet', width: 820, height: 1180, deviceScaleFactor: 2 },
  { name: 'laptop', width: 1280, height: 800, deviceScaleFactor: 1 },
] as const;

async function seed(page: Page, current: number): Promise<void> {
  const levels: Record<string, { stars: number; bestMoves: number }> = {};
  for (let n = 1; n < current; n++) levels[n] = { stars: (n % 3) + 1, bestMoves: 20 };
  await page.addInitScript((save) => localStorage.setItem('pour-decisions:save', JSON.stringify(save)), {
    version: 2,
    levels,
    stock: { undo: 5, extraGlass: 2, hint: 3 },
    streak: 2,
    current,
    settings: { muted: false },
    daily: {},
    training: { rating: 2, sessions: [] },
  });
}

for (const vp of viewports) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
    const dir = `pixel/bleed/${vp.name}`;

    test('levels', async ({ page }) => {
      for (const fixture of ['amsterdam-64', 'london-151', 'newyork-247', 'tokyo-327']) {
        await open(page, `#/fixture/${fixture}`);
        await shot(page, `${dir}/level-${fixture.split('-')[0]}`);
      }
      await open(page, '#/fixture/dead-end');
      await shot(page, `${dir}/dead-end`);
    });

    test('maps', async ({ page }) => {
      await seed(page, 108);
      for (const city of ['amsterdam', 'london', 'newyork', 'tokyo']) {
        await open(page, `#/map/${city}`);
        await shot(page, `${dir}/map-${city}`);
      }
    });

    test('win and complete', async ({ page }) => {
      await seed(page, 1);
      await open(page, '#/level/1');
      for (const [from, to] of (ams as unknown as LevelPack).levels[0]!.solution!) {
        await page.locator(`.lv-glass[data-index="${from}"]`).click();
        await page.locator(`.lv-glass[data-index="${to}"]`).click();
      }
      await expect(page.getByRole('dialog')).toBeVisible();
      await shot(page, `${dir}/win`);
      await page.getByRole('link', { name: 'Collect rewards' }).click();
      await page.locator('.complete-screen[data-ready="true"]').waitFor();
      await shot(page, `${dir}/complete`);
    });

    test('menus', async ({ page }) => {
      await seed(page, 108);
      await open(page, '#/passport');
      await shot(page, `${dir}/passport`);
      // The tab bar sits on the screen's bottom edge (within one art pixel), not the stage's.
      const bar = (await page.locator('.tabbar').boundingBox())!;
      const artPx = (await page.evaluate(() => getComputedStyle(document.querySelector('.stage')!).transform)).match(
        /matrix\(([\d.]+)/,
      )![1]!;
      expect(vp.height - (bar.y + bar.height)).toBeLessThanOrEqual(2 * Number(artPx) + 0.01);
      expect(bar.y + bar.height).toBeLessThanOrEqual(vp.height + 0.5);
      await page.getByRole('button', { name: 'Settings' }).click();
      await shot(page, `${dir}/settings`);
      for (const name of ['daily', 'training', 'family']) {
        await open(page, `#/${name}`);
        await shot(page, `${dir}/${name}`);
      }
    });
  });
}
