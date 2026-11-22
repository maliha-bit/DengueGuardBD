import type { Page } from '@playwright/test';
import { expect, navigate, openApp, switchRole, test } from './helpers';

const WIDTHS = [360, 768, 1440] as const;

/**
 * Elements that stick out past the right edge of the viewport (ignoring content inside
 * scroll containers and the map), plus the page's horizontal overflow.
 */
async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders: string[] = [];
    const scrolls = (el: Element | null): boolean => {
      for (let node = el?.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (
          /(auto|scroll|hidden)/.test(style.overflowX) ||
          node.classList.contains('leaflet-container')
        )
          return true;
      }
      return false;
    };
    document.querySelectorAll('main *, aside *, nav *, header *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.right > vw + 1 && !scrolls(el)) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(rect.right)}px`,
        );
      }
    });
    return {
      pageOverflow: document.documentElement.scrollWidth - vw,
      offenders: offenders.slice(0, 8),
    };
  });
}

async function check(page: Page, label: string) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading…' })).toHaveCount(0, { timeout: 10_000 });
  const report = await overflowReport(page);
  expect({ label, ...report }).toEqual({ label, pageOverflow: 0, offenders: [] });
}

const CITIZEN = [
  '/',
  '/risk',
  '/hospitals',
  '/hospitals/h-dhaka-1',
  '/appointments',
  '/symptoms',
  '/home-care',
  '/fever-log',
  '/chatbot',
  '/donors',
  '/donors/requests',
  '/donor/profile',
  '/labs',
  '/reports',
  '/reports/new',
  '/offline',
  '/profile',
];

test.describe('responsive layout', () => {
  test.skip(({ isMobile }) => isMobile, 'Widths are set explicitly; run once.');

  for (const width of WIDTHS) {
    test(`citizen pages at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      for (const path of CITIZEN) {
        await openApp(page, path);
        await check(page, `${path} @${width}`);
      }
    });

    test(`staff portals at ${width}px`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await openApp(page);
      const portals: Array<[Parameters<typeof switchRole>[1], string[]]> = [
        [
          'Hospital staff',
          [
            'Overview',
            'Beds',
            'Doctors',
            "Today's appointments",
            'Weekly schedule',
            'Slot generator',
          ],
        ],
        ['Lab staff', ['Lab listing']],
        ['Health authority', ['Overview', 'Breeding reports', 'Prevention tasks']],
        [
          'Administrator',
          ['Approvals', 'Directories', 'Analytics', 'Audit trail', 'Knowledge sources', 'Forecast'],
        ],
      ];
      for (const [account, items] of portals) {
        await switchRole(page, account);
        for (const item of items) {
          await navigate(page, item);
          await check(page, `${account} › ${item} @${width}`);
        }
      }
    });
  }

  test('desktop sidebar shows the whole nav list under the logo', async ({ page }) => {
    for (const height of [900, 640]) {
      await page.setViewportSize({ width: 1440, height });
      await openApp(page);
      const nav = page.locator('aside').getByRole('navigation', { name: 'Main navigation' });
      const box = await nav.boundingBox();
      // At least a few items are visible (not a collapsed bar), and every item is reachable.
      expect(box?.height ?? 0).toBeGreaterThan(200);
      const links = nav.getByRole('link');
      const count = await links.count();
      expect(count).toBe(12);
      for (let i = 0; i < count; i++) {
        // At normal desktop heights every item is visible without scrolling.
        if (height >= 900) await expect(links.nth(i)).toBeInViewport({ ratio: 1 });
        await links.nth(i).scrollIntoViewIfNeeded();
        await expect(links.nth(i)).toBeInViewport();
      }
    }
  });
});
