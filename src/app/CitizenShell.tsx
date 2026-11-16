import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { useLocale } from '@/lib/useLocale';

/**
 * Citizen layout: dark sidebar + inset rounded canvas on desktop,
 * full-bleed canvas + bottom tab bar on mobile.
 */
export function CitizenShell() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-brand-canvas md:bg-brand-sidebar">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-brand-lime px-4 py-2 text-sm font-medium text-brand-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('nav.skipToContent')}
      </a>
      <Sidebar />
      <div className="md:pl-sidebar">
        <div className="md:py-3 md:pr-3">
          <div className="min-h-screen bg-brand-canvas px-4 pb-44 pt-4 md:min-h-[calc(100vh-1.5rem)] md:rounded-[32px] md:px-8 md:pb-8 md:pt-6">
            <div className="mx-auto max-w-[1280px]">
              <Topbar />
              <main id="main" tabIndex={-1} className="focus:outline-none">
                <Outlet />
              </main>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
