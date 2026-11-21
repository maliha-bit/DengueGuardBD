import { lazy, Suspense, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Pencil,
  Thermometer,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeleteFeverLogEntry, useFeverLog } from '@/api/queries';
import type { FeverLogEntry } from '@/api/types';
import { RequireLogin } from '@/app/RequireLogin';
import { Disclaimer } from '@/components/Disclaimer';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  EmptyState,
  Modal,
  SkeletonCard,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { FeverEntryForm } from './FeverEntryForm';
import { FEVER_C, hasWarningSign, toUnit, type TempUnit } from './feverSchema';

// Recharts is loaded only when the charts are shown (keeps the main bundle small).
const FeverCharts = lazy(() => import('./FeverCharts'));

const UNIT_KEY = 'dg.tempUnit';

function readUnit(): TempUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === 'F' ? 'F' : 'C';
  } catch {
    return 'C';
  }
}

/** Fever and fluid log (UC16). Login required. */
export default function FeverLogPage() {
  const { t } = useLocale();
  return (
    <RequireLogin title={t('feverLog.title')} message={t('feverLog.loginMessage')}>
      <FeverLog />
    </RequireLogin>
  );
}

function FeverLog() {
  const { t } = useLocale();
  const query = useFeverLog();
  const [unit, setUnitState] = useState<TempUnit>(readUnit);
  const [editing, setEditing] = useState<FeverLogEntry | null>(null);
  // Bumped after each save so the add form starts fresh.
  const [formKey, setFormKey] = useState(0);

  const setUnit = (next: TempUnit) => {
    setUnitState(next);
    try {
      localStorage.setItem(UNIT_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <PageHeader title={t('feverLog.title')} subtitle={t('feverLog.subtitle')} />
      <QueryState
        query={query}
        skeleton={
          <div className="grid gap-4 lg:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        }
        empty={null}
      >
        {(entries) => (
          <div className="flex flex-col gap-4">
            {hasWarningSign(entries) && <WarningBanner />}
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <FeverEntryForm
                key={editing ? `edit-${editing.entryId}` : `new-${formKey}`}
                entry={editing}
                entries={entries}
                unit={unit}
                onUnitChange={setUnit}
                onDone={() => {
                  setEditing(null);
                  setFormKey((k) => k + 1);
                }}
              />
              {entries.length > 0 ? (
                <Suspense
                  fallback={
                    <div className="grid gap-4">
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
                  }
                >
                  <FeverCharts entries={entries} unit={unit} />
                </Suspense>
              ) : (
                <Card>
                  <EmptyState
                    icon={Thermometer}
                    title={t('feverLog.emptyTitle')}
                    message={t('feverLog.emptyMessage')}
                  />
                </Card>
              )}
            </div>
            {entries.length > 0 && (
              <EntryList
                entries={entries}
                unit={unit}
                editingId={editing?.entryId ?? null}
                onEdit={(entry) => {
                  setEditing(entry);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDeleted={(id) => {
                  if (editing?.entryId === id) setEditing(null);
                }}
              />
            )}
          </div>
        )}
      </QueryState>
      <Disclaimer className="mt-6" />
    </>
  );
}

function WarningBanner() {
  const { t } = useLocale();
  return (
    <div
      role="alert"
      className="on-dark flex flex-wrap items-center gap-3 rounded-3xl bg-[#C9353A] p-4 text-white md:p-5"
    >
      <AlertTriangle aria-hidden="true" className="h-6 w-6 shrink-0" />
      <p className="min-w-[12rem] flex-1 font-semibold">{t('feverLog.warningBanner')}</p>
      <Link
        to="/symptoms"
        className={cn(buttonClasses({ variant: 'secondary', size: 'sm' }), 'text-[#8E1F23] ring-0')}
      >
        {t('feverLog.checkSymptoms')}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EntryList({
  entries,
  unit,
  editingId,
  onEdit,
  onDeleted,
}: {
  entries: FeverLogEntry[];
  unit: TempUnit;
  editingId: string | null;
  onEdit: (entry: FeverLogEntry) => void;
  onDeleted: (entryId: string) => void;
}) {
  const { t, n, d } = useLocale();
  const toast = useToast();
  const remove = useDeleteFeverLogEntry();
  const [confirming, setConfirming] = useState<FeverLogEntry | null>(null);

  const confirmDelete = async () => {
    if (!confirming) return;
    try {
      await remove.mutateAsync(confirming.entryId);
      onDeleted(confirming.entryId);
      toast({ tone: 'success', message: t('feverLog.deleted', { date: d(confirming.date) }) });
      setConfirming(null);
    } catch {
      toast({ tone: 'error', message: t('feverLog.deleteError') });
    }
  };

  return (
    <Card title={t('feverLog.list.title')} titleAs="h2" icon={ClipboardList}>
      <ul className="flex flex-col divide-y divide-brand-line">
        {entries.map((entry) => {
          const fever = entry.temperatureC >= FEVER_C;
          const date = d(entry.date, { weekday: 'short', day: 'numeric', month: 'short' });
          return (
            <li key={entry.entryId} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{date}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-muted">
                  <span className={fever ? 'font-medium text-[#8E1F23]' : undefined}>
                    {n(toUnit(entry.temperatureC, unit), { maximumFractionDigits: 1 })}°{unit}
                  </span>
                  <span>
                    {t('feverLog.list.glasses', {
                      count: entry.fluidGlasses,
                      value: n(entry.fluidGlasses),
                    })}
                  </span>
                  <span>{t(`feverLog.urine.${entry.urine}`)}</span>
                </p>
                {entry.warningSigns.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {entry.warningSigns.map((sign) => (
                      <Badge key={sign} tone="risk-high">
                        {t(`triage.options.warningSigns.${sign}`)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly={Pencil}
                  aria-label={t('feverLog.list.edit', { date })}
                  aria-pressed={editingId === entry.entryId}
                  onClick={() => onEdit(entry)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly={Trash2}
                  aria-label={t('feverLog.list.delete', { date })}
                  onClick={() => setConfirming(entry)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        size="sm"
        title={t('feverLog.list.confirmTitle')}
        description={
          confirming ? t('feverLog.list.confirmBody', { date: d(confirming.date) }) : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              leadingIcon={Trash2}
              loading={remove.isPending}
              onClick={confirmDelete}
            >
              {t('feverLog.list.confirmDelete')}
            </Button>
          </>
        }
      />
    </Card>
  );
}
