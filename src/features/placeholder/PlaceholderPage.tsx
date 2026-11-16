import { ArrowLeft, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS, type NavKey } from '@/app/navigation';
import { Disclaimer } from '@/components/Disclaimer';
import { PageHeader } from '@/components/PageHeader';
import { buttonClasses, Card, EmptyState, IconChip } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

export type PlaceholderKey = Exclude<NavKey, 'dashboard' | 'riskMap'>;

/** Medical screens must show the non-diagnostic notice (NFR08). */
const MEDICAL: PlaceholderKey[] = ['symptomChecker', 'homeCare', 'chatbot'];

/** Temporary page for sections built in later phases. */
export function PlaceholderPage({ page }: { page: PlaceholderKey }) {
  const { t } = useLocale();
  const icon = NAV_ITEMS.find((item) => item.key === page)?.icon ?? Construction;
  return (
    <>
      <PageHeader title={t(`pages.${page}.title`)} subtitle={t(`pages.${page}.subtitle`)} />
      <Card className="flex flex-col items-center">
        <IconChip icon={icon} size="lg" tone="lime" />
        <EmptyState
          icon={Construction}
          className="pt-4"
          title={t('pages.comingSoonTitle')}
          message={t('pages.comingSoonMessage')}
          action={
            <Link to="/" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t('pages.backToDashboard')}
            </Link>
          }
        />
      </Card>
      {MEDICAL.includes(page) && <Disclaimer className="mt-6" />}
    </>
  );
}
