import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('family features run against the fake backend behind the flag', async ({ page }) => {
  await page.goto('/?flags=family#/family');
  await page.locator('.screen[data-ready="true"]').waitFor();
  const create = page.locator('.fam-create');
  await create.getByLabel('Your name').fill('Łukasz');
  await create.getByLabel('Group name').fill('Sągols');
  await create.getByRole('button', { name: 'Create group' }).click();
  await expect(page.getByRole('heading', { name: 'Sągols' })).toBeVisible();
  await expect(page.locator('.fam-code')).toHaveText(/^[A-Z0-9]{6}$/);
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
  await shot(page, 'T20-family');
  await page.getByRole('link', { name: 'Passport', exact: true }).click();
  await expect(page.getByText(/of 4 have played/)).toBeVisible();
  await expect(page.getByRole('link', { name: /^Family/ })).toHaveAttribute('href', '#/family');
  await page.getByRole('link', { name: 'Map', exact: true }).click();
  await page.locator('.map-screen[data-ready="true"]').waitFor();
  await expect(page.getByRole('img', { name: /is here$/ }).first()).toBeAttached();
});

test('without the flag the family tab explains what is coming', async ({ page }) => {
  await page.goto('/#/family');
  await expect(page.getByText(/once the family server is set up/)).toBeVisible();
});
