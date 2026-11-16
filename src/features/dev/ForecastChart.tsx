import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import { brandColors } from '@/lib/tokens';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
// Simulated values for the UI kit only — not real data.
const VALUES = [42, 48, 55, 61, 58, 66, 72];

/** Dark chart card body: lime bars on #1C1C1E, peak bar highlighted. */
export function ForecastChart() {
  const { t, i18n } = useTranslation();
  const data = DAYS.map((day, i) => ({ day: t(`dev.days.${day}`), value: VALUES[i] ?? 0 }));
  const peak = Math.max(...VALUES);
  return (
    <div className="h-44" role="img" aria-label={t('dev.forecastCaption')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.06)' }}
            contentStyle={{ borderRadius: 12, border: 'none', color: brandColors.ink }}
            formatter={(value) => [formatNumber(Number(value), i18n.language), t('dev.riskIndex')]}
          />
          <Bar dataKey="value" radius={[999, 999, 999, 999]} barSize={18}>
            {data.map((entry) => (
              <Cell
                key={entry.day}
                fill={entry.value === peak ? brandColors.lime : brandColors.lavender}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
