import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { GUEST_CHECKLIST_KEY } from './useChecklist';

const checklist = async () =>
  (await screen.findByRole('heading', { name: 'Prevention checklist' })).closest(
    'section',
  ) as HTMLElement;

describe('Home care guide (/home-care)', () => {
  it('shows every section with source and review date, and a red NSAID warning', async () => {
    renderApp('/home-care');
    for (const title of [
      'Hydration',
      'Fever relief',
      'Medicines to avoid',
      'Warning signs: go to hospital',
      'Recovery signs',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByText('Source: DGHS / WHO')).toHaveLength(5);
    expect(screen.getAllByText(/^Reviewed on/)).toHaveLength(5);
    const avoid = screen.getByRole('heading', { name: 'Medicines to avoid' }).closest('section')!;
    expect(within(avoid).getByText('Ibuprofen')).toBeInTheDocument();
    expect(within(avoid).getByText('Aspirin')).toBeInTheDocument();
    expect(within(avoid).getByText('Do not take')).toBeInTheDocument();
    expect(screen.getByText('Follows DGHS/WHO guidance. Not a diagnosis.')).toBeInTheDocument();
  });

  it('saves guest ticks on the device and restores them', async () => {
    window.history.replaceState(null, '', '/?as=guest');
    const u = userEvent.setup();
    const first = renderApp('/home-care');
    const list = await checklist();
    await u.click(within(list).getByRole('checkbox', { name: /Remove standing water/ }));
    expect(within(list).getByText('1 of 8 done')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(GUEST_CHECKLIST_KEY) ?? '[]')).toEqual([
      'standingWater',
    ]);
    expect(within(list).getByText(/saved on this device/)).toBeInTheDocument();

    first.unmount();
    renderApp('/home-care');
    expect(
      within(await checklist()).getByRole('checkbox', { name: /Remove standing water/ }),
    ).toBeChecked();
  });

  it("saves a logged-in user's ticks to their account", async () => {
    const u = userEvent.setup();
    const first = renderApp('/home-care');
    const list = await checklist();
    const box = await within(list).findByRole('checkbox', { name: /Use mosquito repellent/ });
    await u.click(box);
    expect(box).toBeChecked();
    expect(within(list).getByText(/saved to your account/)).toBeInTheDocument();
    expect(localStorage.getItem(GUEST_CHECKLIST_KEY)).toBeNull();

    // A fresh app (new query cache) loads the ticks back from the account.
    first.unmount();
    renderApp('/home-care');
    expect(
      await within(await checklist()).findByRole('checkbox', {
        name: /Use mosquito repellent/,
        checked: true,
      }),
    ).toBeInTheDocument();
  });

  it('shows Retry when the account checklist fails to load', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    renderApp('/home-care');
    expect(await within(await checklist()).findByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
