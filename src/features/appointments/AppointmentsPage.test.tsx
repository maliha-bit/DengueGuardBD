import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('My appointments (/appointments)', () => {
  it('asks guests to log in', async () => {
    window.history.replaceState(null, '', '/?as=guest');
    renderApp('/appointments');
    expect(screen.getByText('Please log in')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Log in (demo)' }));
    expect(await screen.findByRole('tab', { name: /Upcoming/ })).toBeInTheDocument();
  });

  it('shows upcoming and past tabs with status badges', async () => {
    renderApp('/appointments');
    const upcomingTab = await screen.findByRole('tab', { name: /Upcoming/ });
    expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(await within(panel).findByText('Dr. Farhana Akter')).toBeInTheDocument();
    expect(within(panel).getByText('Booked')).toBeInTheDocument();
    expect(within(panel).getByText('Serial no. 07')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Past/ }));
    const past = screen.getByRole('tabpanel');
    expect(within(past).getByText('Completed')).toBeInTheDocument();
    expect(within(past).getByText('Cancelled')).toBeInTheDocument();
    expect(within(past).getByText('Missed')).toBeInTheDocument();
  });

  it('cancels after confirmation, moves it to Past and updates the dashboard card', async () => {
    renderApp('/appointments');
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this appointment?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel appointment' }));
    expect(
      await screen.findByText('Appointment cancelled. Your place was released.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Find a hospital/ })).toHaveAttribute(
      'href',
      '/hospitals',
    );

    await userEvent.click(screen.getByRole('tab', { name: /Past/ }));
    await waitFor(() =>
      expect(within(screen.getByRole('tabpanel')).getAllByText('Cancelled')).toHaveLength(2),
    );
  });

  it('reschedules to a new slot of the same doctor', async () => {
    renderApp('/appointments');
    await userEvent.click(await screen.findByRole('button', { name: 'Reschedule' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reschedule appointment' });
    expect(within(dialog).getByText(/^Current:/)).toBeInTheDocument();

    // Pick the first free slot on the first day that has one.
    const days = within(dialog)
      .getAllByRole('button')
      .filter((b) => b.className.includes('min-h-16') && !b.hasAttribute('disabled'));
    let picked = false;
    for (const day of days) {
      await userEvent.click(day);
      const free = within(dialog)
        .queryAllByRole('button', { name: /left$/ })
        .filter((b) => !b.hasAttribute('disabled'));
      const first = free[0];
      if (first) {
        await userEvent.click(first);
        picked = true;
        break;
      }
    }
    expect(picked).toBe(true);
    await userEvent.click(within(dialog).getByRole('button', { name: /^Move to/ }));
    expect(await screen.findByText(/Appointment moved to/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an error with Retry', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    renderApp('/appointments');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
