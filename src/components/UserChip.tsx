import { useState } from 'react';
import { ChevronDown, FlaskConical, LogIn, LogOut, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { USE_MOCK } from '@/api/client';
import { DEMO_ACCOUNT_IDS, DEMO_ACCOUNTS, type DemoAccountId } from '@/api/mock/staffStore';
import { useCurrentUser, useSetDemoRole } from '@/api/queries';
import type { Role } from '@/api/types';
import { useSession } from '@/app/session';
import { Button, buttonClasses, Sheet, Skeleton, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { Avatar } from './Avatar';

import { isStaffRole, PORTAL_PATH } from '@/lib/access';

/** The demo account behind the logged-in user (falls back to the role's main account). */
function accountOf(userId: string, role: Role): DemoAccountId {
  return (
    DEMO_ACCOUNT_IDS.find((id) => DEMO_ACCOUNTS[id].userId === userId) ??
    DEMO_ACCOUNT_IDS.find((id) => DEMO_ACCOUNTS[id].role === role) ??
    'citizen'
  );
}

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
      >
        <Avatar name={user.name.en} />
        {/* Name comes from text (not aria-label) so it always contains what is visible. */}
        <span className="sr-only">
          {t('topbar.userMenu', { name, role: t(`roles.${user.role}`) })}
        </span>
        <span
          aria-hidden="true"
          className="hidden min-w-0 flex-col text-left sm:flex md:max-lg:hidden"
        >
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="text-xs text-brand-muted">{t(`roles.${user.role}`)}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="hidden h-4 w-4 text-brand-muted sm:block md:max-lg:hidden"
        />
      </button>
      <UserMenu
        open={open}
        onClose={() => setOpen(false)}
        role={user.role}
        account={accountOf(user.userId, user.role)}
        name={name}
      />
    </>
  );
}

function UserMenu({
  open,
  onClose,
  role,
  account,
  name,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  account: DemoAccountId;
  name: string;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const { signOut } = useSession();
  const setRole = useSetDemoRole();
  const wide = useMediaQuery('(min-width: 768px)');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Show the chosen account straight away while the switch is saving (no flicker back).
  const [chosen, setChosen] = useState<DemoAccountId | null>(null);
  const shown = chosen ?? account;

  const choose = (next: DemoAccountId) => {
    if (next === account) return;
    setChosen(next);
    setRole.mutate(next, {
      onSettled: () => setChosen(null),
      onSuccess: (user) => {
        toast({ tone: 'success', message: t('userMenu.switched', { role: accountLabel(next) }) });
        onClose();
        // Staff land on their portal; leaving a portal goes back to the citizen dashboard.
        if (isStaffRole(user.role)) navigate(PORTAL_PATH[user.role]);
        else if (pathname.startsWith('/staff')) navigate('/');
      },
      onError: () => toast({ tone: 'error', message: t('userMenu.switchError') }),
    });
  };

  const accountLabel = (id: DemoAccountId) =>
    id === 'hospital_staff_new' ? t('userMenu.newSignup') : t(`roles.${DEMO_ACCOUNTS[id].role}`);

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
            {DEMO_ACCOUNT_IDS.map((option) => {
              return (
                <label
                  key={option}
                  className={cn(
                    'flex min-h-touch cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 text-sm',
                    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-ink has-[:checked]:ring-1 has-[:checked]:ring-brand-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="demo-role"
                    value={option}
                    checked={option === shown}
                    disabled={setRole.isPending}
                    onChange={() => choose(option)}
                    className="h-5 w-5 accent-brand-ink focus:outline-none"
                  />
                  <span className="flex-1">{accountLabel(option)}</span>
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
