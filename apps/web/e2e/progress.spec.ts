import { expect, test } from '@playwright/test';
import bar1 from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open } from './helpers';

test('progress is saved: after winning level 1 a reload continues at level 2', async ({ page }) => {
  await open(page, '');
  await expect(page.getByText('Amsterdam · Level 1')).toBeVisible();
  for (const [from, to] of bar1.levels[0]!.solution) {
    await page.locator(`.lv-glass[data-index="${from}"]`).click();
    await page.locator(`.lv-glass[data-index="${to}"]`).click();
  }
  await expect(page.getByRole('dialog')).toBeVisible();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('pour-decisions:save')!));
  expect(save).toMatchObject({ version: 1, current: 2, streak: 1, coins: 340, levels: { '1': { stars: 3 } } });
  await page.goto('/');
  await page.reload();
  await page.locator('.screen[data-ready="true"]').waitFor();
  await expect(page.getByText('Amsterdam · Level 2')).toBeVisible();
});

test('using a booster is saved', async ({ page }) => {
  await open(page, '#/level/1');
  await page.locator('.lv-glass[data-index="0"]').click();
  await page.getByRole('button', { name: 'Hint, 3 left' }).click();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('pour-decisions:save')!));
  expect(save.stock.hint).toBe(2);
});
