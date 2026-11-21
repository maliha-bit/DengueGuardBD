import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, mockCommunityStore } from '@/api/mock/handlers';
import { currentUser } from '@/api/mock/seed';
import { toIsoDate } from '@/lib/format';
import { renderApp } from '@/test/render';

const FULL_PHONE = /01700001\d{3}/;

async function becomeDonor(lastDonationDate: string | null = null) {
  await mockApi.saveDonorProfile({
    bloodGroup: 'B+',
    donationType: 'platelets',
    districtId: 'dhaka',
    lastDonationDate,
    phone: '01711112222',
    shareAfterAccept: true,
  });
}

describe('Find a donor (/donors)', () => {
  it('lists donors with masked phones only', async () => {
    renderApp('/donors');
    const results = await screen.findByRole('region', { name: 'Donors' });
    const masked = within(results).getAllByTestId('masked-phone');
    expect(masked.length).toBeGreaterThan(10);
    for (const el of masked) expect(el.textContent).toMatch(/^01XXX-XXX-\d{3}$/);
    expect(document.body.textContent).not.toMatch(FULL_PHONE);
  });

  it('filters by blood group, type, district and availability', async () => {
    const u = userEvent.setup();
    renderApp('/donors');
    await screen.findByRole('region', { name: 'Donors' });
    await u.selectOptions(screen.getByLabelText('Blood group'), 'AB-');
    const cards = within(screen.getByRole('region', { name: 'Donors' })).getAllByRole('article');
    expect(cards.every((c) => c.getAttribute('aria-label')?.startsWith('Donor, AB-'))).toBe(true);

    await u.click(screen.getByRole('button', { name: 'Available now' }));
    await u.selectOptions(screen.getByLabelText('District'), 'barishal');
    expect(await screen.findByText('No donors match')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('region', { name: 'Donors' })).toBeInTheDocument();
  });

  it('guests must log in before requesting', async () => {
    window.history.replaceState(null, '', '/?as=guest');
    const u = userEvent.setup();
    renderApp('/donors');
    const results = await screen.findByRole('region', { name: 'Donors' });
    await u.click(within(results).getAllByRole('button', { name: 'Request' })[0]!);
    expect(
      await screen.findByRole('dialog', { name: 'Log in to send a request' }),
    ).toBeInTheDocument();
  });

  it('sends a request that appears in My requests as Sent, with the contact hidden', async () => {
    const u = userEvent.setup();
    renderApp('/donors');
    const results = await screen.findByRole('region', { name: 'Donors' });
    await u.click(within(results).getAllByRole('button', { name: 'Request' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: /^Request a .* donor$/ });

    // Validation first.
    await u.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(
      await within(dialog).findByText('Choose a hospital', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Enter a valid mobile number/)).toBeInTheDocument();

    const hospital = within(dialog).getByLabelText('Hospital') as HTMLSelectElement;
    await waitFor(() => expect(hospital.options.length).toBeGreaterThan(1));
    await u.selectOptions(hospital, hospital.options[1]!.value);
    await u.type(within(dialog).getByLabelText('Your contact number'), '01811223344');
    await u.click(within(dialog).getByRole('button', { name: 'Send request' }));
    const sentDialog = await screen.findByRole('dialog', { name: 'Request sent' });
    await u.click(within(sentDialog).getByRole('link', { name: 'My requests' }));
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(6);
    expect(within(cards[0]!).getAllByText('Sent').length).toBeGreaterThan(0);
    expect(within(cards[0]!).queryByTestId('donor-phone')).not.toBeInTheDocument();
  });
});

describe('Donors in Bangla', () => {
  it('shows masked phones and counts with Bangla digits', async () => {
    const u = userEvent.setup();
    renderApp('/donors');
    await screen.findByRole('region', { name: 'Donors' });
    await u.click(screen.getByRole('button', { name: 'বাংলা' }));
    const results = await screen.findByRole('region', { name: 'দাতা' });
    for (const el of within(results).getAllByTestId('masked-phone')) {
      expect(el.textContent).toMatch(/^০১XXX-XXX-[০-৯]{3}$/);
    }
    expect((screen.getByRole('main').textContent ?? '').match(/[0-9]/g)).toBeNull();
  });
});

describe('My requests (/donors/requests)', () => {
  it('shows the donor contact only after acceptance, and can mark it donated', async () => {
    const u = userEvent.setup();
    renderApp('/donors/requests');
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(5);
    // Contact visible on the accepted and the fulfilled request only.
    const phones = screen.getAllByTestId('donor-phone');
    expect(phones).toHaveLength(2);
    const hidden = cards.filter((c) => !within(c).queryByTestId('donor-phone'));
    expect(hidden).toHaveLength(3);
    for (const card of hidden) {
      expect(within(card).getByText(/^01XXX-XXX-\d{3}$/)).toBeInTheDocument();
    }

    const accepted = screen
      .getByRole('button', { name: 'Mark as donated' })
      .closest('article') as HTMLElement;
    expect(within(accepted).getByTestId('donor-phone')).toHaveTextContent('01700001000');
    expect(within(accepted).getByRole('link', { name: /Call/ })).toHaveAttribute(
      'href',
      'tel:01700001000',
    );
    await u.click(within(accepted).getByRole('button', { name: 'Mark as donated' }));
    expect(await screen.findByText('Marked as donated. Thank you!')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(accepted).getByRole('list', { name: 'Request status' })).toHaveTextContent(
        'Donated',
      ),
    );
  });

  it('shows the expired and declined states on the timeline', async () => {
    renderApp('/donors/requests');
    await screen.findAllByRole('article');
    const timelines = screen.getAllByRole('list', { name: 'Request status' });
    const text = timelines.map((t) => t.textContent ?? '').join('|');
    expect(text).toMatch(/Expired/);
    expect(text).toMatch(/Declined/);
  });
});

describe('Donor profile (/donor/profile)', () => {
  it('needs consent first, then becomes a donor and switches the demo role', async () => {
    const u = userEvent.setup();
    renderApp('/donor/profile');
    const cont = await screen.findByRole('button', { name: 'Continue' });
    expect(cont).toBeDisabled();
    await u.click(screen.getByRole('checkbox', { name: 'I agree' }));
    await u.click(cont);

    await u.selectOptions(screen.getByLabelText('Blood group'), 'A+');
    await u.selectOptions(screen.getByLabelText('District'), 'sylhet');
    await u.type(screen.getByLabelText('Mobile number'), '01911223344');
    expect(
      screen.getByRole('checkbox', { name: /Share my contact only after I accept/ }),
    ).toBeChecked();
    await u.click(screen.getByRole('button', { name: 'Become a donor' }));

    expect(await screen.findByText(/You're now registered as a donor/)).toBeInTheDocument();
    expect(currentUser.role).toBe('donor');
    expect(await screen.findByRole('switch', { name: 'Available to donate' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('turns availability off during the recovery period and shows the next date', async () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);
    await becomeDonor(toIsoDate(recent));
    renderApp('/donor/profile');
    const toggle = await screen.findByRole('switch', { name: 'Available to donate' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toBeDisabled();
    expect(screen.getAllByText(/^You can donate again on/).length).toBeGreaterThan(0);
  });
});

describe('Donor inbox (/donor/inbox)', () => {
  it('asks non-donors to become a donor', async () => {
    renderApp('/donor/inbox');
    expect(await screen.findByText("You're not a donor yet")).toBeInTheDocument();
  });

  it('accepting needs the eligibility check, then shows the requester contact', async () => {
    await becomeDonor();
    const u = userEvent.setup();
    renderApp('/donor/inbox');
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(screen.queryByTestId('requester-phone')).not.toBeInTheDocument();

    await u.click(within(cards[0]!).getByRole('button', { name: 'Accept' }));
    const dialog = await screen.findByRole('dialog', { name: 'Can you donate?' });
    const confirm = within(dialog).getByRole('button', { name: 'Accept request' });
    expect(confirm).toBeDisabled();
    await u.click(within(dialog).getByRole('checkbox'));
    await u.click(confirm);

    expect(await screen.findByTestId('requester-phone')).toHaveTextContent('01700008181');
    expect(screen.getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:01700008181');
  });

  it('reports misuse with a reason', async () => {
    await becomeDonor();
    const u = userEvent.setup();
    renderApp('/donor/inbox');
    const cards = await screen.findAllByRole('article');
    await u.click(within(cards[1]!).getByRole('button', { name: 'Report misuse' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report misuse' });
    await u.click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(within(dialog).getByText('Choose a reason')).toBeInTheDocument();
    await u.selectOptions(within(dialog).getByLabelText('Reason'), 'payment');
    await u.type(within(dialog).getByLabelText(/What happened/), 'Asked me for money');
    await u.click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText(/Your report was sent for review/)).toBeInTheDocument();
    expect(mockCommunityStore().misuse).toEqual([
      expect.objectContaining({ reason: 'payment', note: 'Asked me for money' }),
    ]);
  });
});
