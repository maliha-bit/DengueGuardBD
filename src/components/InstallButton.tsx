import { Download } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { useInstallPrompt } from '@/lib/pwa';
import { useLocale } from '@/lib/useLocale';

/** "Install app" — shown only where the browser supports installing the PWA. */
export function InstallButton() {
  const { t } = useLocale();
  const toast = useToast();
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <Button
      variant="dark"
      size="sm"
      leadingIcon={Download}
      onClick={() =>
        void install().then((accepted) => {
          if (accepted) toast({ tone: 'success', message: t('offline.installed') });
        })
      }
    >
      <span className="hidden sm:inline">{t('offline.install')}</span>
      <span className="sm:hidden">{t('offline.installShort')}</span>
    </Button>
  );
}
