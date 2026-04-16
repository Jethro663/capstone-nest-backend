'use client';

import type { AdminAnalyticsChart } from '@/types/admin-chatbot';

type Props = {
  chart: AdminAnalyticsChart;
};

function formatValue(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function renderBarChart(chart: AdminAnalyticsChart) {
  const values = chart.series[0]?.data ?? [];
  const maxValue = Math.max(...values, 1);

  return (
    <div className="space-y-3">
      {chart.labels.map((label, index) => {
        const value = values[index] ?? 0;
        const width = `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`;

        return (
          <div key={`${label}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-xs text-[var(--admin-text-muted)]">
              <span className="truncate">{label}</span>
              <span>{formatValue(value)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-black/5">
              <div
                className="h-full rounded-full bg-[var(--admin-accent)] transition-[width] duration-300"
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderLineChart(chart: AdminAnalyticsChart) {
  const values = chart.series[0]?.data ?? [];
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const width = 320;
  const height = 140;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const range = Math.max(maxValue - minValue, 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - minValue) / range) * height;
    return `${x},${y}`;
  });

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height + 16}`} className="w-full overflow-visible">
        <polyline
          fill="none"
          stroke="var(--admin-accent)"
          strokeWidth="3"
          points={points.join(' ')}
        />
        {values.map((value, index) => {
          const x = index * step;
          const y = height - ((value - minValue) / range) * height;
          return (
            <circle
              key={`${chart.labels[index]}-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill="var(--admin-accent)"
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-xs text-[var(--admin-text-muted)]">
        {chart.labels.map((label, index) => (
          <div key={`${label}-${index}`} className="truncate">
            {label}: {formatValue(values[index] ?? 0)}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPieChart(chart: AdminAnalyticsChart) {
  const values = chart.series[0]?.data ?? [];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return <p className="text-xs text-[var(--admin-text-muted)]">No chart data available.</p>;
  }

  const palette = ['#1d4ed8', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#dc2626'];
  let current = 0;
  const segments = values.map((value, index) => {
    const start = current / total;
    current += value;
    const end = current / total;
    const largeArc = end - start > 0.5 ? 1 : 0;
    const startAngle = start * Math.PI * 2 - Math.PI / 2;
    const endAngle = end * Math.PI * 2 - Math.PI / 2;
    const x1 = 60 + Math.cos(startAngle) * 50;
    const y1 = 60 + Math.sin(startAngle) * 50;
    const x2 = 60 + Math.cos(endAngle) * 50;
    const y2 = 60 + Math.sin(endAngle) * 50;

    return (
      <path
        key={`${chart.labels[index]}-${index}`}
        d={`M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={palette[index % palette.length]}
      />
    );
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
        {segments}
        {chart.type === 'donut' ? <circle cx="60" cy="60" r="22" fill="white" /> : null}
      </svg>
      <div className="space-y-2 text-xs text-[var(--admin-text-muted)]">
        {chart.labels.map((label, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: palette[index % palette.length] }}
            />
            <span>
              {label}: {formatValue(values[index] ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAnalyticsChatChart({ chart }: Props) {
  return (
    <section className="mt-4 rounded-[1.15rem] border border-[#e4ebf3] bg-[#f9fbfd] p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">
            {chart.title}
          </h3>
          <p className="text-xs text-[var(--admin-text-muted)]">
            {chart.xAxisLabel || 'Label'} to {chart.yAxisLabel || chart.series[0]?.name || 'Value'}
          </p>
        </div>
      </div>

      {chart.type === 'bar' && renderBarChart(chart)}
      {chart.type === 'line' && renderLineChart(chart)}
      {(chart.type === 'pie' || chart.type === 'donut') && renderPieChart(chart)}
    </section>
  );
}
