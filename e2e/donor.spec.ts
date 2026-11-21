import { expect, expectNoHorizontalScroll, navigate, openApp, switchRole, test } from './helpers';

// AB− donors in Bhola: none in the simulated seed, so the new donor is the only match.
const DONOR_PHONE = '01911223344';
const REQUESTER_PHONE = '01811223344';

test('donor flow: register, request as a citizen, accept as the donor', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Donors');
  await expectNoHorizontalScroll(page);
  const donorTabs = page.getByRole('navigation', { name: 'Donor pages' });

  // 1. Become a donor: consent first, then the form.
  await donorTabs.getByRole('link', { name: 'Donor profile' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Donor profile' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const proceed = page.getByRole('button', { name: 'Continue' });
  await expect(proceed).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I agree' }).check();
  await proceed.click();
  await page.getByLabel('Blood group').selectOption('AB-');
  await page.getByLabel('District').selectOption('bhola');
  await page.getByLabel('Mobile number').fill(DONOR_PHONE);
  await page.getByRole('button', { name: 'Become a donor' }).click();
  await expect(page.getByText(/You're now registered as a donor/)).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Available to donate' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // 2. As a citizen, find that donor: only a masked phone is shown.
  await switchRole(page, 'Citizen');
  await donorTabs.getByRole('link', { name: 'Find donors' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Donors' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByLabel('Blood group').selectOption('AB-');
  await page.getByLabel('District').selectOption('bhola');
  const results = page.getByRole('region', { name: 'Donors' });
  const card = results.getByRole('article');
  await expect(card).toHaveCount(1);
  await expect(card.getByTestId('masked-phone')).toHaveText('01XXX-XXX-344');
  await expect(page.getByText(DONOR_PHONE)).toHaveCount(0);

  // 3. Send a request.
  await card.getByRole('button', { name: 'Request' }).click();
  const form = page.getByRole('dialog', { name: 'Request a AB- donor' });
  const hospital = form.getByLabel('Hospital');
  await expect(hospital.locator('option')).not.toHaveCount(1);
  await hospital.selectOption({ index: 1 });
  await form.getByLabel('Your contact number').fill(REQUESTER_PHONE);
  await form.getByRole('button', { name: 'Send request' }).click();
  const sent = page.getByRole('dialog', { name: 'Request sent' });
  await expect(sent).toBeVisible();
  await sent.getByRole('button', { name: 'Done' }).click();

  // The donor's contact stays masked in My requests until they accept.
  await donorTabs.getByRole('link', { name: 'My requests' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My requests' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const myRequest = page.getByRole('article', { name: 'Request for AB- blood' });
  await expect(myRequest).toBeVisible();
  await expect(myRequest.getByText('01XXX-XXX-344')).toBeVisible();
  await expect(myRequest.getByText(/contact appears here once they accept/)).toBeVisible();
  await expect(page.getByText(DONOR_PHONE)).toHaveCount(0);

  // 4. As the donor, the requester's contact is hidden until accepting.
  await switchRole(page, 'Donor');
  await donorTabs.getByRole('link', { name: 'Donor inbox' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Donor inbox' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const incoming = page.getByRole('article', { name: /^Request for AB- at / });
  await expect(incoming).toBeVisible();
  await expect(page.getByText(REQUESTER_PHONE)).toHaveCount(0);
  await incoming.getByRole('button', { name: 'Accept' }).click();
  const check = page.getByRole('dialog', { name: 'Can you donate?' });
  const confirm = check.getByRole('button', { name: 'Accept request' });
  await expect(confirm).toBeDisabled();
  await check.getByRole('checkbox').check();
  await confirm.click();
  await expect(incoming.getByTestId('requester-phone')).toHaveText(REQUESTER_PHONE);
  await expect(incoming.getByRole('link', { name: /Call/ })).toHaveAttribute(
    'href',
    `tel:${REQUESTER_PHONE}`,
  );

  // 5. Back as the citizen, the donor's contact is now visible.
  await switchRole(page, 'Citizen');
  await donorTabs.getByRole('link', { name: 'My requests' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My requests' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expect(myRequest.getByTestId('donor-phone')).toHaveText(DONOR_PHONE);
  await expect(myRequest.getByRole('list', { name: 'Request status' })).toContainText('Accepted');
});
