import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { CaseTrend } from '@/api/types';
import { formatWeekday } from '@/lib/format';
import { brandColors } from '@/lib/tokens';
import { useLocale } from '@/lib/useLocale';

/** Lime bars on the dark card. Monthly view: reported months lavender, forecast month lime. */
export default function CasesChart({ trend }: { trend: CaseTrend }) {
  const { t, n, d, lang } = useLocale();
  const label = (date: string) =>
    trend.period === 'weekly' ? formatWeekday(date, lang) : d(date, { month: 'short' });
  const data = trend.points.map((p) => ({ ...p, label: label(p.date) }));
  const summary = data.map((p) => `${p.label}: ${n(p.cases)}`).join(', ');
  const peak = Math.max(...data.map((p) => p.cases));

  return (
    <div>
      <div className="h-44" role="img" aria-label={`${t('dashboard.cases.title')} — ${summary}`}>
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
              contentStyle={{ borderRadius: 12, border: 'none', color: brandColors.ink }}
              formatter={(value) => [n(Number(value)), t('dashboard.cases.casesLabel')]}
            />
            <Bar
              dataKey="cases"
              radius={[999, 999, 999, 999]}
              maxBarSize={22}
              isAnimationActive={false}
            >
              {data.map((point) => (
                <Cell
                  key={point.date}
                  fill={point.isForecast ? brandColors.lime : brandColors.lavender}
                  // Weekly: the peak day stays full lime, other days are softer.
                  fillOpacity={trend.period === 'weekly' && point.cases !== peak ? 0.45 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {trend.period === 'monthly' && (
        <ul className="mt-2 flex gap-4 text-xs text-white/70">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-brand-lavender" />
            {t('dashboard.cases.reported')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-brand-lime" />
            {t('dashboard.cases.forecast')}
          </li>
        </ul>
      )}
    </div>
  );
}
