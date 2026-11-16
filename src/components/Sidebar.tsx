import { Siren } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { EmergencyNumbers } from './EmergencyNumbers';
import { Logo } from './Logo';
import { useNavBadges } from './useNavBadges';

/** Desktop dark sidebar (≥768px). */
export function Sidebar() {
  const { t, n } = useLocale();
  const badges = useNavBadges();
  return (
    <aside className="on-dark fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col bg-brand-sidebar px-4 py-6 md:flex">
      <NavLink to="/" className="mx-2 mb-7 rounded-full" aria-label={t('nav.dashboard')}>
        <Logo />
      </NavLink>

      <nav aria-label={t('nav.main')} className="-mx-1 flex-1 overflow-y-auto px-1 py-1">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, to, icon: Icon, badge }) => {
            const count = badge ? badges[badge] : 0;
            return (
              <li key={key}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-touch items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-brand-ink'
                        : 'text-white/75 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <Icon
                    aria-hidden="true"
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                  />
                  <span className="flex-1 truncate">{t(`nav.${key}`)}</span>
                  {count > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-lime px-1.5 text-xs font-semibold text-brand-ink">
                      {n(count)}
                      <span className="sr-only"> {t('nav.newItems')}</span>
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <section
        aria-labelledby="sidebar-emergency"
        className="mt-4 rounded-3xl bg-brand-lime p-4 text-brand-ink"
      >
        <div className="flex items-center gap-2">
          <Siren aria-hidden="true" className="h-5 w-5 text-[#B3262B]" />
          <h2 id="sidebar-emergency" className="text-base font-semibold">
            {t('emergency.title')}
          </h2>
        </div>
        <p className="mb-3 mt-1 text-xs leading-snug text-brand-ink/80">{t('emergency.body')}</p>
        <EmergencyNumbers />
      </section>
    </aside>
  );
}
