import { AlertTriangle, ArrowRight, ListChecks, Siren, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEmergency } from '@/app/emergency';
import { Disclaimer } from '@/components/Disclaimer';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  IconChip,
  Skeleton,
  SkeletonGroup,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { CHECKLIST_ITEMS, HOME_CARE_SECTIONS, type HomeCareSection } from './content';
import { usePreventionChecklist } from './useChecklist';

/** Home care guide + prevention checklist (UC15). Public. */
export default function HomeCarePage() {
  const { t } = useLocale();
  return (
    <>
      <PageHeader title={t('homeCare.title')} subtitle={t('homeCare.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-2">
        {HOME_CARE_SECTIONS.map((section) => (
          <SectionCard key={section.key} section={section} />
        ))}
        <PreventionChecklist />
      </div>
      <Disclaimer className="mt-6" />
    </>
  );
}

function SectionCard({ section }: { section: HomeCareSection }) {
  const { t, d } = useLocale();
  const { openEmergency } = useEmergency();
  const danger = section.tone === 'danger';
  const base = `homeCare.sections.${section.key}` as const;

  return (
    <section
      aria-labelledby={`homecare-${section.key}`}
      className={cn(
        'flex flex-col rounded-3xl p-5',
        danger && 'bg-[#FBE3E4] text-[#5C1417] ring-2 ring-inset ring-[#E5484D]',
        section.tone === 'lime' && 'bg-brand-lime-soft',
        section.tone === 'light' && 'bg-white',
      )}
    >
      <header className="mb-3 flex items-center gap-3">
        {danger ? (
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9353A] text-white"
          >
            <section.icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
        ) : (
          <IconChip icon={section.icon} tone={section.tone === 'lime' ? 'lime' : 'grey'} />
        )}
        <h2 id={`homecare-${section.key}`} className="flex-1 text-base font-semibold">
          {t(`${base}.title`)}
        </h2>
        {danger && (
          <Badge tone="risk-high" icon={AlertTriangle}>
            {t('homeCare.doNotTake')}
          </Badge>
        )}
      </header>
      <p className={cn('text-sm', danger ? 'text-[#5C1417]' : 'text-brand-muted')}>
        {t(`${base}.intro`)}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {section.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                danger ? 'bg-[#C9353A]' : 'bg-brand-ink',
              )}
            />
            {/* Item keys come from content.ts; every one exists in both locale files. */}
            <span>{t(`${base}.items.${item}` as `homeCare.sections.hydration.items.ors`)}</span>
          </li>
        ))}
      </ul>

      {section.key === 'warning' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="danger"
            size="sm"
            leadingIcon={Siren}
            aria-haspopup="dialog"
            onClick={openEmergency}
          >
            {t('homeCare.openEmergency')}
          </Button>
          <Link to="/symptoms" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            <Stethoscope aria-hidden="true" className="h-4 w-4" />
            {t('homeCare.checkSymptoms')}
          </Link>
        </div>
      )}

      <p
        className={cn(
          'mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-xs',
          danger ? 'text-[#5C1417]' : 'text-brand-muted',
        )}
      >
        <span>{t('homeCare.source')}</span>
        <span>{t('homeCare.reviewedOn', { date: d(section.reviewedOn) })}</span>
      </p>
    </section>
  );
}

function PreventionChecklist() {
  const { t, n } = useLocale();
  const { isLoggedIn, query, checked, toggle, saveFailed } = usePreventionChecklist();
  const done = CHECKLIST_ITEMS.filter((id) => checked.includes(id)).length;

  const list = (
    <>
      <p className="mb-3 text-sm text-brand-muted" aria-live="polite">
        {t('homeCare.checklist.progress', { done: n(done), total: n(CHECKLIST_ITEMS.length) })}
      </p>
      <ul className="flex flex-col gap-2">
        {CHECKLIST_ITEMS.map((id) => (
          <li key={id}>
            <label className="flex min-h-touch cursor-pointer items-center gap-3 rounded-2xl bg-brand-canvas px-4 py-2.5 text-sm has-[:checked]:bg-brand-lime-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-ink">
              <input
                type="checkbox"
                checked={checked.includes(id)}
                onChange={() => toggle(id)}
                className="h-5 w-5 shrink-0 accent-brand-ink focus:outline-none"
              />
              <span>{t(`homeCare.checklist.items.${id}`)}</span>
            </label>
          </li>
        ))}
      </ul>
      {saveFailed && (
        <p role="alert" className="mt-3 text-sm font-medium text-[#B3262B]">
          {t('homeCare.checklist.saveError')}
        </p>
      )}
      <p className="mt-3 text-xs text-brand-muted">
        {isLoggedIn ? t('homeCare.checklist.savedAccount') : t('homeCare.checklist.savedDevice')}
      </p>
    </>
  );

  return (
    <Card
      title={t('homeCare.checklist.title')}
      titleAs="h2"
      icon={ListChecks}
      className="lg:col-span-2"
      actions={
        <Link
          to="/report"
          className={cn(buttonClasses({ variant: 'ghost', size: 'sm' }), 'text-sm')}
        >
          {t('homeCare.checklist.report')}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      }
    >
      {isLoggedIn ? (
        <QueryState
          query={query}
          skeleton={
            <SkeletonGroup className="flex flex-col gap-2">
              {CHECKLIST_ITEMS.slice(0, 4).map((id) => (
                <Skeleton key={id} shape="rect" className="h-11" />
              ))}
            </SkeletonGroup>
          }
          empty={null}
        >
          {() => list}
        </QueryState>
      ) : (
        list
      )}
    </Card>
  );
}
