import { expect, openApp, test } from './helpers';

test('keyboard: skip link, dialog focus trap, Esc closes and focus returns', async ({ page }) => {
  await openApp(page);

  // First Tab stop is the skip link; it becomes visible and moves focus to the content.
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const box = await skip.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();

  // Open the account menu from the keyboard.
  const chip = page.getByRole('button', { name: /open account menu/ }).filter({ visible: true });
  await chip.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('dialog', { name: 'Account' });
  await expect(menu).toBeVisible();

  // Tab never leaves the dialog.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  // A visible focus ring is drawn on the focused element.
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? getComputedStyle(el).outlineStyle : 'none';
  });
  expect(outline).not.toBe('none');

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(chip).toBeFocused();
});
