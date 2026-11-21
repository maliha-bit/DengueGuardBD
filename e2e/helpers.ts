import { expect, test as base, type Page } from '@playwright/test';

/** 1×1 transparent PNG, used for map tiles so tests do not depend on OpenStreetMap. */
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Test with OpenStreetMap tiles stubbed out. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_PNG }),
    );
    await use(page);
  },
});

export { expect };

const MOBILE_TABS = new Set(['Home', 'Risk', 'Hospitals', 'Chatbot']);

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;

/**
 * Open the app once. The mock API keeps its data in memory, so after this the tests move
 * around with in-app links only (a reload would reset the mock).
 */
export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoHorizontalScroll(page);
}

/** CLAUDE.md layout rule: no horizontal page scroll at phone width. */
export async function expectNoHorizontalScroll(page: Page) {
  if (!isMobile(page)) return;
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(0);
}

/** Click a main-navigation item: the sidebar on desktop, the tab bar or "More" sheet on phones. */
export async function navigate(page: Page, name: string) {
  if (!isMobile(page)) {
    await page
      .locator('aside')
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name, exact: true })
      .click();
    return;
  }
  const tabBar = page
    .locator('nav.fixed')
    .filter({ has: page.getByRole('button', { name: 'More' }) });
  if (MOBILE_TABS.has(name)) {
    await tabBar.getByRole('link', { name, exact: true }).click();
    return;
  }
  await tabBar.getByRole('button', { name: 'More' }).click();
  await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'More' })).toBeHidden();
}

/** Switch the demo role from the user menu (development helper in the mock build). */
export async function switchRole(page: Page, role: 'Citizen' | 'Donor') {
  const chip = page.getByRole('button', { name: /open account menu/ }).filter({ visible: true });
  await chip.click();
  const menu = page.getByRole('dialog', { name: 'Account' });
  await menu.getByRole('radio', { name: role }).check();
  await expect(page.getByText(`Demo role: ${role}`)).toBeVisible();
  await expect(menu).toBeHidden();
  await expect(chip).toHaveAccessibleName(new RegExp(`, ${role} — open account menu$`));
}
