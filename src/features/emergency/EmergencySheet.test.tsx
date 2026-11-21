import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hospitals } from '@/api/mock/seed';
import { renderApp } from '@/test/render';
import { setDesktop } from '@/test/media';
import { nearestEmergencyHospital } from './emergencyUtils';

function mockGeolocation(result: 'allow' | 'deny') {
  const getCurrentPosition = vi.fn((ok: PositionCallback, fail?: PositionErrorCallback | null) => {
    if (result === 'allow') {
      ok({ coords: { latitude: 22.36, longitude: 91.78 } } as GeolocationPosition);
    } else {
      fail?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
    }
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
}

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
});

describe('Emergency sheet', () => {
  it('opens from the floating button on mobile with hotlines and the nearest hospital', async () => {
    const u = userEvent.setup();
    renderApp('/hospitals');
    await u.click(screen.getByRole('button', { name: 'Emergency' }));
    const sheet = await screen.findByRole('dialog', { name: 'Emergency help' });
    expect(within(sheet).getByRole('link', { name: /999.*National Emergency/ })).toHaveAttribute(
      'href',
      'tel:999',
    );
    expect(within(sheet).getByRole('link', { name: /16263.*Shastho Batayon/ })).toHaveAttribute(
      'href',
      'tel:16263',
    );
    // Demo division is Dhaka: nearest government hospital with an emergency department.
    expect(await within(sheet).findByText(/^Dhaka .*Hospital$/)).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: /^Call / })).toHaveAttribute(
      'href',
      expect.stringMatching(/^tel:/),
    );
    expect(within(sheet).getByRole('link', { name: /^Directions to/ })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );
    expect(within(sheet).getByText('What to do now')).toBeInTheDocument();
  });

  it('opens from the sidebar card on desktop and closes with Escape, restoring focus', async () => {
    setDesktop(true);
    const u = userEvent.setup();
    renderApp('/');
    const trigger = screen.getByRole('button', { name: /Nearest hospital & more/ });
    await u.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Emergency help' })).toBeInTheDocument();
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps keyboard focus inside the sheet', async () => {
    const u = userEvent.setup();
    renderApp('/');
    await u.click(screen.getByRole('button', { name: 'Emergency' }));
    const sheet = await screen.findByRole('dialog', { name: 'Emergency help' });
    for (let i = 0; i < 20; i++) {
      await u.tab();
      expect(sheet.contains(document.activeElement)).toBe(true);
    }
  });

  it('shares the location and uses it for the nearest hospital', async () => {
    mockGeolocation('allow');
    const u = userEvent.setup();
    renderApp('/');
    await u.click(screen.getByRole('button', { name: 'Emergency' }));
    const sheet = await screen.findByRole('dialog', { name: 'Emergency help' });
    await within(sheet).findByText(/^Dhaka .*Hospital$/);
    await u.click(within(sheet).getByRole('button', { name: 'Share my location' }));
    expect(await within(sheet).findByText(/^Location found/)).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: /Open in Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps?q=22.36000,91.78000',
    );
    expect(await within(sheet).findByText("Cox's Bazar Community Hospital")).toBeInTheDocument();
    expect(within(sheet).getByText(/km from you$/)).toBeInTheDocument();
  });

  it('explains what to do when location access is denied', async () => {
    mockGeolocation('deny');
    const u = userEvent.setup();
    renderApp('/');
    await u.click(screen.getByRole('button', { name: 'Emergency' }));
    const sheet = await screen.findByRole('dialog', { name: 'Emergency help' });
    await u.click(within(sheet).getByRole('button', { name: 'Share my location' }));
    expect(await within(sheet).findByText(/Location access was blocked/)).toBeInTheDocument();
  });
});

describe('nearestEmergencyHospital', () => {
  it('only picks hospitals with an emergency department, preferring the division', () => {
    const result = nearestEmergencyHospital(hospitals, {
      divisionId: 'sylhet',
      divisionCenter: [24.89, 91.87],
      position: null,
    });
    expect(result?.hospital.hasEmergency).toBe(true);
    expect(result?.hospital.divisionId).toBe('sylhet');
    expect(result?.distanceKm).toBeNull();
  });

  it('uses the shared position when there is one', () => {
    const result = nearestEmergencyHospital(hospitals, {
      divisionId: 'dhaka',
      divisionCenter: [23.81, 90.41],
      position: [22.7, 90.35],
    });
    expect(result?.hospital.divisionId).toBe('barishal');
    expect(result?.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it('returns null when no hospital has an emergency department', () => {
    expect(
      nearestEmergencyHospital([], { divisionId: 'dhaka', divisionCenter: null, position: null }),
    ).toBeNull();
  });
});
