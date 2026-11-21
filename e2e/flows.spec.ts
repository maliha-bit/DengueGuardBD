import { expect, expectNoHorizontalScroll, navigate, openApp, test } from './helpers';

test('lab search: filter by NS1 and a district, with the guideline note', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Labs');
  await expectNoHorizontalScroll(page);
  await expect(page.getByText(/NS1 is most useful in the first 1–5 days of fever/)).toBeVisible();

  const results = page.getByRole('region', { name: 'Labs' });
  await expect(results.getByRole('article')).toHaveCount(16);
  await page.getByLabel('Test').selectOption('ns1');
  await page.getByLabel('District').selectOption('sylhet');

  const cards = results.getByRole('article');
  await expect(cards).toHaveCount(1);
  await expect(results.getByText('1 lab', { exact: true })).toBeVisible();
  await expect(cards.first().getByRole('heading')).toContainText('Sylhet');
  await expect(cards.first().getByRole('table')).toContainText('NS1');
  await expect(cards.first().getByText(/as reported by the lab/)).toBeVisible();
});

test('booking: book a slot, see the serial, cancel it in My appointments', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Hospitals');
  await expectNoHorizontalScroll(page);
  await page.getByRole('link', { name: 'See doctors' }).first().click();
  await page
    .getByRole('button', { name: /Choose$/ })
    .first()
    .click();

  // First day that still has a free slot.
  const dateGroup = page.getByRole('group', { name: 'Date' });
  await expect(dateGroup).toBeVisible();
  const days = dateGroup.getByRole('button', { disabled: false });
  await expect(days.first()).toBeVisible();
  const freeSlot = page.getByRole('button', { name: /left$/, disabled: false });
  const count = await days.count();
  for (let i = 0; i < count; i++) {
    await days.nth(i).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('region', { name: /^Times on/ }).getByRole('status')).toHaveCount(
      0,
    );
    if ((await freeSlot.count()) > 0) break;
  }
  await freeSlot.first().click();

  const confirm = page.getByRole('dialog', { name: 'Confirm appointment' });
  const doctor = (await confirm.locator('dd').first().textContent())?.trim() ?? '';
  await expect(confirm.getByRole('button', { name: 'Confirm booking' })).toBeEnabled();
  await confirm.getByRole('button', { name: 'Confirm booking' }).click();

  const booked = page.getByRole('dialog', { name: 'Appointment booked' });
  await expect(booked).toBeVisible();
  const serial = (await booked.locator('p.rounded-2xl').textContent())?.trim() ?? '';
  expect(serial).toMatch(/^\d{2,}$/);

  await booked.getByRole('link', { name: 'My appointments' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My appointments' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const card = page
    .getByRole('tabpanel')
    .getByRole('listitem')
    .filter({ hasText: `Serial no. ${serial}` })
    .filter({ hasText: doctor });
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'Cancel' }).click();
  await page
    .getByRole('dialog', { name: 'Cancel this appointment?' })
    .getByRole('button', { name: 'Cancel appointment' })
    .click();
  await expect(page.getByText('Appointment cancelled. Your place was released.')).toBeVisible();
  await expect(card).toHaveCount(0);
});

test('symptom checker: a warning sign opens the Emergency sheet', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Symptom checker');
  await expectNoHorizontalScroll(page);
  await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByRole('radio', { name: '15 to 59 years' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: '1 to 2 days' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'None of these, next' }).click();
  await page.getByRole('checkbox', { name: 'Severe belly pain' }).check();
  await page.getByRole('button', { name: 'See result' }).click();

  const sheet = page.getByRole('dialog', { name: 'Emergency help' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('link', { name: /999/ })).toHaveAttribute('href', 'tel:999');
  await expect(sheet.getByRole('link', { name: /16263/ })).toHaveAttribute('href', 'tel:16263');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Go to emergency now' })).toBeVisible();
});

test('chatbot: "my gums are bleeding" shows the emergency card', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Chatbot');
  await expectNoHorizontalScroll(page);
  const input = page.getByRole('textbox', { name: 'Your question' });
  await input.fill('my gums are bleeding');
  await input.press('Enter');

  const log = page.getByRole('log', { name: 'Conversation' });
  await expect(log.getByRole('heading', { name: 'This may be an emergency' })).toBeVisible();
  await expect(log.getByRole('link', { name: /999/ })).toHaveAttribute('href', 'tel:999');
  await expect(log.getByText('DGHS guideline')).toHaveCount(0);
});

test('language: switching to Bangla changes the dashboard title', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dengue Risk Overview');
  await page.getByRole('button', { name: 'বাংলা' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ডেঙ্গু ঝুঁকির সারসংক্ষেপ');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
});
