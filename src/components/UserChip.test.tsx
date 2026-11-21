import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { currentUser } from '@/api/mock/seed';
import { setDesktop } from '@/test/media';
import { renderApp } from '@/test/render';

describe('User menu: demo role switcher', () => {
  it('switches between the citizen and donor demo accounts', async () => {
    setDesktop(true);
    const u = userEvent.setup();
    renderApp('/');
    const [chip] = await screen.findAllByRole('button', { name: /Citizen — open account menu/ });
    await u.click(chip!);
    const menu = await screen.findByRole('dialog', { name: 'Account' });
    expect(within(menu).getByRole('radio', { name: 'Citizen' })).toBeChecked();
    expect(within(menu).getByRole('radio', { name: /Hospital staff/ })).toBeDisabled();

    await u.click(within(menu).getByRole('radio', { name: 'Donor' }));
    expect(await screen.findByText('Demo role: Donor')).toBeInTheDocument();
    expect(currentUser.role).toBe('donor');
    expect(currentUser.userId).toBe('u-demo-2');
    expect(
      (await screen.findAllByRole('button', { name: /Donor — open account menu/ })).length,
    ).toBeGreaterThan(0);
  });
});
