import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { open, welcomed } from './helpers';

test('the hidden debug menu exports the play log', async ({ page }) => {
  await welcomed(page);
  await open(page, '#/level/1');
  await page.locator('.lv-glass[data-index="0"]').click();
  await page.locator('.lv-glass[data-index="2"]').click();
  await page.getByRole('link', { name: 'Back to map' }).click();
  await page.getByRole('link', { name: 'Passport', exact: true }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Debug')).toHaveCount(0);
  const version = page.getByRole('button', { name: /^Version/ });
  for (let i = 0; i < 5; i++) await version.click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export play log' }).click();
  const file = JSON.parse(fs.readFileSync(await (await download).path(), 'utf8'));
  expect(file.version).toBe(1);
  expect(file.events.map((e: { type: string }) => e.type)).toEqual(['start', 'pour', 'quit']);
  expect(file.events[1]).toMatchObject({ level: 1, from: 0, to: 2, moves: 1 });
});
