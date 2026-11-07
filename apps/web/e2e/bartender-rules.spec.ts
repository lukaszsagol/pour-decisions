import { expect, test } from '@playwright/test';
import { open, played, shot } from './helpers';

test('the bartender explains a locked glass the first time one shows up, then never again', async ({ page }) => {
  await played(page, 21);
  await open(page, '#/level/21');
  const card = page.getByRole('dialog', { name: 'Locked glass' });
  await expect(card).toBeVisible();
  await expect(card).toContainText(
    'This glass is shut with chains and a padlock. Fill a glass with Cherry brandy to open it.',
  );
  await expect(page.locator('.lv-glass.is-taught')).toHaveCount(1);
  await page.waitForTimeout(300);
  await shot(page, 'bartender-rules/locked-amsterdam');
  await card.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.lv-glass.is-taught')).toHaveCount(0);
  await open(page, '#/level/22');
  await open(page, '#/level/21');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('in a new city the same rule gets a short "new look" note', async ({ page }) => {
  // Everything up to London's first locked glass won: the rule is known, London's look isn't.
  await played(page, 116);
  await open(page, '#/level/116');
  const card = page.getByRole('dialog', { name: 'Locked glass' });
  await expect(card).toContainText('Same rule, new look: a locked tap.');
  await page.waitForTimeout(300);
  await shot(page, 'bartender-rules/locked-london');
});
