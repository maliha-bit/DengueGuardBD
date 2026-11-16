import type { ReactNode } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, EmptyState } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';
import { useSession } from './session';

/** Shows children only to logged-in users; guests get a login card (mock login for now). */
export function RequireLogin({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const { isLoggedIn, signIn } = useSession();
  if (isLoggedIn) return <>{children}</>;
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={Lock}
          title={t('session.requiredTitle')}
          message={message}
          action={
            <Button leadingIcon={LogIn} onClick={signIn}>
              {t('session.logInDemo')}
            </Button>
          }
        />
      </Card>
    </>
  );
}
