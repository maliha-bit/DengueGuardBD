import { FlaskConical, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { USE_MOCK } from '@/api/client';
import { Badge, buttonClasses } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoMark } from './Logo';
import { NotificationsButton } from './NotificationsButton';
import { UserChip } from './UserChip';

/** Header row inside the main canvas: user chip · search · language · bell. */
export function Topbar() {
  const { t } = useLocale();
  return (
    <header className="flex items-center gap-2 sm:gap-3">
      <Link to="/" className="rounded-full md:hidden" aria-label={t('nav.dashboard')}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-sidebar">
          <LogoMark className="h-7 w-7" />
        </span>
      </Link>
      <div className="hidden md:block">
        <UserChip />
      </div>
      {USE_MOCK && (
        <Badge tone="lavender" icon={FlaskConical} className="hidden min-[400px]:inline-flex">
          {t('common.demoBadge')}
        </Badge>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/hospitals"
          aria-label={t('topbar.search')}
          className={cn(
            buttonClasses({ variant: 'secondary', size: 'sm', iconOnly: true }),
            'hidden bg-white ring-0 sm:inline-flex',
          )}
        >
          <Search aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <LanguageSwitch />
        <NotificationsButton />
        <div className="md:hidden">
          <UserChip />
        </div>
      </div>
    </header>
  );
}
