import { useMemo } from 'react';
import { CloudOff, Siren } from 'lucide-react';
import { EmergencyNumbers } from '@/components/EmergencyNumbers';
import { Freshness } from '@/components/Freshness';
import { PageHeader } from '@/components/PageHeader';
import { RiskBadge } from '@/components/RiskBadge';
import { Badge, Card, EmptyState } from '@/components/ui';
import { readLastSeenRisk } from '@/lib/lastSeen';
import { useOnline } from '@/lib/pwa';
import { RISK_META } from '@/lib/risk';
import { useLocale } from '@/lib/useLocale';

/**
 * Offline help: emergency numbers (they work without internet) and the risk data last seen on
 * this device. Reached from the offline banner; works offline because the app shell is cached.
 */
export default function OfflinePage() {
  const { t, l, n } = useLocale();
  const online = useOnline();
  const saved = useMemo(() => readLastSeenRisk(), []);
  const rows = saved
    ? [...saved.divisions].sort(
        (a, b) =>
          RISK_META[a.riskLevel].rank - RISK_META[b.riskLevel].rank ||
          b.predictedCases - a.predictedCases,
      )
    : [];

  return (
    <>
      <PageHeader
        title={t('offline.title')}
        subtitle={online ? t('offline.subtitleOnline') : t('offline.subtitle')}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card tone="lime" title={t('emergency.callTitle')} icon={Siren} titleAs="h2">
          <p className="mb-3 text-sm">{t('offline.callHint')}</p>
          <EmergencyNumbers layout="sheet" />
        </Card>
        <Card title={t('offline.lastSeenTitle')} icon={CloudOff} titleAs="h2">
          {saved ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="lavender">{t('common.simulatedData')}</Badge>
                <Freshness
                  updatedAt={saved.generatedAt}
                  stale={false}
                  text={(time) => t('offline.forecastFrom', { time })}
                />
              </div>
              <ul className="flex flex-col gap-2">
                {rows.map((row) => {
                  const name = saved.names[row.divisionId];
                  return (
                    <li
                      key={row.divisionId}
                      className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-canvas px-4 py-2.5"
                    >
                      <span className="min-w-[6rem] flex-1 font-medium">
                        {name ? l(name) : row.divisionId}
                      </span>
                      <RiskBadge level={row.riskLevel} size="sm" />
                      <span className="text-xs text-brand-muted">
                        {t('offline.cases', { value: n(row.predictedCases) })}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-brand-muted">{t('offline.lastSeenHint')}</p>
            </>
          ) : (
            <EmptyState
              compact
              icon={CloudOff}
              title={t('offline.noDataTitle')}
              message={t('offline.noDataMessage')}
            />
          )}
        </Card>
      </div>
    </>
  );
}
