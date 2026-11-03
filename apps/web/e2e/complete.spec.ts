import { expect, test } from '@playwright/test';
import bar1 from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open, shot } from './helpers';

test('finishing a bar shows the complete screen with a recipe card, and Share copies the result', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
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
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Result copied' })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBe(`Pour Decisions · Level ${level.number} · ★★★ ${level.best} moves (best ${level.best})`);
  await page.getByRole('link', { name: 'Next level' }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('heading', { name: `Level ${level.number + 1}` })).toBeVisible();
});
