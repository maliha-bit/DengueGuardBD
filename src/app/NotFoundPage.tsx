import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { buttonClasses, Card, EmptyState } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

export function NotFoundPage() {
  const { t } = useLocale();
  return (
    <>
      <PageHeader title={t('notFound.title')} />
      <Card>
        <EmptyState
          icon={MapPinOff}
          title={t('notFound.title')}
          message={t('notFound.message')}
          action={
            <Link to="/" className={buttonClasses({ size: 'sm' })}>
              {t('notFound.backHome')}
            </Link>
          }
        />
      </Card>
    </>
  );
}
