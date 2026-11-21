import { NavLink } from 'react-router-dom';
import { pillClasses } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

const TABS = [
  { key: 'find', to: '/donors', end: true },
  { key: 'requests', to: '/donors/requests', end: true },
  { key: 'profile', to: '/donor/profile', end: true },
  { key: 'inbox', to: '/donor/inbox', end: true },
] as const;

/** Sub-navigation shared by the donor pages. */
export function DonorTabs() {
  const { t } = useLocale();
  return (
    <nav aria-label={t('donors.tabsLabel')} className="-mt-2 mb-5 overflow-x-auto">
      <ul className="flex gap-2">
        {TABS.map((tab) => (
          <li key={tab.key}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                pillClasses({ selected: isActive }) + ' whitespace-nowrap'
              }
            >
              {t(`donors.tabs.${tab.key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
