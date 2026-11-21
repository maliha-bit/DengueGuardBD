import type { ReactNode } from 'react';
import { Hourglass, Lock, LogIn, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Role } from '@/api/types';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonClasses, Card, EmptyState, ErrorState, SkeletonCard } from '@/components/ui';
import { isStaffRole, PORTAL_PATH } from '@/lib/access';
import { useLocale } from '@/lib/useLocale';
import { usePortalAccess } from './portalAccess';
import { useSession } from './session';

/**
 * Route guard for staff portals: the user must be logged in, have one of `roles` and (for
 * staff) be approved by an administrator. Otherwise it explains why and what to do.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { t } = useLocale();
  const { signIn, isLoggedIn } = useSession();
  const { user, access } = usePortalAccess(roles);

  if (isLoggedIn && user.isPending) return <SkeletonCard className="mt-8" />;
  if (isLoggedIn && user.isError) {
    return (
      <Card className="mt-8">
        <ErrorState retrying={user.isFetching} onRetry={() => void user.refetch()} />
      </Card>
    );
  }
  if (access === 'granted') return <>{children}</>;

  const role = user.data?.role;
  const home = role && isStaffRole(role) ? PORTAL_PATH[role] : '/';
  const homeLink = (
    <Link to={home} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
      {t('staff.gate.goHome')}
    </Link>
  );

  const screens = {
    login: {
      icon: Lock,
      title: t('session.requiredTitle'),
      message: t('staff.gate.loginMessage'),
      action: (
        <Button leadingIcon={LogIn} onClick={signIn}>
          {t('session.logInDemo')}
        </Button>
      ),
    },
    pending: {
      icon: Hourglass,
      title: t('staff.gate.pendingTitle'),
      message: t('staff.gate.pendingMessage'),
      action: null,
    },
    rejected: {
      icon: ShieldX,
      title: t('staff.gate.rejectedTitle'),
      message: t('staff.gate.rejectedMessage'),
      action: null,
    },
    wrongRole: {
      icon: ShieldX,
      title: t('staff.gate.wrongRoleTitle'),
      message: t('staff.gate.wrongRoleMessage', {
        roles: roles.map((r) => t(`roles.${r}`)).join(', '),
      }),
      action: homeLink,
    },
  } as const;
  const screen = screens[access];

  return (
    <>
      <PageHeader title={screen.title} />
      <Card>
        <EmptyState
          icon={screen.icon}
          title={screen.title}
          message={screen.message}
          action={screen.action}
        />
      </Card>
    </>
  );
}
