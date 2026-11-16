import { cn } from '@/lib/cn';
import { RISK_LEVELS_ASC, riskMeta } from '@/lib/risk';
import { useLocale } from '@/lib/useLocale';

/** Low / Medium / High with colour, icon and text. */
export function RiskLegend({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <section
      aria-labelledby="risk-legend-title"
      className={cn('rounded-2xl bg-white p-3 text-brand-ink shadow-md', className)}
    >
      <h2 id="risk-legend-title" className="mb-2 text-xs font-semibold">
        {t('riskMap.legend')}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {RISK_LEVELS_ASC.map((level) => {
          const { color, icon: Icon, labelKey } = riskMeta(level);
          return (
            <li key={level} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full text-brand-ink"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              {t(labelKey)}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
