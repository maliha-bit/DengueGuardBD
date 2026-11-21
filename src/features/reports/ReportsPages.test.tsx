import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';

function mockGeolocation() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((ok: PositionCallback) =>
        ok({ coords: { latitude: 23.75, longitude: 90.38 } } as GeolocationPosition),
      ),
    },
  });
}

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
});

const photoInput = () => screen.getByLabelText(/^Photo/) as HTMLInputElement;

describe('Report a breeding site (/reports/new)', () => {
  it('asks guests to log in', () => {
    window.history.replaceState(null, '', '/?as=guest');
    renderApp('/reports/new');
    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });

  it('needs a location before it can be submitted', async () => {
    const u = userEvent.setup();
    renderApp('/reports/new');
    await u.type(screen.getByLabelText('Area or road name'), 'Road 12, Mirpur');
    await u.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(
      await screen.findByText('Choose the location on the map or use your location'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Report sent')).not.toBeInTheDocument();
  });

  it('validates the photo type and size', async () => {
    const u = userEvent.setup({ applyAccept: false });
    renderApp('/reports/new');
    await u.upload(photoInput(), new File(['gif'], 'site.gif', { type: 'image/gif' }));
    expect(await screen.findByText('Choose a JPG or PNG photo')).toBeInTheDocument();

    const big = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    await u.upload(photoInput(), big);
    expect(await screen.findByText(/larger than 5 MB/)).toBeInTheDocument();

    await u.upload(photoInput(), new File(['png'], 'ok.png', { type: 'image/png' }));
    expect(await screen.findByRole('img', { name: 'Photo preview' })).toBeInTheDocument();
    expect(screen.getByText('JPG or PNG, up to 5 MB')).toBeInTheDocument();
  });

  it('submits with "Use my location" and shows a reference number, then lists it', async () => {
    mockGeolocation();
    const u = userEvent.setup();
    renderApp('/reports/new');
    await u.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/^Pin at 23\.75/)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Area or road name'), 'Road 12, Mirpur');
    await u.click(screen.getByRole('radio', { name: 'Old tyres' }));
    await u.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(await screen.findByRole('heading', { name: 'Report sent' })).toBeInTheDocument();
    expect(screen.getByTestId('report-reference')).toHaveTextContent(/^BR-\d{4}-\d{6}$/);

    await u.click(screen.getAllByRole('link', { name: /My reports/ })[0]!);
    const card = await screen.findByRole('article', { name: 'Road 12, Mirpur' });
    expect(within(card).getByText('Old tyres')).toBeInTheDocument();
    expect(within(card).getByRole('list', { name: 'Report status' })).toHaveTextContent(
      'Submitted',
    );
  });
});

describe('My reports (/reports)', () => {
  it('shows reports with status timelines', async () => {
    renderApp('/reports');
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByRole('list', { name: 'Report status' })).toHaveTextContent(
      'Under review',
    );
    expect(within(cards[1]!).getByRole('list', { name: 'Report status' })).toHaveTextContent(
      'Action taken',
    );
  });

  it('shows an empty state with a "Report a site" button', async () => {
    window.history.replaceState(null, '', '/?mock=empty');
    renderApp('/reports');
    expect(await screen.findByText('No reports yet')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Report a site/ })[0]).toHaveAttribute(
      'href',
      '/reports/new',
    );
  });

  it('is linked from the dashboard quick actions', () => {
    renderApp('/');
    const actions = screen.getByRole('region', { name: 'Quick actions' });
    expect(within(actions).getByRole('link', { name: /Report breeding site/ })).toHaveAttribute(
      'href',
      '/reports/new',
    );
    expect(within(actions).getByRole('link', { name: /Request blood donor/ })).toHaveAttribute(
      'href',
      '/donors',
    );
    expect(within(actions).getByRole('link', { name: /Find lab/ })).toHaveAttribute(
      'href',
      '/labs',
    );
  });
});
