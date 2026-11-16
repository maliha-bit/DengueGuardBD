import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/api/queries';
import { Skeleton } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';
import { Avatar } from './Avatar';

/** Avatar initials + name + role; links to the profile. */
export function UserChip() {
  const { t, l } = useLocale();
  const { data: user, isPending, isError } = useCurrentUser();

  if (isPending) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" className="h-11 w-11" />
        <Skeleton shape="text" className="hidden w-28 sm:block" />
      </div>
    );
  }
  if (isError) return null;

  const name = l(user.name);
  return (
    <Link
      to="/profile"
      className="flex min-h-touch items-center gap-3 rounded-full pr-2"
      aria-label={t('topbar.profileLabel', { name, role: t(`roles.${user.role}`) })}
    >
      <Avatar name={user.name.en} />
      <span className="hidden min-w-0 flex-col sm:flex">
        <span className="truncate text-sm font-semibold">{name}</span>
        <span className="text-xs text-brand-muted">{t(`roles.${user.role}`)}</span>
      </span>
      <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-brand-muted sm:block" />
    </Link>
  );
}
