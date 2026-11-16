import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('Dashboard (/)', () => {
  it('opens directly on the dashboard inside the app shell', async () => {
    renderApp('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dengue Risk Overview' }),
    ).toBeInTheDocument();
    expect(screen.getByText('7-day forecast for your division')).toBeInTheDocument();

    // Sidebar + bottom nav both expose the main navigation.
    const navs = screen.getAllByRole('navigation', { name: 'Main navigation' });
    expect(navs.length).toBeGreaterThanOrEqual(2);
    expect(within(navs[0]!).getByRole('link', { name: /Dashboard/ })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // No link to the dev UI kit anywhere.
    expect(screen.queryByRole('link', { name: /UI kit/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/dev/ui"]')).toBeNull();
  });

  it('loads every card from the mock API', async () => {
    renderApp('/');
    for (const title of [
      'Division risk today',
      'Beds near you',
      'Next appointment',
      '7-day outlook',
      'Forecast cases',
      'Prevention tip of the day',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(await screen.findByText(/general beds in Dhaka/)).toBeInTheDocument();
    expect(await screen.findByText('Dr. Farhana Akter')).toBeInTheDocument();
    expect(await screen.findByText('Divisions rising', { exact: false })).toBeInTheDocument();
    expect(
      await screen.findByRole('table', { name: /Risk level for each division/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Check symptoms/ })).toHaveAttribute(
      'href',
      '/symptom-checker',
    );
    expect(screen.getByText('Not a diagnosis. Follow DGHS guidance.')).toBeInTheDocument();
  });

  it('switches every label to Bangla with Bangla digits, without reload', async () => {
    renderApp('/');
    await screen.findByText(/general beds in Dhaka/);

    await userEvent.click(screen.getByRole('button', { name: 'বাংলা' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'ডেঙ্গু ঝুঁকির সারসংক্ষেপ' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'কাছের শয্যা' })).toBeInTheDocument();
    expect(screen.getByText('ডা. ফারহানা আক্তার')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('bn');

    const main = screen.getByRole('main');
    // Big numbers use Bangla digits and no Latin digits remain in the dashboard body.
    expect(within(main).getAllByText(/^[০-৯,]+$/).length).toBeGreaterThan(3);
    const latinDigits = (main.textContent ?? '').replace(/DGHS|NS1|CBC|O\+/g, '').match(/[0-9]/g);
    expect(latinDigits).toBeNull();
  });

  it('updates the beds card when the division changes', async () => {
    renderApp('/');
    await screen.findByText(/general beds in Dhaka/);
    await userEvent.selectOptions(screen.getByLabelText('Division'), 'sylhet');
    expect(await screen.findByText(/general beds in Sylhet/)).toBeInTheDocument();
  });

  it('shows an error with Retry on every card when the API fails', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    renderApp('/');
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThanOrEqual(6);
    });
  });

  it('shows empty states when there is no data', async () => {
    window.history.replaceState(null, '', '/?mock=empty');
    renderApp('/');
    for (const text of [
      'No forecast yet',
      'No bed data',
      'No upcoming appointment',
      'No outlook yet',
      'No case data',
      'No tip today',
    ]) {
      expect(await screen.findByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: /Book appointment/ })).toHaveAttribute(
      'href',
      '/appointments',
    );
  });
});

describe('Placeholder routes', () => {
  it.each([
    ['/hospitals', 'Hospitals'],
    ['/appointments', 'Appointments'],
    ['/symptom-checker', 'Symptom checker'],
    ['/home-care', 'Home care'],
    ['/chatbot', 'Chatbot'],
    ['/donors', 'Donors'],
    ['/labs', 'Labs'],
    ['/report', 'Report breeding site'],
    ['/profile', 'Profile'],
  ])('%s renders inside the shell', (path, title) => {
    renderApp(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText('Coming in a later phase')).toBeInTheDocument();
  });

  it('medical pages show the non-diagnostic notice', () => {
    renderApp('/symptom-checker');
    expect(screen.getByText('Follows DGHS/WHO guidance. Not a diagnosis.')).toBeInTheDocument();
  });

  it('unknown paths show the not-found page', () => {
    renderApp('/nope');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
