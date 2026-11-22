import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, expectNoHorizontalScroll, navigate, openApp, switchRole, test } from './helpers';

/** WCAG 2.1 A/AA rules; serious and critical findings fail the test. */
async function expectNoSeriousViolations(page: Page, label: string) {
  // No colour transitions mid-check (the CSS honours reduced motion).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForLoadState('networkidle');
  // Let skeletons resolve so the real content is checked.
  await expect(page.getByRole('status', { name: 'Loading…' })).toHaveCount(0, { timeout: 10_000 });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      page: label,
      rule: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    }));
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

const CITIZEN_PAGES: Array<[string, string]> = [
  ['/', 'Dashboard'],
  ['/risk', 'Risk map'],
  ['/hospitals', 'Hospitals'],
  ['/hospitals/h-dhaka-1', 'Hospital detail'],
  ['/appointments', 'Appointments'],
  ['/symptoms', 'Symptom checker'],
  ['/home-care', 'Home care'],
  ['/fever-log', 'Fever log'],
  ['/chatbot', 'Chatbot'],
  ['/donors', 'Donors'],
  ['/labs', 'Labs'],
  ['/reports', 'My reports'],
  ['/reports/new', 'New report'],
  ['/offline', 'Offline help'],
];

for (const [path, label] of CITIZEN_PAGES) {
  test(`axe: ${label}`, async ({ page }) => {
    await openApp(page, path);
    await expectNoSeriousViolations(page, label);
  });
}

test('axe: Bangla dashboard', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'বাংলা' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expectNoSeriousViolations(page, 'Dashboard (bn)');
});

const STAFF: Array<[Parameters<typeof switchRole>[1], string[]]> = [
  [
    'Hospital staff',
    ['Overview', 'Beds', 'Doctors', "Today's appointments", 'Weekly schedule', 'Slot generator'],
  ],
  ['Lab staff', ['Lab listing']],
  ['Health authority', ['Overview', 'Breeding reports', 'Prevention tasks']],
  [
    'Administrator',
    ['Approvals', 'Directories', 'Analytics', 'Audit trail', 'Knowledge sources', 'Forecast'],
  ],
];

for (const [account, items] of STAFF) {
  test(`axe: ${account} portal`, async ({ page }) => {
    test.setTimeout(120_000);
    await openApp(page);
    await switchRole(page, account);
    for (const item of items) {
      await navigate(page, item);
      await expectNoHorizontalScroll(page);
      await expectNoSeriousViolations(page, `${account} › ${item}`);
    }
  });
}
