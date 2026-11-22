import { expect, openApp, test } from './helpers';

test('offline: banner, emergency numbers and last-seen risk data', async ({ page, context }) => {
  await openApp(page);
  // The dashboard loads the forecast, which is saved on the device.
  await expect(page.getByText(/of 8 divisions at high risk/)).toBeVisible();
  // The dev server has no service worker: let lazy chunks finish before going offline.
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const banner = page.getByRole('status').filter({ hasText: 'You are offline' });
  await expect(banner).toBeVisible();
  await banner.getByRole('link', { name: 'Offline help' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Offline help' })).toBeVisible();
  await expect(page.getByRole('link', { name: /999/ }).first()).toHaveAttribute('href', 'tel:999');
  await expect(page.getByRole('link', { name: /16263/ }).first()).toHaveAttribute(
    'href',
    'tel:16263',
  );
  const saved = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Last-seen dengue risk' }) });
  await expect(saved.getByRole('listitem')).toHaveCount(8);
  await expect(saved.getByText('Dhaka')).toBeVisible();
  await expect(saved.getByText('High risk').first()).toBeVisible();

  await context.setOffline(false);
  await expect(banner).toBeHidden();
});
