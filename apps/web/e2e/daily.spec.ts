import { expect, test } from '@playwright/test';
import { solveAuto } from '@pour/engine';
import { dailyLevel, dateKey } from '../src/daily/generate';
import { open, played, shot } from './helpers';

test("tonight's pour has its own screen, then shows your result", async ({ page }) => {
  const date = dateKey();
  const level = dailyLevel(date);
  await played(page, 6);
  await open(page, '');
  await page.getByRole('link', { name: /Tonight's pour/ }).click();
  await page.locator('.daily-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('heading', { name: "Tonight's pour" })).toBeVisible();
  await expect(page.getByRole('heading', { name: level.theme.name })).toBeVisible();
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  await expect(page.getByText(`${today} · the same level for everyone`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Daily' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Start a run tonight')).toBeVisible();
  await shot(page, 'daily-screen');

  await page.getByRole('link', { name: "Play tonight's pour" }).click();
  await page.locator('.level-screen[data-ready="true"]').waitFor();
  const moves = solveAuto(level.bottles).moves!;
  for (const m of moves) {
    await page.locator(`.lv-glass[data-index="${m.from}"]`).click();
    await page.locator(`.lv-glass[data-index="${m.to}"]`).click();
  }
  await page.getByRole('link', { name: 'See your result' }).click();
  await expect(page.getByText("Tonight's pour cleared")).toBeVisible();
  await expect(page.getByText('Daily hint')).toBeVisible();
  await page.getByRole('link', { name: "Back to tonight's pour" }).click();
  await page.locator('.daily-screen[data-ready="true"]').waitFor();
  await expect(page.getByText('1 night in a row')).toBeVisible();
  await expect(page.getByText(`${moves.length} pours · par ${level.best}`)).toBeVisible();
  await expect(page.getByText(/Next pour in/)).toBeVisible();
  await shot(page, 'daily-screen-played');
  await expect(page.getByRole('button', { name: 'Share result' })).toHaveCount(0);
});
