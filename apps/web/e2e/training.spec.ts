import { expect, test } from '@playwright/test';
import { solveAuto } from '@pour/engine';
import { getTheme } from '@pour/themes';
import { dateKey } from '../src/daily/generate';
import { trainingLevel } from '../src/training/logic';
import { open, shot } from './helpers';

test('planning training scores a perfect solve, raises the level and charts it', async ({ page }) => {
  await open(page, '#/passport');
  await page.getByRole('link', { name: /^Training/ }).click();
  await expect(page.getByRole('heading', { name: 'Training' })).toBeVisible();
  await page.getByRole('link', { name: 'Start Planning' }).click();
  await page.locator('.level-screen[data-ready="true"]').waitFor();
  const level = trainingLevel('planning', getTheme('amsterdam'), 2, `training-planning-0-${dateKey()}`);
  for (const m of solveAuto(level.bottles).moves!) {
    await page.locator(`.lv-glass[data-index="${m.from}"]`).click();
    await page.locator(`.lv-glass[data-index="${m.to}"]`).click();
  }
  await page.getByRole('link', { name: 'See your score' }).click();
  await expect(page.getByRole('heading', { name: 'Planning score 100' })).toBeVisible();
  await expect(page.locator('.cp-rewards')).toHaveCount(0);
  await page.getByRole('link', { name: 'Next: a harder one' }).click();
  await expect(page.getByText('Level 3 of 6')).toBeVisible();
  await expect(page.getByRole('img', { name: /Planning score over the last 1 sessions, latest 100/ })).toBeVisible();
  await shot(page, 'T23-training');
});

test('plan ahead hides the boosters', async ({ page }) => {
  await open(page, '#/train/planAhead');
  await expect(page.getByRole('button', { name: /^Undo,/ })).toBeHidden();
  await expect(page.getByRole('button', { name: /^Hint,/ })).toBeHidden();
});

test('memory shows every glass, then covers all but the top units', async ({ page }) => {
  await open(page, '#/train/memory');
  await expect(page.getByRole('status').filter({ hasText: 'Remember the glasses' })).toBeVisible();
  await expect(page.getByRole('button', { name: /hidden/ })).toHaveCount(0);
  await shot(page, 'T23-memory-peek');
  await expect(page.getByRole('button', { name: /hidden/ }).first()).toBeVisible({ timeout: 10_000 });
  await shot(page, 'T23-memory-covered');
});
