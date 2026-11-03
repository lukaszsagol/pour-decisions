import { expect, test } from '@playwright/test';
import { solveAuto } from '@pour/engine';
import { dailyLevel, dateKey, shortDate } from '../src/daily/generate';
import { open, shot } from './helpers';

test("tonight's pour: everyone's level of the day, shareable", async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const date = dateKey();
  const level = dailyLevel(date);
  await open(page, '');
  await page.getByRole('link', { name: /Tonight's pour/ }).click();
  await page.locator('.level-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('heading', { name: "Tonight's pour" })).toBeVisible();
  await shot(page, 'T18-daily');
  const moves = solveAuto(level.bottles).moves!;
  for (const m of moves) {
    await page.locator(`.lv-glass[data-index="${m.from}"]`).click();
    await page.locator(`.lv-glass[data-index="${m.to}"]`).click();
  }
  await page.getByRole('link', { name: 'Collect rewards' }).click();
  await expect(page.getByText("Tonight's pour cleared")).toBeVisible();
  await page.getByRole('button', { name: 'Share result' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBe(`Pour Decisions · ${shortDate(date)} · ★★★ ${moves.length} moves (best ${level.best})`);
  await page.getByRole('link', { name: 'Back to the passport' }).click();
  await expect(page.getByText(`★★★ ${moves.length} moves tonight (best ${level.best})`)).toBeVisible();
});
