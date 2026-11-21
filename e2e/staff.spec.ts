import { expect, expectNoHorizontalScroll, navigate, openApp, switchRole, test } from './helpers';

const HOSPITAL = 'Dhaka Care Hospital';

test('hospital staff updates beds and the citizen hospital page shows the new number', async ({
  page,
}) => {
  await openApp(page);
  await switchRole(page, 'Hospital staff');
  await expect(page.getByRole('heading', { level: 1, name: 'Hospital overview' })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await navigate(page, 'Beds');
  await expect(page.getByRole('heading', { level: 1, name: 'Update beds' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const general = page.getByLabel('General beds available', { exact: true });
  const before = Number(await general.inputValue());
  // Two taps: + then Save.
  await page.getByRole('button', { name: 'Increase General beds available' }).click();
  await expect(general).toHaveValue(String(before + 1));
  await page.getByRole('button', { name: 'Save beds' }).click();
  await expect(page.getByText('Beds saved. Citizens now see the new numbers.')).toBeVisible();
  await expect(page.getByText(/^Last updated .*(now|second)/)).toBeVisible();

  await switchRole(page, 'Citizen');
  await expect(page.getByRole('heading', { level: 1, name: 'Dengue Risk Overview' })).toBeVisible();
  await navigate(page, 'Hospitals');
  const card = page.getByRole('article').filter({ hasText: HOSPITAL });
  await expect(card.getByRole('progressbar', { name: 'General beds' })).toHaveAttribute(
    'aria-valuenow',
    String(before + 1),
  );
});

test('admin approves a staff account and that account gets portal access', async ({ page }) => {
  await openApp(page);
  await switchRole(page, 'Hospital staff — new sign-up');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Waiting for admin approval' }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);

  await switchRole(page, 'Administrator');
  await expect(page.getByRole('heading', { level: 1, name: 'Pending approvals' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const row = page.locator('[data-row]').filter({ hasText: 'Rafiq Uddin' });
  await expect(row).toContainText('rafiq-uddin-staff-id.pdf');
  await row.getByRole('button', { name: 'Approve Rafiq Uddin' }).click();
  await expect(
    page.getByText('Rafiq Uddin approved. They can now use their portal.'),
  ).toBeVisible();

  // The approval is in the audit trail.
  await navigate(page, 'Audit trail');
  await expect(page.getByRole('heading', { level: 1, name: 'Audit trail' })).toBeVisible();
  await expect(
    page
      .locator('[data-row]')
      .filter({ hasText: 'Approved a sign-up' })
      .filter({ hasText: 'Rafiq Uddin' }),
  ).toHaveCount(1);

  await switchRole(page, 'Hospital staff — new sign-up');
  await expect(page.getByRole('heading', { level: 1, name: 'Hospital overview' })).toBeVisible();
  await expect(page.getByText(HOSPITAL).first()).toBeVisible();
});

test("authority changes a report status and the citizen's My reports updates", async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Report breeding site');
  const mine = page.getByRole('article', { name: 'Road 7, Dhanmondi' });
  await expect(mine.getByTestId('report-status')).toHaveText('Under review');

  await switchRole(page, 'Health authority');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Health authority dashboard' }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
  await navigate(page, 'Breeding reports');
  await expect(page.getByRole('heading', { level: 1, name: 'Breeding reports' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByLabel('Status', { exact: true }).selectOption('under_review');
  await page.getByRole('button', { name: 'Open report Road 7, Dhanmondi' }).click();

  const dialog = page.getByRole('dialog', { name: 'Road 7, Dhanmondi' });
  await dialog.getByLabel('New status').selectOption('action_taken');
  await dialog.getByLabel('Note to the citizen').fill('Site cleared by the city team.');
  await dialog.getByRole('button', { name: 'Save status' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/is now: Action taken/)).toBeVisible();

  await switchRole(page, 'Citizen');
  await navigate(page, 'Report breeding site');
  await expect(page.getByRole('heading', { level: 1, name: 'My reports' })).toBeVisible();
  await expect(mine.getByTestId('report-status')).toHaveText('Action taken');
});
