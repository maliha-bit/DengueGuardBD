import { useState } from 'react';
import { Menu, Siren } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEmergency } from '@/app/emergency';
import { MORE_ITEMS, TAB_ITEMS, type ShellNavItem } from '@/app/navigation';
import { Sheet } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { useNavBadges } from './useNavBadges';

const tabLabel = {
  dashboard: 'nav.home',
  riskMap: 'nav.risk',
  hospitals: 'nav.hospitals',
  chatbot: 'nav.chatbot',
} as const;

/**
 * Mobile bottom tab bar (<768px) + "More" sheet + floating Emergency button (opens the shared
 * sheet). Citizen items by default; staff shells pass their own tabs and "More" items.
 */
export function BottomNav({
  tabs,
  more,
  showEmergency = true,
}: {
  tabs?: ShellNavItem[];
  more?: ShellNavItem[];
  showEmergency?: boolean;
}) {
  const { t, n } = useLocale();
  const { pathname } = useLocation();
  const badges = useNavBadges();
  const [moreOpen, setMoreOpen] = useState(false);
  const { openEmergency } = useEmergency();
  const tabItems: ShellNavItem[] =
    tabs ??
    TAB_ITEMS.map(({ key, to, icon }) => ({
      key,
      to,
      icon,
      label: t(tabLabel[key as keyof typeof tabLabel]),
      end: to === '/',
    }));
  const moreItems: ShellNavItem[] =
    more ??
    MORE_ITEMS.map(({ key, to, icon, badge }) => ({
      key,
      to,
      icon,
      label: t(`nav.${key}`),
      count: badge ? badges[badge] : 0,
    }));
  const moreActive = moreItems.some((item) => pathname.startsWith(item.to));
  const columns = tabItems.length + (moreItems.length > 0 ? 1 : 0);

  const tabClass = (active: boolean) =>
    cn(
      'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium',
      active ? 'text-white' : 'text-white/70',
    );
  const iconWrap = (active: boolean) =>
    cn(
      'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
      active && 'bg-brand-lime text-brand-ink',
    );

  return (
    <>
      {showEmergency && (
        <button
          type="button"
          onClick={openEmergency}
          aria-haspopup="dialog"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#C9353A] px-5 text-sm font-semibold text-white shadow-lg shadow-black/20 md:hidden"
        >
          <Siren aria-hidden="true" className="h-5 w-5" />
          {t('emergency.fab')}
        </button>
      )}

      <nav
        aria-label={t('nav.main')}
        className="on-dark fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-brand-sidebar px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 md:hidden"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {tabItems.map(({ key, to, icon: Icon, label, end }) => (
            <li key={key}>
              <NavLink to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <span className={iconWrap(isActive)}>
                      <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          {moreItems.length > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className={cn(tabClass(moreActive), 'w-full')}
              >
                <span className={iconWrap(moreActive)}>
                  <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                </span>
                {t('nav.more')}
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')}>
        <ul className="grid grid-cols-2 gap-2">
          {moreItems.map(({ key, to, icon: Icon, label, count = 0, end }) => {
            return (
              <li key={key}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-14 items-center gap-3 rounded-2xl px-3 text-sm font-medium',
                      isActive ? 'bg-brand-ink text-white' : 'bg-brand-canvas text-brand-ink',
                    )
                  }
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-brand-lime px-1.5 text-xs font-semibold text-brand-ink">
                      {n(count)}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
