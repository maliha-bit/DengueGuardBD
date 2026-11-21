import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/api/mock/handlers';
import type { DemoAccountId } from '@/api/mock/staffStore';
import { setDesktop } from '@/test/media';
import { renderApp } from '@/test/render';

const PAGES: Array<[DemoAccountId, string, string, RegExp | string]> = [
  ['hospital_staff', '/staff/hospital/doctors', 'Doctors', 'Dr. Farhana Akter'],
  ['hospital_staff', '/staff/hospital/schedule', 'Weekly schedule', 'Save schedule'],
  ['hospital_staff', '/staff/hospital/slots', 'Slot generator', 'Preview slots'],
  ['hospital_staff', '/staff/hospital/appointments', "Today's appointments", 'Rina Akter'],
  ['lab_staff', '/staff/lab', 'Lab listing', 'How citizens will see it'],
  ['authority', '/staff/authority', 'Health authority dashboard', 'Risk alerts'],
  ['authority', '/staff/authority/tasks', 'Prevention tasks', 'Clear drains around Mirpur 10'],
  ['admin', '/staff/admin/directories', 'Directories', 'Dhaka Care Hospital'],
  ['admin', '/staff/admin/knowledge', 'Knowledge sources', 'Dengue and severe dengue (fact sheet)'],
  ['admin', '/staff/admin/forecast', 'Forecast model', 'Last 5 runs'],
  ['admin', '/staff/admin/analytics', 'Analytics', 'Users by role'],
  ['admin', '/staff/admin/audit', 'Audit trail', 'No actions logged yet'],
];

describe('staff portal pages render (phone and desktop)', () => {
  it.each(PAGES)('%s %s', async (account, path, title, content) => {
    for (const desktop of [false, true]) {
      setDesktop(desktop);
      await mockApi.setDemoRole(account);
      const view = renderApp(path);
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect((await screen.findAllByText(content)).length).toBeGreaterThan(0);
      view.unmount();
    }
  });

  it('shows an overdue task in the Overdue column', async () => {
    await mockApi.setDemoRole('authority');
    renderApp('/staff/authority/tasks');
    const column = await screen.findByRole('region', { name: /Overdue/ });
    expect(column).toHaveTextContent('Clear drains around Mirpur 10');
  });

  it('shows Bangla digits in বাংলা mode', async () => {
    const i18n = (await import('@/lib/i18n')).default;
    await i18n.changeLanguage('bn');
    await mockApi.setDemoRole('hospital_staff');
    renderApp('/staff/hospital/appointments');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'আজকের অ্যাপয়েন্টমেন্ট' }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText('১')).length).toBeGreaterThan(0);
  });
});
