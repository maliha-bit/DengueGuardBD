import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockBookingStore } from '@/api/mock/handlers';
import { makeSlotId } from '@/api/mock/bookingStore';
import { toIsoDate } from '@/lib/format';
import { renderApp } from '@/test/render';

/** Next date (from tomorrow) that is not a Friday — Dr. Farhana works Sat–Thu. */
function nextWorkingDay(): Date {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  if (day.getDay() === 5) day.setDate(day.getDate() + 1);
  return day;
}

describe('Hospital search (/hospitals)', () => {
  it('reads ?division= from the URL and lists cards with beds, freshness and actions', async () => {
    renderApp('/hospitals?division=dhaka');
    expect(screen.getByRole('heading', { level: 1, name: 'Hospitals' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Hospitals' });
    expect(screen.getByLabelText('Division')).toHaveValue('dhaka');

    const card = within(list)
      .getByRole('heading', { name: 'Dhaka Care Hospital' })
      .closest('article')!;
    expect(within(card as HTMLElement).getByText('Private')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('General beds')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('ICU beds')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText(/^Updated /)).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByRole('link', { name: /Call Dhaka Care Hospital/ }),
    ).toHaveAttribute('href', expect.stringMatching(/^tel:\+880/));
    expect(
      within(card as HTMLElement).getByRole('link', { name: /Directions to Dhaka Care Hospital/ }),
    ).toHaveAttribute('href', expect.stringContaining('https://www.google.com/maps/dir/?api=1'));
    expect(within(card as HTMLElement).getByRole('link', { name: /See doctors/ })).toHaveAttribute(
      'href',
      '/hospitals/h-dhaka-1',
    );
  });

  it('marks bed data older than 6 hours as possibly out of date', async () => {
    renderApp('/hospitals?division=rangpur&district=kurigram');
    const list = await screen.findByRole('list', { name: 'Hospitals' });
    expect(within(list).getByText('Possibly out of date')).toBeInTheDocument();
  });

  it('shows "No beds free in this district" with nearby hospitals', async () => {
    renderApp('/hospitals?division=dhaka&district=gazipur');
    expect(await screen.findByText('No beds free in this district')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Nearby districts with free beds' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/km away/).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'In Gazipur' })).toBeInTheDocument();
  });

  it('filters by ICU beds and by name, with an empty state that clears filters', async () => {
    renderApp('/hospitals');
    const list = await screen.findByRole('list', { name: 'Hospitals' });
    const before = within(list).getAllByRole('listitem').length;
    await userEvent.click(screen.getByRole('button', { name: 'Has ICU beds' }));
    expect(screen.getByRole('button', { name: 'Has ICU beds' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(screen.getByRole('list', { name: 'Hospitals' })).getAllByRole('listitem').length,
    ).toBeLessThan(before);

    await userEvent.type(screen.getByLabelText('Search by hospital name'), 'zzz');
    expect(await screen.findByText('No hospitals match')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByRole('list', { name: 'Hospitals' })).toBeInTheDocument();
  });

  it('shows an error with Retry', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    renderApp('/hospitals');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Hospital detail and booking (/hospitals/:id)', () => {
  async function openDoctorDay(path = '/hospitals/h-dhaka-1') {
    renderApp(path);
    await userEvent.click(await screen.findByRole('button', { name: /Dr\. Farhana Akter/ }));
    const day = nextWorkingDay();
    const dateButtons = screen
      .getAllByRole('button', { pressed: false })
      .filter((b) => b.textContent?.includes(String(day.getDate())));
    const pill = dateButtons.find(
      (b) => !b.hasAttribute('disabled') && b.className.includes('min-h-16'),
    );
    await userEvent.click(pill!);
    return day;
  }

  it('lists doctors with specialty and available days', async () => {
    renderApp('/hospitals/h-dhaka-1');
    const doctor = await screen.findByRole('button', { name: /Dr\. Farhana Akter/ });
    expect(doctor).toHaveTextContent('Medicine');
    expect(doctor).toHaveTextContent(/Available: Sat, Sun, Mon, Tue, Wed, Thu/);
  });

  it('labels full slots "Full" and disables them', async () => {
    const day = nextWorkingDay();
    mockBookingStore().fillSlot(makeSlotId('d-h-dhaka-1-1', toIsoDate(day), '18:00'));
    await openDoctorDay();
    const full = await screen.findByRole('button', { name: /18:00.*Full/ });
    expect(full).toBeDisabled();
  });

  it('books a slot: confirm with prefilled patient name, then success with serial number', async () => {
    await openDoctorDay();
    const slot = (await screen.findAllByRole('button', { name: /left$/ })).find(
      (b) => !b.hasAttribute('disabled'),
    )!;
    expect(slot).toHaveTextContent(/\d+ of 10 left/);
    await userEvent.click(slot);

    const confirm = await screen.findByRole('dialog', { name: 'Confirm appointment' });
    expect(within(confirm).getByText('Dhaka Care Hospital')).toBeInTheDocument();
    expect(within(confirm).getByLabelText('Patient name')).toHaveValue('Ayesha Rahman');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Confirm booking' }));

    const success = await screen.findByRole('dialog', { name: 'Appointment booked' });
    expect(within(success).getByText('Serial no.')).toBeInTheDocument();
    expect(within(success).getByRole('button', { name: 'Add to calendar' })).toBeInTheDocument();
    expect(within(success).getByRole('link', { name: 'My appointments' })).toHaveAttribute(
      'href',
      '/appointments',
    );
  });

  it('guests log in first and come back to the same slot', async () => {
    window.history.replaceState(null, '', '/?as=guest');
    await openDoctorDay();
    const slot = (await screen.findAllByRole('button', { name: /left$/ })).find(
      (b) => !b.hasAttribute('disabled'),
    )!;
    const time = slot.textContent?.match(/\d{1,2}:\d{2}/)?.[0];
    expect(time).toBeTruthy();
    await userEvent.click(slot);
    const prompt = await screen.findByRole('dialog', { name: 'Log in to book' });
    await userEvent.click(within(prompt).getByRole('button', { name: 'Log in (demo)' }));
    const confirm = await screen.findByRole('dialog', { name: 'Confirm appointment' });
    expect(within(confirm).getByText(time!)).toBeInTheDocument();
  });

  it('shows "This slot just filled up" when someone else takes the last place', async () => {
    window.history.replaceState(null, '', '/?mock=race');
    await openDoctorDay();
    const slot = (await screen.findAllByRole('button', { name: /left$/ })).find(
      (b) => !b.hasAttribute('disabled'),
    )!;
    await userEvent.click(slot);
    const confirm = await screen.findByRole('dialog', { name: 'Confirm appointment' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Confirm booking' }));
    expect(await within(confirm).findByText(/This slot just filled up/)).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Choose another time' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks booking a second appointment at the same time', async () => {
    const day = await openDoctorDay();
    const slot = (await screen.findAllByRole('button', { name: /left$/ })).find(
      (b) => !b.hasAttribute('disabled'),
    )!;
    const [hh = '09', mm = '00'] = (slot.textContent?.match(/(\d{1,2}):(\d{2})/) ?? []).slice(1);
    // Meanwhile the user books another Dhaka doctor at exactly the same time. Seeded demand
    // depends on the date, so pick a doctor whose slot at that time still has room.
    const store = mockBookingStore();
    const time = `${hh.padStart(2, '0')}:${mm}`;
    const otherSlotId = ['d-h-dhaka-4-1', 'd-h-dhaka-2-1', 'd-h-dhaka-3-1', 'd-h-dhaka-5-1']
      .map((doctorId) => makeSlotId(doctorId, toIsoDate(day), time))
      .find((slotId) => {
        try {
          const other = store.getSlot(slotId);
          return other.booked < other.capacity;
        } catch {
          return false; // doctor not working that day
        }
      });
    expect(otherSlotId).toBeDefined();
    store.book({
      userId: 'u-demo-1',
      slotId: otherSlotId!,
      patientName: 'Ayesha Rahman',
      now: new Date(),
    });
    await userEvent.click(slot);
    const confirm = await screen.findByRole('dialog', { name: 'Confirm appointment' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Confirm booking' }));
    expect(
      await within(confirm).findByText('You already have an appointment at this time.'),
    ).toBeInTheDocument();
  });
});
