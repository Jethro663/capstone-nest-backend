'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TeacherPageShellProps {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  stats?: ReactNode;
  headerStats?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface TeacherStatCardProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: LucideIcon;
  accent?: 'sky' | 'teal' | 'amber' | 'rose';
  showIcon?: boolean;
  valueInHeader?: boolean;
}

interface TeacherSectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

interface TeacherEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

interface TeacherHeaderMetricProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  accent?: 'neutral' | 'sky' | 'teal' | 'amber' | 'rose';
}

const headerMetricAccentMap = {
  neutral: 'border-[#e2e8f0]',
  sky: 'border-[#bfdbfe]',
  teal: 'border-[#bbf7d0]',
  amber: 'border-[#fde68a]',
  rose: 'border-[#fecdd3]',
} as const;

const headerMetricDotMap = {
  neutral: 'bg-slate-300',
  sky: 'bg-sky-500',
  teal: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
} as const;

export function TeacherPageShell({
  badge,
  title,
  description,
  actions,
  stats,
  headerStats,
  children,
  className,
}: TeacherPageShellProps) {
  return (
    <div className={cn('teacher-page space-y-5 pb-4', className)}>
      <section className="teacher-figma-header">
        <div className="teacher-figma-header__copy">
          <div className="space-y-3">
            <h1 className="teacher-figma-header__title">{title}</h1>
            <p className="teacher-figma-header__description">{description}</p>
            {badge ? <p className="teacher-figma-header__badge">{badge}</p> : null}
            {headerStats ? <div className="flex flex-wrap gap-2 pt-1">{headerStats}</div> : null}
          </div>
        </div>
        {actions ? <div className="teacher-figma-header__actions">{actions}</div> : null}
      </section>

      {stats ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats}
        </section>
      ) : null}

      <section className="space-y-5">{children}</section>
    </div>
  );
}

export function TeacherHeaderMetric({
  label,
  value,
  caption,
  accent = 'neutral',
}: TeacherHeaderMetricProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-[10px] border bg-white px-3 py-2 shadow-none',
        headerMetricAccentMap[accent],
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', headerMetricDotMap[accent])}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">
          {label}
        </p>
      </div>
      <p className="mt-1.5 text-[1rem] font-semibold leading-none tracking-tight text-[var(--teacher-text-strong)]">
        {value}
      </p>
      {caption ? <p className="mt-1 text-[10px] leading-4 text-[var(--teacher-text-muted)]">{caption}</p> : null}
    </div>
  );
}

export function TeacherStatCard({
  label,
  value,
  caption,
  accent = 'sky',
  valueInHeader = false,
}: TeacherStatCardProps) {
  return (
    <div className={cn('teacher-figma-stat rounded-xl p-4', `teacher-figma-stat--${accent}`)}>
      <div className="min-w-0 space-y-1.5">
        <div className={cn('gap-3', valueInHeader ? 'flex items-start justify-between' : 'space-y-1.5')}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">
            {label}
          </p>
          {valueInHeader ? (
            <div className="shrink-0 text-right text-[1.75rem] font-semibold leading-none tracking-tight text-[var(--teacher-text-strong)]">
              {value}
            </div>
          ) : null}
        </div>
        {!valueInHeader ? (
          <div className="text-[1.75rem] font-semibold leading-none tracking-tight text-[var(--teacher-text-strong)]">
            {value}
          </div>
        ) : null}
        {caption ? (
          <p className={cn('text-xs text-[var(--teacher-text-muted)]', valueInHeader && 'pr-2')}>
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TeacherSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: TeacherSectionCardProps) {
  return (
    <Card
      variant="teacher"
      className={cn('teacher-figma-card overflow-hidden rounded-xl', className)}
    >
      <CardHeader className="border-b border-[var(--teacher-outline)] bg-[var(--teacher-surface)] pb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-[1.05rem] font-semibold tracking-tight text-[var(--teacher-text-strong)]">
              {title}
            </CardTitle>
            {description ? <p className="text-sm text-[var(--teacher-text-muted)]">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('p-4 md:p-5', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function TeacherEmptyState({
  title,
  description,
  action,
}: TeacherEmptyStateProps) {
  return (
    <div className="teacher-soft-panel rounded-xl border border-dashed border-[var(--teacher-outline)] px-6 py-8 text-center">
      <div className="mx-auto max-w-md space-y-2">
        <p className="text-base font-semibold tracking-tight text-[var(--teacher-text-strong)]">
          {title}
        </p>
        <p className="text-sm leading-6 text-[var(--teacher-text-muted)]">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
