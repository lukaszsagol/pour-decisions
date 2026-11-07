import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

/** Screenshots for pull requests go to `agent-logs/assets/`. */
export const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../agent-logs/assets');

/** Opens a route and waits until the screen has drawn and fonts are in. */
export async function open(page: Page, hash: string): Promise<void> {
  await page.goto(`/${hash}`);
  await page.locator('.screen[data-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(assets, `${name}.png`) });
}

/** A new player who has already seen the welcome screen. */
export async function welcomed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem('pour-decisions:save')) return;
    localStorage.setItem(
      'pour-decisions:save',
      JSON.stringify({ version: 2, levels: {}, current: 1, intro: { welcomed: true, announced: [], opened: [] } }),
    );
  });
}

/**
 * A player who has won every level before `current`, saved before the first-run screens existed:
 * every feature open to them counts as announced, so no announcement cards get in the way.
 */
export async function played(page: Page, current: number): Promise<void> {
  const levels: Record<string, { stars: number; bestMoves: number }> = {};
  for (let n = 1; n < current; n++) levels[n] = { stars: 3, bestMoves: 20 };
  await page.addInitScript(
    (save) => {
      if (!localStorage.getItem('pour-decisions:save'))
        localStorage.setItem('pour-decisions:save', JSON.stringify(save));
    },
    { version: 2, levels, current, stock: { undo: 5, extraGlass: 2, hint: 3 } },
  );
}

/** Closes the bartender's cards about special glasses the player hasn't met yet, if any. */
export async function dismissRules(page: Page): Promise<void> {
  const ok = page.getByRole('button', { name: 'Got it' });
  while ((await ok.count()) > 0) await ok.first().click();
}
