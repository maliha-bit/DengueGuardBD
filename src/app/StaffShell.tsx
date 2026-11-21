import { Outlet } from 'react-router-dom';
import type { StaffRole } from '@/api/types';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import type { ShellNavItem } from '@/app/navigation';
import { PORTAL_PATH } from '@/lib/access';
import { useLocale } from '@/lib/useLocale';
import { usePortalAccess } from './portalAccess';
import { RequireRole } from './RequireRole';
import { STAFF_NAV } from './staffNavigation';

/**
 * Staff layout: same dark sidebar + rounded canvas as the citizen shell, with the portal's own
 * navigation. The nav only appears once the user may use the portal.
 */
export function StaffShell({ portal: role }: { portal: StaffRole }) {
  const { t } = useLocale();
  const { access } = usePortalAccess([role]);
  const nav = access === 'granted' ? STAFF_NAV[role] : [];
  const toItem = (item: (typeof nav)[number]): ShellNavItem => ({
    key: item.key,
    to: item.to,
    icon: item.icon,
    label: t(`staff.nav.${item.key}`),
    end: item.end,
  });
  const items = nav.map(toItem);
  const tabs = nav.filter((item) => item.tab).map(toItem);
  const more = nav.filter((item) => !item.tab).map(toItem);
  const home = PORTAL_PATH[role];

  return (
    <div className="min-h-screen bg-brand-canvas md:bg-brand-sidebar">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-brand-lime px-4 py-2 text-sm font-medium text-brand-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('nav.skipToContent')}
      </a>
      <Sidebar items={items} homeTo={home} showEmergency={false} />
      <div className="md:pl-sidebar">
        <div className="md:py-3 md:pr-3">
          <div className="min-h-screen bg-brand-canvas px-4 pb-32 pt-4 md:min-h-[calc(100vh-1.5rem)] md:rounded-[32px] md:px-8 md:pb-8 md:pt-6">
            <div className="mx-auto max-w-[1280px]">
              <Topbar homeTo={home} showSearch={false} />
              <main id="main" tabIndex={-1} className="focus:outline-none">
                <RequireRole roles={[role]}>
                  <Outlet />
                </RequireRole>
              </main>
            </div>
          </div>
        </div>
      </div>
      {tabs.length > 0 && <BottomNav tabs={tabs} more={more} showEmergency={false} />}
    </div>
  );
}
