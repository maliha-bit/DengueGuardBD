import { expect, test } from '@playwright/test';

const BASE = '/dengue_prediction_dashboard/';

test('production build: base path, manifest, service worker and offline reload', async ({
  page,
  context,
  request,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Dengue Risk Overview' })).toBeVisible();

  // Manifest under the base path.
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe(`${BASE}manifest.webmanifest`);
  const manifest = (await (await request.get(href ?? '')).json()) as {
    name: string;
    short_name: string;
    theme_color: string;
    start_url: string;
    scope: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };
  expect(manifest).toMatchObject({
    name: 'DengueGuard BD',
    short_name: 'DengueGuard',
    theme_color: '#161618',
    start_url: BASE,
    scope: BASE,
  });
  expect(manifest.icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    expect((await request.get(`${BASE}${icon.src}`)).ok()).toBe(true);
  }

  // Service worker controls the page with the base-path scope.
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe(BASE);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  // Offline: the app shell, pages and both languages come from the cache.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Dengue Risk Overview' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'You are offline' })).toBeVisible();
  await page.getByRole('link', { name: 'Offline help' }).first().click();
  await expect(page).toHaveURL(new RegExp(`${BASE}offline$`));
  await expect(page.getByRole('link', { name: /999/ }).first()).toHaveAttribute('href', 'tel:999');
  await page.goto(`${BASE}hospitals`);
  await expect(page.getByRole('heading', { level: 1, name: 'Hospitals' })).toBeVisible();
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'হাসপাতাল' })).toBeVisible();
});

test('production build: deep links work under the base path', async ({ page }) => {
  await page.goto(`${BASE}labs`);
  await expect(page.getByRole('heading', { level: 1, name: 'Labs' })).toBeVisible();
  await page.goto(`${BASE}staff/admin`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'No access to this portal' }),
  ).toBeVisible();
});
