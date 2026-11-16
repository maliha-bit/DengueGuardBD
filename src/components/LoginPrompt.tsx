import { LogIn } from 'lucide-react';
import { useSession } from '@/app/session';
import { Button, Modal } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

/**
 * Asks a guest to log in, then calls onLoggedIn so the action can continue
 * (mock login until the auth phase).
 */
export function LoginPrompt({
  open,
  onClose,
  title,
  body,
  onLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  onLoggedIn?: () => void;
}) {
  const { t } = useLocale();
  const { signIn } = useSession();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={body}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            leadingIcon={LogIn}
            onClick={() => {
              signIn();
              onLoggedIn?.();
            }}
          >
            {t('session.logInDemo')}
          </Button>
        </>
      }
    />
  );
}
