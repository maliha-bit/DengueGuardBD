import { ArrowRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePreventionTip } from '@/api/queries';
import { QueryState } from '@/components/QueryState';
import { Card, EmptyState, Skeleton, SkeletonGroup } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';

export function PreventionTipCard({ className }: { className?: string }) {
  const { t, l } = useLocale();
  const query = usePreventionTip();
  return (
    <Card
      tone="lavender"
      title={t('dashboard.tip.title')}
      icon={Lightbulb}
      className={cn('flex flex-col', className)}
    >
      <QueryState
        query={query}
        compact
        skeleton={
          <SkeletonGroup className="flex flex-col gap-2">
            <Skeleton shape="text" />
            <Skeleton shape="text" className="w-4/5" />
          </SkeletonGroup>
        }
        empty={
          <EmptyState
            compact
            icon={Lightbulb}
            title={t('dashboard.tip.emptyTitle')}
            message={<span className="text-brand-ink/80">{t('dashboard.tip.emptyMessage')}</span>}
          />
        }
      >
        {(tip) => <p className="text-lg font-medium leading-snug">{l(tip.text)}</p>}
      </QueryState>
      <Link
        to="/home-care"
        className="mt-5 inline-flex min-h-touch w-fit items-center gap-2 rounded-full bg-brand-ink px-4 text-sm font-medium text-white hover:bg-black"
      >
        {t('dashboard.tip.checklist')}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </Card>
  );
}
