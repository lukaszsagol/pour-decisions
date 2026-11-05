import { expect, test } from '@playwright/test';
import bar1 from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open, shot } from './helpers';

const glass = (i: number) => `.lv-glass[data-index="${i}"]`;

test('the sign counts down the pours left for three stars', async ({ page }) => {
  await open(page, '#/fixture/amsterdam-64');
  // Fixture: 8 pours made, par 21.
  await expect(page.locator('.lv-move-count')).toHaveText('13');
  await expect(page.locator('.lv-move-label')).toHaveText('pours leftfor ');
  await expect(page.locator('.lv-moves-status')).toHaveText('8 pours, par 21: 13 left for three stars');
  await shot(page, 'pour-count/sign');
});

test('level 1: the bartender explains that every pour counts', async ({ page }) => {
  await open(page, '#/level/1');
  const [from, to] = bar1.levels[0]!.solution[0]!;
  await page.locator(glass(from!)).click();
  await page.locator(glass(to!)).click();
  const best = bar1.levels[0]!.best;
  await expect(page.locator('.lv-host-say')).toContainText(`Every pour counts: sort it in ${best}`);
  await expect(page.locator('.lv-moves')).toHaveClass(/is-taught/);
  await page.waitForTimeout(1300);
  await shot(page, 'pour-count/level-1-taught');
  for (const [f, t] of bar1.levels[0]!.solution.slice(1)) {
    await page.locator(glass(f!)).click();
    await page.locator(glass(t!)).click();
  }
  await expect(page.getByText('The fewer pours, the more stars.')).toBeVisible();
  await shot(page, 'pour-count/level-1-win');
});

test('levels 2 to 5 open with the par card, and the sign reopens it', async ({ page }) => {
  await open(page, '#/level/2');
  const card = page.getByRole('dialog');
  await expect(card).toContainText(`Sort every drink in ${bar1.levels[1]!.best} pours or fewer for three stars.`);
  await shot(page, 'pour-count/par-card');
  await page.getByRole('button', { name: "Let's pour" }).click();
  await expect(card).toHaveCount(0);
  await page.locator('.lv-moves').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await open(page, '#/level/6');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('restart asks first once there are pours to lose', async ({ page }) => {
  await open(page, '#/level/7');
  const restart = page.getByRole('button', { name: 'Restart level' });
  // Nothing to lose yet: restarts straight away.
  await restart.click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const [from, to] = bar1.levels[6]!.solution[0]!;
  await page.locator(glass(from!)).click();
  await page.locator(glass(to!)).click();
  await expect(page.locator('.lv-moves-status')).toHaveText(/^1 pour,/);
  await restart.click();
  const ask = page.getByRole('alertdialog');
  await expect(ask).toContainText("Your 1 pour so far won't count.");
  await shot(page, 'pour-count/restart-confirm');
  await ask.getByRole('button', { name: 'Keep pouring' }).click();
  await expect(page.locator('.lv-moves-status')).toHaveText(/^1 pour,/);
  await restart.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Restart' }).click();
  await expect(page.locator('.lv-moves-status')).toHaveText(/^0 pours,/);
});
