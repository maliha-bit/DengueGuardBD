import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brandColors } from '@/lib/tokens';
import { useLocale } from '@/lib/useLocale';

export interface ChartDatum {
  label: string;
  value: number;
}

/** One bar chart; the accessible name lists every value (charts are never the only source). */
export default function AnalyticsBarChart({
  data,
  title,
  color,
  onDark,
  horizontal,
}: {
  data: ChartDatum[];
  title: string;
  color: string;
  onDark?: boolean;
  horizontal?: boolean;
}) {
  const { n } = useLocale();
  const summary = data.map((p) => `${p.label}: ${n(p.value)}`).join(', ');
  const tick = { fill: onDark ? 'rgba(255,255,255,0.7)' : brandColors.muted, fontSize: 12 };
  return (
    <div className="h-52" role="img" aria-label={`${title} — ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 8, left: horizontal ? 8 : -16, bottom: 0 }}
        >
          {horizontal ? (
            <>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={tick}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={tick} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={tick}
                tickFormatter={(v: number) => n(v)}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: onDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            contentStyle={{ borderRadius: 12, border: 'none', color: brandColors.ink }}
            formatter={(value) => [n(Number(value)), title]}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[999, 999, 999, 999]}
            maxBarSize={22}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
