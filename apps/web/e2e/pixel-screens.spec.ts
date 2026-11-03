import { expect, test, type Page } from '@playwright/test';
import type { LevelPack } from '@pour/engine';
import ams from '../../../levels/amsterdam/1.json' with { type: 'json' };
import ldn from '../../../levels/london/1.json' with { type: 'json' };
import ny from '../../../levels/newyork/1.json' with { type: 'json' };
import tk from '../../../levels/tokyo/1.json' with { type: 'json' };
import { open, shot } from './helpers';

/** Every screen in every city, saved to agent-logs/assets/pixel/screens/ for review (T30). */

const dir = 'pixel/screens';
const cities = [
  ['amsterdam', ams as unknown as LevelPack, 'amsterdam-64'],
  ['london', ldn as unknown as LevelPack, 'london-151'],
  ['newyork', ny as unknown as LevelPack, 'newyork-247'],
  ['tokyo', tk as unknown as LevelPack, 'tokyo-327'],
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

for (const [city, pack, fixture] of cities) {
  const first = pack.levels[0]!;
  const crowded = pack.levels.reduce((a, b) => (b.bottles.length > a.bottles.length ? b : a));

  test(`${city}: level screens`, async ({ page }) => {
    await open(page, `#/fixture/${fixture}`);
    await shot(page, `${dir}/${city}-level-design`);
    await open(page, `#/level/${crowded.number}`);
    await shot(page, `${dir}/${city}-level-${crowded.bottles.length}-glasses`);
  });

  test(`${city}: map`, async ({ page }) => {
    await seed(page, pack.levels[7]!.number);
    await open(page, `#/map/${city}`);
    await shot(page, `${dir}/${city}-map`);
  });

  test(`${city}: win overlay and level complete`, async ({ page }) => {
    await seed(page, first.number);
    await open(page, `#/level/${first.number}`);
    for (const [from, to] of first.solution!) {
      await page.locator(`.lv-glass[data-index="${from}"]`).click();
      await page.locator(`.lv-glass[data-index="${to}"]`).click();
    }
    await expect(page.getByRole('dialog')).toBeVisible();
    await shot(page, `${dir}/${city}-win`);
    await page.getByRole('link', { name: 'Collect rewards' }).click();
    await page.locator('.complete-screen[data-ready="true"]').waitFor();
    await shot(page, `${dir}/${city}-complete`);
  });
}

test('menus', async ({ page }) => {
  await seed(page, 327);
  await open(page, '#/passport');
  await shot(page, `${dir}/passport`);
  await page.getByRole('button', { name: 'Settings' }).click();
  await shot(page, `${dir}/settings`);
  await open(page, '#/daily');
  await shot(page, `${dir}/daily`);
  await open(page, '#/training');
  await shot(page, `${dir}/training`);
  await open(page, '#/family');
  await shot(page, `${dir}/family`);
  await open(page, '#/fixture/dead-end');
  await shot(page, `${dir}/dead-end`);
});

test('new player', async ({ page }) => {
  await open(page, '#/passport');
  await shot(page, `${dir}/passport-new-player`);
  await open(page, '#/level/1');
  await shot(page, `${dir}/level-1-guide`);
});
