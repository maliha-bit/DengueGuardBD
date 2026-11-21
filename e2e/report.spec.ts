import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, expectNoHorizontalScroll, navigate, openApp, test } from './helpers';

const PHOTO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'site.png');
const AREA = 'E2E Test Road, Mirpur';

test('breeding-site report: photo, map pin, submit, see it in My reports', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Report breeding site');
  await expectNoHorizontalScroll(page);
  await expect(page.getByRole('heading', { level: 1, name: 'My reports' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole('link', { name: 'Report a site' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Report a breeding site' }),
  ).toBeVisible();

  await page.getByLabel(/^Photo/).setInputFiles(PHOTO);
  await expect(page.getByRole('img', { name: 'Photo preview' })).toBeVisible();

  // Tap the map to drop the pin.
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  await expect(page.getByText('No location chosen yet')).toBeVisible();
  await map.click({ position: { x: 120, y: 120 } });
  await expect(page.getByText(/^Pin at /)).toBeVisible();

  await page.getByLabel('Area or road name').fill(AREA);
  await page.getByRole('radio', { name: 'Blocked drain' }).check();
  await page.getByRole('button', { name: 'Submit report' }).click();

  await expect(page.getByRole('heading', { name: 'Report sent' })).toBeVisible();
  await expect(page.getByTestId('report-reference')).toHaveText(/^BR-\d{4}-\d{6}$/);

  await page.getByRole('link', { name: 'My reports' }).last().click();
  const card = page.getByRole('article', { name: AREA });
  await expect(card).toBeVisible();
  await expect(card.getByTestId('report-status')).toHaveText('Submitted');
  await expect(card.getByText('Blocked drain')).toBeVisible();
  await expect(card.getByRole('img')).toBeVisible();
});
