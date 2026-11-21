import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GlassWater, Thermometer } from 'lucide-react';
import type { FeverLogEntry } from '@/api/types';
import { Card } from '@/components/ui';
import { brandColors } from '@/lib/tokens';
import { useLocale } from '@/lib/useLocale';
import { FEVER_C, toUnit, type TempUnit } from './feverSchema';

/** Days shown in the charts. */
export const CHART_DAYS = 7;

const tooltipStyle = { borderRadius: 12, border: 'none', color: brandColors.ink };

/** Temperature line (light card) and fluids bars (dark card, lime bars). */
export default function FeverCharts({
  entries,
  unit,
}: {
  entries: FeverLogEntry[];
  unit: TempUnit;
}) {
  const { t, n, d } = useLocale();
  // Oldest → newest, last CHART_DAYS entries.
  const data = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-CHART_DAYS)
    .map((e) => ({
      label: d(e.date, { day: 'numeric', month: 'short' }),
      temperature: toUnit(e.temperatureC, unit),
      fluids: e.fluidGlasses,
    }));
  const deg = `°${unit}`;
  const one = (value: number) => n(value, { maximumFractionDigits: 1 });
  const tempSummary = data.map((p) => `${p.label}: ${one(p.temperature)}${deg}`).join(', ');
  const fluidSummary = data.map((p) => `${p.label}: ${n(p.fluids)}`).join(', ');
  const feverLine = toUnit(FEVER_C, unit);

  return (
    <div className="grid gap-4">
      <Card title={t('feverLog.charts.temperature')} titleAs="h2" icon={Thermometer}>
        <div
          className="h-48"
          role="img"
          aria-label={`${t('feverLog.charts.temperature')} — ${tempSummary}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={brandColors.line} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: brandColors.muted, fontSize: 12 }}
              />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(v: number) => n(Math.round(v))}
                tick={{ fill: brandColors.muted, fontSize: 12 }}
              />
              <ReferenceLine
                y={feverLine}
                stroke={brandColors['risk-high']}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  `${one(Number(value))}${deg}`,
                  t('feverLog.charts.tempLabel'),
                ]}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke={brandColors.ink}
                strokeWidth={2.5}
                dot={{
                  r: 5,
                  fill: brandColors.lavender,
                  stroke: brandColors.ink,
                  strokeWidth: 1.5,
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-brand-muted">
          <span
            aria-hidden="true"
            className="h-0 w-5 border-t-2 border-dashed border-brand-risk-high"
          />
          {t('feverLog.charts.feverLine', { value: one(feverLine), unit: deg })}
        </p>
      </Card>

      <Card tone="dark" title={t('feverLog.charts.fluids')} titleAs="h2" icon={GlassWater}>
        <div
          className="h-40"
          role="img"
          aria-label={`${t('feverLog.charts.fluids')} — ${fluidSummary}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                contentStyle={tooltipStyle}
                formatter={(value) => [n(Number(value)), t('feverLog.charts.glasses')]}
              />
              <Bar
                dataKey="fluids"
                fill={brandColors.lime}
                radius={[999, 999, 999, 999]}
                maxBarSize={22}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-white/70">{t('feverLog.charts.fluidsHint')}</p>
      </Card>
    </div>
  );
}
