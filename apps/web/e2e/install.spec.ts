import { expect, test } from '@playwright/test';
import { open } from './helpers';

test('offers Install when the browser allows it, and hides it once installed', async ({ page }) => {
  await open(page, '#/passport');
  const button = page.getByRole('button', { name: 'Install' });
  await expect(button).toBeHidden();
  // Simulate Chrome deciding the game can be installed.
  await page.evaluate(() => {
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => ((window as unknown as { prompted: boolean }).prompted = true),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(e);
  });
  await expect(button).toBeVisible();
  await button.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await expect(button).toBeHidden();
});

test.describe('on iPhone Safari', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
  });

  test('Install shows the Add to Home Screen steps', async ({ page }) => {
    await open(page, '#/passport');
    await page.getByRole('button', { name: 'Install' }).click();
    await expect(page.getByRole('dialog', { name: 'Install Pour Decisions' })).toBeVisible();
    await expect(page.getByText('Add to Home Screen')).toBeVisible();
  });
});
