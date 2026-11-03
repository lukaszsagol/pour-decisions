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
