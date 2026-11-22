import type { Page } from '@playwright/test';
import { expect, navigate, openApp, switchRole, test } from './helpers';

/** Latin digits left in the visible page (bn mode should show Bangla digits only). */
async function latinDigits(page: Page) {
  await expect(page.getByRole('status', { name: /লোড হচ্ছে/ })).toHaveCount(0, { timeout: 10_000 });
  return page.evaluate(() => {
    const found: string[] = [];
    const root = document.querySelector('main');
    if (!root) return found;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      const parent = node.parentElement;
      if (!parent || parent.closest('.leaflet-container, [aria-hidden="true"]')) continue;
      // Test codes (NS1) and organisation names (DGHS/WHO) are proper names, not numbers.
      const cleaned = text.replace(/\bNS1\b|IgM\/IgG|CBC/g, '');
      if (/[0-9]/.test(cleaned) && parent.offsetParent !== null)
        found.push(text.trim().slice(0, 40));
    }
    return found;
  });
}

const CITIZEN = [
  'Dashboard',
  'Risk map',
  'Hospitals',
  'Appointments',
  'Fever log',
  'Labs',
  'Donors',
];

test('বাংলা mode shows Bangla digits on citizen and staff pages', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Text content is the same on both layouts.');
  test.setTimeout(120_000);
  await openApp(page);
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  const problems: string[] = [];
  const bnNames: Record<string, string> = {
    Dashboard: 'ড্যাশবোর্ড',
    'Risk map': 'ঝুঁকির মানচিত্র',
    Hospitals: 'হাসপাতাল',
    Appointments: 'অ্যাপয়েন্টমেন্ট',
    'Fever log': 'জ্বরের লগ',
    Labs: 'ল্যাব',
    Donors: 'রক্তদাতা',
  };
  for (const name of CITIZEN) {
    const link = page
      .locator('aside')
      .getByRole('navigation')
      .getByRole('link', { name: bnNames[name] ?? name, exact: true });
    if ((await link.count()) === 0) continue;
    await link.click();
    await page.waitForTimeout(300);
    problems.push(...(await latinDigits(page)).map((p) => `${name}: ${p}`));
  }
  // Switch to English to use the role helper, then back to Bangla for each portal.
  for (const [account, items] of [
    ['Hospital staff', ['Overview', "Today's appointments", 'Slot generator']],
    ['Administrator', ['Approvals', 'Directories', 'Analytics', 'Audit trail', 'Forecast']],
  ] as const) {
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await switchRole(page, account);
    for (const item of items) {
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await navigate(page, item);
      await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
      await page.waitForTimeout(300);
      problems.push(...(await latinDigits(page)).map((p) => `${account} › ${item}: ${p}`));
    }
  }
  expect([...new Set(problems)]).toEqual([]);
});
