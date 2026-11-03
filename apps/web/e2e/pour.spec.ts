import { expect, test } from '@playwright/test';
import bar1 from '../../../levels/amsterdam/1.json' with { type: 'json' };
import { open, shot } from './helpers';

test.use({ reducedMotion: 'no-preference' });

const glass = (i: number) => `.lv-glass[data-index="${i}"]`;

test('animates a pour and shows it mid-stream', async ({ page }) => {
  await open(page, '#/level/1');
  const [from, to] = bar1.levels[0]!.solution[0]!;
  await page.locator(glass(from!)).click();
  await page.waitForTimeout(200);
  // Tap inside the page so the screenshot lands mid-animation.
  await page.evaluate((sel) => (document.querySelector(sel) as HTMLButtonElement).click(), glass(to!));
  await page.waitForTimeout(240);
  await shot(page, 'T10-pour-mid');
  await expect(page.locator('.lv-move-count')).toHaveText('1');
});

test('queues taps made during an animation instead of dropping them', async ({ page }) => {
  await open(page, '#/level/2');
  const level = bar1.levels[1]!;
  for (const [from, to] of level.solution) {
    await page.locator(glass(from!)).click({ delay: 0 });
    await page.locator(glass(to!)).click({ delay: 0 });
  }
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.lv-move-count')).toHaveText(String(level.best));
});

test('a whole pour tapped during an animation still happens', async ({ page }) => {
  await open(page, '#/level/2');
  const [first, second] = bar1.levels[1]!.solution as [number, number][];
  const [a, b] = first!;
  const [c, d] = second!;
  // Four taps in one go: the second pour's select and target both arrive mid-animation.
  await page.evaluate(
    (idx) => idx.forEach((i) => (document.querySelector(`.lv-glass[data-index="${i}"]`) as HTMLButtonElement).click()),
    [a, b, c, d],
  );
  await expect(page.locator('.lv-move-count')).toHaveText('2', { timeout: 5000 });
});
