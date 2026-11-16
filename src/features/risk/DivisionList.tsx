import { ChevronRight } from 'lucide-react';
import type { DivisionId } from '@/api/types';
import { RiskBadge } from '@/components/RiskBadge';
import { TrendIndicator } from '@/components/TrendIndicator';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/useLocale';
import { sortByRisk, type DivisionRisk } from './riskUtils';

/** All divisions, highest risk first. Same data and detail panel as the map. */
export function DivisionList({
  items,
  selectedId,
  onSelect,
}: {
  items: DivisionRisk[];
  selectedId: DivisionId | null;
  onSelect: (id: DivisionId) => void;
}) {
  const { t, l, n } = useLocale();
  return (
    <ol aria-label={t('riskMap.listLabel')} className="flex flex-col gap-2">
      {sortByRisk(items).map(({ division, today, trend }) => {
        const selected = division.divisionId === selectedId;
        return (
          <li key={division.divisionId}>
            <button
              type="button"
              onClick={() => onSelect(division.divisionId)}
              aria-current={selected ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left transition-colors hover:bg-white/70',
                selected && 'ring-2 ring-inset ring-brand-ink',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">{l(division.name)}</span>
                <span className="mt-0.5 block text-xs text-brand-muted">
                  {t('riskMap.todayCases', { count: n(today.predictedCases) })}
                </span>
              </span>
              <span className="flex flex-wrap items-center justify-end gap-2">
                <RiskBadge level={today.riskLevel} size="sm" />
                <TrendIndicator trend={trend} className="py-0.5 text-xs" />
              </span>
              <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-muted" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
