import { test } from '@playwright/test';
import { open } from './helpers';

/**
 * Screenshot tool, idle in normal runs:
 *   SHOTS='{"name":"#/route"}' OUT=/abs/dir npx playwright test e2e/shots.spec.ts
 */
const shots = JSON.parse(process.env.SHOTS ?? '{}') as Record<string, string>;
for (const [name, hash] of Object.entries(shots))
  test(`screenshot ${name}`, async ({ page }) => {
    await open(page, hash);
    await page.screenshot({ path: `${process.env.OUT}/${name}.png` });
  });
