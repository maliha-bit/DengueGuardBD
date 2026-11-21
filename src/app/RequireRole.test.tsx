import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/api/mock/handlers';
import { staffMockApi } from '@/api/mock/staffHandlers';
import { setDesktop } from '@/test/media';
import { renderApp } from '@/test/render';

describe('approval gate (RequireRole)', () => {
  it('shows "Waiting for admin approval" to an unapproved staff account', async () => {
    await mockApi.setDemoRole('hospital_staff_new');
    renderApp('/staff/hospital');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Waiting for admin approval' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hospital overview' })).not.toBeInTheDocument();
  });

  it('opens the portal once an admin approves the account', async () => {
    await mockApi.setDemoRole('admin');
    await staffMockApi.decideSignup('su-1', true, '');
    await mockApi.setDemoRole('hospital_staff_new');
    renderApp('/staff/hospital');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hospital overview' }),
    ).toBeInTheDocument();
  });

  it('tells a citizen the portal is for another role', async () => {
    renderApp('/staff/admin');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No access to this portal' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/This portal is for: Administrator/)).toBeInTheDocument();
  });

  it('shows each portal its own sidebar items', async () => {
    setDesktop(true);
    await mockApi.setDemoRole('authority');
    renderApp('/staff/authority');
    await screen.findByRole('heading', { level: 1, name: 'Health authority dashboard' });
    const nav = screen.getAllByRole('navigation', { name: 'Main navigation' })[0]!;
    expect(within(nav).getByRole('link', { name: 'Prevention tasks' })).toBeInTheDocument();
    expect(nav).not.toHaveTextContent('Symptom checker');
    expect(nav).not.toHaveTextContent('Approvals');
  });
});

describe('hospital bed update screen', () => {
  it('updates beds in one tap + Save, and blocks values over the total', async () => {
    const u = userEvent.setup();
    await mockApi.setDemoRole('hospital_staff');
    renderApp('/staff/hospital/beds');
    const plus = await screen.findByRole('button', { name: 'Increase ICU beds available' });
    const input = screen.getByLabelText('ICU beds available') as HTMLInputElement;
    const before = Number(input.value);
    await u.click(plus);
    expect(input.value).toBe(String(before + 1));
    await u.click(screen.getByRole('button', { name: 'Save beds' }));
    expect(
      await screen.findByText('Beds saved. Citizens now see the new numbers.'),
    ).toBeInTheDocument();
    const hospital = await mockApi.getHospital('h-dhaka-1');
    expect(hospital?.beds.icuAvailable).toBe(before + 1);

    await u.clear(screen.getByLabelText('General beds available'));
    await u.type(screen.getByLabelText('General beds available'), '9999');
    expect(await screen.findByText(/Can't be more than/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save beds' })).toBeDisabled();
  });
});
