import { useState } from 'react';
import { Bell, BellRing, LogIn } from 'lucide-react';
import { useAlertSubscription, useCurrentUser } from '@/api/queries';
import type { DivisionId } from '@/api/types';
import { useSession } from '@/app/session';
import { Button, Modal, useToast } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

/** "Turn on alerts" — needs login; guests get a login prompt first. */
export function AlertsButton({
  divisionId,
  divisionName,
}: {
  divisionId: DivisionId;
  divisionName: string;
}) {
  const { t } = useLocale();
  const { isLoggedIn, signIn } = useSession();
  const toast = useToast();
  const user = useCurrentUser();
  const subscription = useAlertSubscription();
  const [promptOpen, setPromptOpen] = useState(false);

  const active = isLoggedIn && (user.data?.alertDivisions.includes(divisionId) ?? false);

  const save = (enabled: boolean) =>
    subscription.mutate(
      { divisionId, enabled },
      {
        onSuccess: () =>
          toast({
            message: t(enabled ? 'riskMap.alertsSaved' : 'riskMap.alertsRemoved', {
              division: divisionName,
            }),
          }),
        onError: () => toast({ message: t('riskMap.alertsError'), tone: 'error' }),
      },
    );

  return (
    <>
      <Button
        variant={active ? 'dark' : 'secondary'}
        leadingIcon={active ? BellRing : Bell}
        aria-pressed={isLoggedIn ? active : undefined}
        loading={subscription.isPending}
        onClick={() => (isLoggedIn ? save(!active) : setPromptOpen(true))}
        fullWidth
      >
        {active ? t('riskMap.alertsActive') : t('riskMap.alertsOn')}
      </Button>

      <Modal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        title={t('riskMap.loginTitle')}
        description={t('riskMap.loginBody', { division: divisionName })}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPromptOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              leadingIcon={LogIn}
              onClick={() => {
                signIn();
                setPromptOpen(false);
                save(true);
              }}
            >
              {t('riskMap.loginAction')}
            </Button>
          </>
        }
      />
    </>
  );
}
