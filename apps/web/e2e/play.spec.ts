import { expect, test, type Page } from '@playwright/test';
import { parseBottles, solve, type Bottle } from '@pour/engine';
import starter from '../../../levels/amsterdam/starter.json' with { type: 'json' };
import { open, shot } from './helpers';

const glass = (page: Page, i: number) => page.locator(`.lv-glass[data-index="${i}"]`);

async function playSolution(page: Page, bottles: Bottle[]): Promise<number> {
  const moves = solve(bottles).moves!;
  for (const m of moves) {
    await glass(page, m.from).click();
    await glass(page, m.to).click();
  }
  return moves.length;
}

test('plays Amsterdam level 1 by tapping to a 3-star win', async ({ page }) => {
  await open(page, '#/level/1');
  const n = await playSolution(page, starter.levels[0]!.bottles as Bottle[]);
  await expect(page.locator('.lv-move-count')).toHaveText(String(n));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
  await expect(page.getByText('Perfect pour')).toBeVisible();
  await shot(page, 'T09-amsterdam-level-1-won');
  await page.getByRole('link', { name: 'Next level' }).click();
  await expect(page.getByText('Amsterdam · Level 2')).toBeVisible();
});

test('wins golden Tokyo level 327 with the Tokyo theme', async ({ page }) => {
  await open(page, '#/fixture/tokyo-327');
  await expect(page.getByText('Tokyo · Level 327')).toBeVisible();
  await shot(page, 'T09-tokyo-327-start');
  const bottles = parseBottles(
    [
      'umeshu sakura melon ramune',
      'sakura ramune umeshu yuzu',
      '?melon ?yuzu sakura umeshu',
      'ramune melon yuzu yuzu',
      'umeshu sakura melon ramune',
      '',
      '',
    ],
    4,
    { 5: { only: 'yuzu' } },
  );
  const n = await playSolution(page, bottles);
  expect(n).toBe(16);
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
  await expect(page.getByText('16 moves · best 16')).toBeVisible();
});

test('selecting lifts a glass, illegal taps are rejected and keep the selection', async ({ page }) => {
  await open(page, '#/level/1');
  const top0 = (await glass(page, 0).boundingBox())!.y;
  await glass(page, 0).click();
  await expect(glass(page, 0)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => top0 - (await glass(page, 0).boundingBox())!.y).toBeGreaterThan(15);
  await glass(page, 1).click(); // jenever onto advocaat: illegal
  await expect(glass(page, 0)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lv-move-count')).toHaveText('0');
  await glass(page, 0).click();
  await expect(glass(page, 0)).toHaveAttribute('aria-pressed', 'false');
});

test('undo, hint and extra glass work and count down', async ({ page }) => {
  await open(page, '#/level/1');
  await glass(page, 0).click();
  await glass(page, 2).click();
  await page.getByRole('button', { name: 'Undo, 5 left' }).click();
  await expect(page.getByRole('button', { name: 'Undo, 4 left' })).toBeVisible();
  await expect(page.locator('.lv-move-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Hint, 3 left' }).click();
  await expect(page.getByRole('button', { name: /hint: pour from here/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /hint: pour here/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Add an empty glass, 2 left' }).click();
  await expect(page.getByRole('button', { name: /^Glass \d/ })).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Add an empty glass, 1 left' })).toBeDisabled();
});

test('dead end offers undo, add glass and restart', async ({ page }) => {
  await open(page, '#/fixture/dead-end');
  const panel = page.getByRole('alertdialog');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await shot(page, 'T09-dead-end');
  await panel.getByRole('button', { name: 'Add glass' }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: /^Glass \d/ })).toHaveCount(3);
});

test('level 1 shows a pointer for the first pour only', async ({ page }) => {
  await open(page, '#/level/1');
  const guide = page.locator('.lv-guide');
  await expect(guide).toBeVisible();
  const first = await guide.getAttribute('data-target');
  await glass(page, Number(first)).click();
  const second = await guide.getAttribute('data-target');
  expect(second).not.toBe(first);
  await shot(page, 'T09-level-1-guide');
  await glass(page, Number(second)).click();
  await expect(guide).toBeHidden();
});
