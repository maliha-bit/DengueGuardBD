import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { cToF, feverEntrySchema, fToC, toInput } from './feverSchema';

const BANNER = 'Warning sign logged. Check your symptoms now';

/** Card sections are found through their heading. */
const card = async (name: string) =>
  (await screen.findByRole('heading', { name })).closest('section') as HTMLElement;

describe('Fever log (/fever-log)', () => {
  it('asks guests to log in', () => {
    window.history.replaceState(null, '', '/?as=guest');
    renderApp('/fever-log');
    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });

  it('shows past entries and charts, without a warning banner', async () => {
    renderApp('/fever-log');
    const list = await card('Past entries');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(await screen.findByRole('img', { name: /^Temperature —/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Fluids —/ })).toBeInTheDocument();
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });

  it('shows a red banner linking to the symptom checker once a warning sign is logged', async () => {
    const u = userEvent.setup();
    renderApp('/fever-log');
    await card('Past entries');

    await u.type(screen.getByLabelText(/^Temperature \(/), '38.9');
    await u.type(screen.getByLabelText('Fluids today (glasses)'), '5');
    await u.click(screen.getByRole('checkbox', { name: 'Bleeding from gums or nose' }));
    await u.click(screen.getByRole('button', { name: 'Save entry' }));

    const banner = (await screen.findByText(BANNER)).closest('[role="alert"]');
    expect(banner).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Check symptoms/ })).toHaveAttribute(
      'href',
      '/symptoms',
    );
    const list = await card('Past entries');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  it('validates the form with zod messages', async () => {
    const u = userEvent.setup();
    renderApp('/fever-log');
    await card('Past entries');
    await u.type(screen.getByLabelText(/^Temperature \(/), '50');
    await u.click(screen.getByRole('button', { name: 'Save entry' }));
    expect(await screen.findByText('Enter a temperature between 34 and 43 °C')).toBeInTheDocument();
    expect(screen.getByText('Enter how many glasses')).toBeInTheDocument();
  });

  it('edits and deletes an entry', async () => {
    const u = userEvent.setup();
    renderApp('/fever-log');
    const list = await card('Past entries');
    const editButtons = within(list).getAllByRole('button', { name: /^Edit entry for/ });
    await u.click(editButtons[0]!);
    const temp = screen.getByLabelText(/^Temperature \(/);
    expect(temp).toHaveValue('38.6');
    await u.clear(temp);
    await u.type(temp, '37.5');
    await u.click(screen.getByRole('button', { name: 'Update entry' }));
    expect(await within(list).findByText('37.5°C')).toBeInTheDocument();

    await u.click(within(list).getAllByRole('button', { name: /^Delete entry for/ })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Delete this entry?' });
    await u.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2));
  });

  it('uses Bangla text and digits in বাংলা mode', async () => {
    const u = userEvent.setup();
    renderApp('/fever-log');
    await card('Past entries');
    await u.click(screen.getByRole('button', { name: 'বাংলা' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'জ্বরের লগ' })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getAllByText(/[০-৯]/).length).toBeGreaterThan(3);
    const latin = (main.textContent ?? '').replace(/DGHS|WHO|°[CF]/g, '').match(/[0-9]/g);
    expect(latin).toBeNull();
  });

  it('shows an error with Retry', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    renderApp('/fever-log');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('fever schema', () => {
  const schema = feverEntrySchema(['2026-11-20'], '2026-11-21');
  const valid = {
    date: '2026-11-21',
    unit: 'C' as const,
    temperature: '38.5',
    fluidGlasses: '6',
    urine: 'normal' as const,
    warningSigns: [],
  };

  it('accepts Bangla digits and converts °F to °C', () => {
    expect(schema.safeParse({ ...valid, temperature: '৩৮.৫' }).success).toBe(true);
    expect(toInput({ ...valid, unit: 'F', temperature: '101.3' }).temperatureC).toBe(38.5);
    expect(cToF(38.5)).toBe(101.3);
    expect(fToC(98.6)).toBe(37);
  });

  it('rejects future, duplicate and out-of-range values', () => {
    const issues = (values: Partial<typeof valid>) =>
      schema.safeParse({ ...valid, ...values }).error?.issues.map((i) => i.message);
    expect(issues({ date: '2026-11-22' })).toEqual(['dateFuture']);
    expect(issues({ date: '2026-11-20' })).toEqual(['dateDuplicate']);
    expect(issues({ temperature: '30' })).toEqual(['tempRange']);
    expect(issues({ fluidGlasses: '2.5' })).toEqual(['fluidsRange']);
  });
});
