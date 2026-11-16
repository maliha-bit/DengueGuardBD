import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setDesktop } from '@/test/media';
import { renderApp } from '@/test/render';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Risk map (/risk)', () => {
  it('shows a labelled marker per division and a legend with text', async () => {
    renderApp('/risk');
    expect(screen.getByRole('heading', { level: 1, name: 'Risk map' })).toBeInTheDocument();
    // First test pays for loading the lazy Leaflet chunk.
    expect(await screen.findByTitle('Dhaka: High risk', {}, { timeout: 8000 })).toBeInTheDocument();
    for (const name of [
      'Chattogram',
      'Khulna',
      'Rajshahi',
      'Barishal',
      'Sylhet',
      'Rangpur',
      'Mymensingh',
    ]) {
      expect(screen.getByTitle(new RegExp(`^${name}: `))).toBeInTheDocument();
    }
    const legend = screen.getByRole('region', { name: 'Risk level' });
    expect(within(legend).getByText('Low risk')).toBeInTheDocument();
    expect(within(legend).getByText('Medium risk')).toBeInTheDocument();
    expect(within(legend).getByText('High risk')).toBeInTheDocument();
  });

  it('opens the detail sheet when a division marker is clicked (mobile)', async () => {
    renderApp('/risk');
    await userEvent.click(await screen.findByTitle('Dhaka: High risk'));
    const sheet = await screen.findByRole('dialog', { name: 'Dhaka' });
    expect(within(sheet).getByText('High risk')).toBeInTheDocument();
    expect(within(sheet).getByText('Rising')).toBeInTheDocument();
    expect(within(sheet).getByRole('heading', { name: '7-day outlook' })).toBeInTheDocument();
    expect(within(sheet).getAllByRole('listitem').length).toBeGreaterThanOrEqual(7);
    expect(await within(sheet).findByText('Rainfall (7 days)')).toBeInTheDocument();
    expect(within(sheet).getByText('Humidity')).toBeInTheDocument();
    expect(within(sheet).getByText('Temperature')).toBeInTheDocument();
    expect(within(sheet).getByText('Sunshine')).toBeInTheDocument();
    expect(within(sheet).getByText(/Forecast updated/)).toBeInTheDocument();
    expect(within(sheet).queryByText('Out of date')).not.toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: /Find hospitals here/ })).toHaveAttribute(
      'href',
      '/hospitals?division=dhaka',
    );
  });

  it('opens the side panel on desktop', async () => {
    setDesktop(true);
    renderApp('/risk');
    const panel = await screen.findByRole('complementary', { name: 'Division details' });
    expect(within(panel).getByText('Select a division')).toBeInTheDocument();
    await userEvent.click(await screen.findByTitle(/^Sylhet: /));
    expect(await within(panel).findByRole('heading', { name: 'Sylhet' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('list view sorts divisions by risk and opens the same panel', async () => {
    renderApp('/risk');
    await screen.findByTitle('Dhaka: High risk');
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    const list = screen.getByRole('list', { name: /Divisions sorted by risk/ });
    const names = within(list)
      .getAllByRole('button')
      .map((button) => button.querySelector('span span')?.textContent);
    expect(names[0]).toBe('Dhaka');
    expect(names[names.length - 1]).toBe('Rangpur');
    await userEvent.click(within(list).getByRole('button', { name: /Khulna/ }));
    expect(await screen.findByRole('dialog', { name: 'Khulna' })).toBeInTheDocument();
  });

  it('switches to the list with a notice when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderApp('/risk');
    expect(await screen.findByText(/You're offline/)).toBeInTheDocument();
    expect(
      await screen.findByRole('list', { name: /Divisions sorted by risk/ }),
    ).toBeInTheDocument();
  });

  it('marks a forecast older than 1 day as out of date', async () => {
    window.history.replaceState(null, '', '/?mock=stale');
    renderApp('/risk?division=dhaka');
    const sheet = await screen.findByRole('dialog', { name: 'Dhaka' });
    expect(within(sheet).getByText('Out of date')).toBeInTheDocument();
  });

  it('shows an error with Retry when the forecast fails', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    renderApp('/risk');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows an empty state when there is no forecast', async () => {
    window.history.replaceState(null, '', '/?mock=empty');
    renderApp('/risk');
    expect(await screen.findByText('No forecast yet')).toBeInTheDocument();
  });

  it('guests get a login prompt before alerts are turned on', async () => {
    window.history.replaceState(null, '', '/?as=guest');
    renderApp('/risk?division=dhaka');
    const sheet = await screen.findByRole('dialog', { name: 'Dhaka' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Turn on alerts' }));
    const prompt = await screen.findByRole('dialog', { name: 'Log in to get alerts' });
    await userEvent.click(within(prompt).getByRole('button', { name: 'Log in (demo)' }));
    expect(await screen.findByText('Alerts turned on for Dhaka.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Alerts on' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('logged-in users turn alerts on directly', async () => {
    renderApp('/risk?division=sylhet');
    const sheet = await screen.findByRole('dialog', { name: 'Sylhet' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Turn on alerts' }));
    expect(screen.queryByRole('dialog', { name: 'Log in to get alerts' })).not.toBeInTheDocument();
    expect(await screen.findByText('Alerts turned on for Sylhet.')).toBeInTheDocument();
  });

  it('shows Bangla labels and digits', async () => {
    renderApp('/risk?division=dhaka');
    await screen.findByRole('dialog', { name: 'Dhaka' });
    await userEvent.click(screen.getByRole('button', { name: 'বাংলা' }));
    const sheet = await screen.findByRole('dialog', { name: 'ঢাকা' });
    expect(within(sheet).getByText('উচ্চ ঝুঁকি')).toBeInTheDocument();
    expect(within(sheet).getByText(/আজ পূর্বাভাসিত রোগী [০-৯]+ জন/)).toBeInTheDocument();
  });
});

describe('links to the risk map', () => {
  it('/risk-map redirects to /risk', async () => {
    renderApp('/risk-map');
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk map' })).toBeInTheDocument();
  });

  it('sidebar item and dashboard outlook card point to /risk', () => {
    renderApp('/');
    const nav = screen.getAllByRole('navigation', { name: 'Main navigation' })[0]!;
    expect(within(nav).getByRole('link', { name: 'Risk map' })).toHaveAttribute('href', '/risk');
    expect(screen.getAllByRole('link', { name: 'Open risk map' })[0]).toHaveAttribute(
      'href',
      '/risk',
    );
  });
});
