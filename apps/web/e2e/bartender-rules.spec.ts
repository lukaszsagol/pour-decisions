import { expect, test } from '@playwright/test';
import { open, played, shot } from './helpers';

test('the bartender explains a locked glass the first time one shows up, then never again', async ({ page }) => {
  await played(page, 21);
  await open(page, '#/level/21');
  const card = page.getByRole('dialog', { name: 'Locked glass' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('New at the bar');
  await expect(card).toContainText(
    'See the glass in chains? It stays shut until another glass is filled to the top with cherry brandy. Then the padlock comes off.',
  );
  await page.waitForTimeout(300);
  await shot(page, 'bartender-rules/locked-amsterdam');
  await card.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await open(page, '#/level/22');
  await open(page, '#/level/21');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test("in a new city the same rule is explained again, with the city's look", async ({ page }) => {
  // Everything up to London's first locked glass won: the rule is known, London's look isn't.
  await played(page, 116);
  await open(page, '#/level/116');
  const card = page.getByRole('dialog', { name: 'Locked glass' });
  await expect(card).toContainText('New look');
  await expect(card).toContainText('See the glass with the locked tap?');
  await expect(card).toContainText('Then the tap unlocks.');
  await page.waitForTimeout(300);
  await shot(page, 'bartender-rules/locked-london');
});
