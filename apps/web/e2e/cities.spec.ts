import { expect, test } from '@playwright/test';
import london from '../../../levels/london/1.json' with { type: 'json' };
import newyork from '../../../levels/newyork/1.json' with { type: 'json' };
import tokyo from '../../../levels/tokyo/1.json' with { type: 'json' };
import { open, shot } from './helpers';

for (const [city, pack, name] of [
  ['london', london, 'London'],
  ['newyork', newyork, 'New York'],
  ['tokyo', tokyo, 'Tokyo'],
] as const) {
  test(`${name}: loads a level with its own look`, async ({ page }) => {
    const level = pack.levels[0]!;
    await open(page, `#/level/${level.number}`);
    await expect(page.getByText(`${name} · Level ${level.number}`)).toBeVisible();
    await shot(page, `T16-${city}-level-${level.number}`);
  });

  test(`${name}: shows its map`, async ({ page }) => {
    await open(page, `#/map/${city}`);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.locator('.map-node')).toHaveCount(100);
    await shot(page, `T16-${city}-map`);
  });
}

test('London and New York design states', async ({ page }) => {
  await open(page, '#/fixture/london-151');
  await expect(page.getByRole('button', { name: /hidden/ })).toHaveCount(1);
  await shot(page, 'T16-london-151');
  await open(page, '#/fixture/newyork-247');
  await expect(page.getByRole('button', { name: /only takes manhattan/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /chained shut/ })).toHaveCount(1);
  await shot(page, 'T16-newyork-247');
  await open(page, '#/fixture/tokyo-327');
  await shot(page, 'T16-tokyo-327');
});
