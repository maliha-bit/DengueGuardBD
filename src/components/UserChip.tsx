import { useState } from 'react';
import { ChevronDown, FlaskConical, LogIn, LogOut, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { USE_MOCK } from '@/api/client';
import { useCurrentUser, useSetDemoRole } from '@/api/queries';
import type { Role } from '@/api/types';
import { useSession } from '@/app/session';
import { Button, buttonClasses, Sheet, Skeleton, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { Avatar } from './Avatar';

/** Roles the demo switcher can use now; staff portals come in later phases. */
const DEMO_ROLES: Role[] = [
  'citizen',
  'donor',
  'hospital_staff',
  'lab_staff',
  'authority',
  'admin',
];
const SWITCHABLE: Role[] = ['citizen', 'donor'];

/** Avatar initials + name + role; opens the user menu. Guests see "Log in". */
export function UserChip() {
  const { t, l } = useLocale();
  const { isLoggedIn, signIn } = useSession();
  const toast = useToast();
  const { data: user, isPending, isError } = useCurrentUser();
  const [open, setOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <Button
        variant="dark"
        size="sm"
        leadingIcon={LogIn}
        onClick={() => {
          signIn();
          toast({ message: t('session.loggedIn') });
        }}
      >
        {t('session.logIn')}
      </Button>
    );
  }

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-h-touch items-center gap-3 rounded-full pr-2"
        aria-label={t('topbar.userMenu', { name, role: t(`roles.${user.role}`) })}
      >
        <Avatar name={user.name.en} />
        <span className="hidden min-w-0 flex-col text-left sm:flex">
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="text-xs text-brand-muted">{t(`roles.${user.role}`)}</span>
        </span>
        <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-brand-muted sm:block" />
      </button>
      <UserMenu open={open} onClose={() => setOpen(false)} role={user.role} name={name} />
    </>
  );
}

function UserMenu({
  open,
  onClose,
  role,
  name,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  name: string;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const { signOut } = useSession();
  const setRole = useSetDemoRole();
  const wide = useMediaQuery('(min-width: 768px)');
  // Show the chosen role straight away while the switch is saving (no flicker back).
  const [chosen, setChosen] = useState<Role | null>(null);
  const shownRole = chosen ?? role;

  const choose = (next: Role) => {
    if (next === role || !SWITCHABLE.includes(next)) return;
    setChosen(next);
    setRole.mutate(next as 'citizen' | 'donor', {
      onSettled: () => setChosen(null),
      onSuccess: () => {
        toast({ tone: 'success', message: t('userMenu.switched', { role: t(`roles.${next}`) }) });
        onClose();
      },
      onError: () => toast({ tone: 'error', message: t('userMenu.switchError') }),
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('userMenu.title')}
      side={wide ? 'right' : 'bottom'}
    >
      <p className="text-sm text-brand-muted">
        {name} · {t(`roles.${role}`)}
      </p>
      <Link
        to="/profile"
        onClick={onClose}
        className={cn(
          buttonClasses({ variant: 'secondary', fullWidth: true }),
          'mt-4 justify-start',
        )}
      >
        <UserRound aria-hidden="true" className="h-4 w-4" />
        {t('userMenu.profile')}
      </Link>

      {USE_MOCK && (
        <fieldset className="mt-5 rounded-2xl bg-brand-canvas p-4">
          <legend className="sr-only">{t('userMenu.demoRole')}</legend>
          <p aria-hidden="true" className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4" />
            {t('userMenu.demoRole')}
          </p>
          <p className="mb-3 mt-1 text-xs text-brand-muted">{t('userMenu.demoHint')}</p>
          <div className="flex flex-col gap-1.5">
            {DEMO_ROLES.map((option) => {
              const enabled = SWITCHABLE.includes(option);
              return (
                <label
                  key={option}
                  className={cn(
                    'flex min-h-touch items-center gap-3 rounded-2xl bg-white px-4 text-sm',
                    enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-ink has-[:checked]:ring-1 has-[:checked]:ring-brand-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="demo-role"
                    value={option}
                    checked={option === shownRole}
                    disabled={!enabled || setRole.isPending}
                    onChange={() => choose(option)}
                    className="h-5 w-5 accent-brand-ink focus:outline-none"
                  />
                  <span className="flex-1">{t(`roles.${option}`)}</span>
                  {!enabled && (
                    <span className="text-xs text-brand-muted">{t('userMenu.later')}</span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <Button
        className="mt-5"
        variant="ghost"
        fullWidth
        leadingIcon={LogOut}
        onClick={() => {
          signOut();
          onClose();
        }}
      >
        {t('userMenu.logOut')}
      </Button>
    </Sheet>
  );
}
