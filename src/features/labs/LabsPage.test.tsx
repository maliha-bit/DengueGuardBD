import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { labs } from '@/api/mock/seed';
import { renderApp } from '@/test/render';

const results = () => screen.findByRole('region', { name: 'Labs' });

describe('Lab search (/labs)', () => {
  it('shows the guideline note and lab cards with prices, hours and actions', async () => {
    renderApp('/labs');
    expect(
      screen.getByText(/NS1 is most useful in the first 1–5 days of fever/),
    ).toBeInTheDocument();
    const list = await results();
    expect(within(list).getAllByRole('article')).toHaveLength(labs.length);
    const first = within(list).getAllByRole('article')[0]!;
    expect(within(first).getByRole('table')).toHaveTextContent(/NS1/);
    expect(within(first).getByText(/as reported by the lab/)).toBeInTheDocument();
    expect(within(first).getByText(/^Updated/)).toBeInTheDocument();
    expect(within(first).getByText(/^Hours:/)).toBeInTheDocument();
    expect(within(first).getByRole('link', { name: /^Call/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^tel:/),
    );
    expect(within(first).getByRole('link', { name: /^Directions to/ })).toBeInTheDocument();
  });

  it('filters by district, test and home collection', async () => {
    const u = userEvent.setup();
    renderApp('/labs');
    await results();
    await u.selectOptions(screen.getByLabelText('District'), 'sylhet');
    let cards = within(await results()).getAllByRole('article');
    expect(cards.length).toBe(labs.filter((l) => l.districtId === 'sylhet').length);

    await u.selectOptions(screen.getByLabelText('District'), '');
    await u.selectOptions(screen.getByLabelText('Test'), 'igm_igg');
    cards = within(await results()).getAllByRole('article');
    expect(cards.length).toBe(labs.filter((l) => l.tests.some((t) => t.code === 'igm_igg')).length);

    await u.click(screen.getByRole('button', { name: 'Home sample collection' }));
    cards = within(await results()).getAllByRole('article');
    expect(cards.length).toBe(
      labs.filter((l) => l.homeCollection && l.tests.some((t) => t.code === 'igm_igg')).length,
    );
    for (const card of cards)
      expect(within(card).getAllByText('Home sample collection').length).toBeGreaterThan(0);
  });

  it('shows an empty state with Clear filters', async () => {
    const u = userEvent.setup();
    renderApp('/labs');
    await results();
    // Netrokona has no lab in the simulated data.
    await u.selectOptions(screen.getByLabelText('District'), 'netrokona');
    expect(await screen.findByText('No labs match')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(within(await results()).getAllByRole('article')).toHaveLength(labs.length);
  });

  it('switches between list and map views', async () => {
    const u = userEvent.setup();
    renderApp('/labs');
    await results();
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    await u.click(screen.getByRole('button', { name: 'Map' }));
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
    // Cards stay visible under the map.
    expect(within(await results()).getAllByRole('article')).toHaveLength(labs.length);
  });

  it('uses Bangla digits for prices and hours in বাংলা mode', async () => {
    const u = userEvent.setup();
    renderApp('/labs');
    await results();
    await u.click(screen.getByRole('button', { name: 'বাংলা' }));
    const list = await screen.findByRole('region', { name: 'ল্যাব' });
    const latin = (list.textContent ?? '').replace(/NS1|IgM\/IgG|CBC/g, '').match(/[0-9]/g);
    expect(latin).toBeNull();
  });

  it('shows Retry when labs fail to load', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    renderApp('/labs');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
