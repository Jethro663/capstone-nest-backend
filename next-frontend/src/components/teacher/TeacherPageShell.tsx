'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TeacherPageShellProps {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface TeacherStatCardProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: LucideIcon;
  accent?: 'sky' | 'teal' | 'amber' | 'rose';
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

const accentMap = {
  sky: 'from-[#dbeafe] via-[#dbeafe] to-transparent text-[#2563eb]',
  teal: 'from-[#dcfce7] via-[#dcfce7] to-transparent text-[#15803d]',
  amber: 'from-[#fef3c7] via-[#fef3c7] to-transparent text-[#b45309]',
  rose: 'from-[#fee2e2] via-[#fee2e2] to-transparent text-[#b91c1c]',
} as const;

export function TeacherPageShell({
  badge = 'Teacher Workspace',
  title,
  description,
  actions,
  stats,
  children,
  className,
}: TeacherPageShellProps) {
  return (
    <div className={cn('teacher-page teacher-figma-page space-y-5 pb-4', className)}>
      <section className="teacher-figma-header teacher-figma-stagger">
        <div className="teacher-figma-header__copy">
          <div className="teacher-figma-header__icon">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="teacher-figma-header__badge">{badge}</p>
            <h1 className="teacher-figma-header__title">{title}</h1>
            <p className="teacher-figma-header__description">{description}</p>
          </div>
        </div>
        {actions ? <div className="teacher-figma-header__actions">{actions}</div> : null}
      </section>

      {stats ? (
        <section className="teacher-figma-stagger grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats}
        </section>
      ) : null}

      <section className="space-y-5">{children}</section>
    </div>
  );
}

export function TeacherStatCard({
  label,
  value,
  caption,
  icon: Icon,
  accent = 'sky',
}: TeacherStatCardProps) {
  return (
    <div className="teacher-figma-stat teacher-panel-hover relative overflow-hidden rounded-[14px] p-4">
      <div className={cn('absolute inset-x-0 top-0 h-full bg-gradient-to-br opacity-80', accentMap[accent])} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">
            {label}
          </p>
          <div className="text-[1.75rem] font-bold leading-none tracking-tight text-[var(--teacher-text-strong)]">
            {value}
          </div>
          {caption ? <p className="text-xs text-[var(--teacher-text-muted)]">{caption}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-[10px] border border-[#e2e8f0] bg-white p-2.5 text-[var(--teacher-accent)]">
            <Icon className="h-4 w-4" />
          </div>
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
      className={cn('teacher-figma-card overflow-hidden rounded-[15px] border-[#f1f5f9]', className)}
    >
      <CardHeader className="border-b border-[#f1f5f9] bg-[#ffffff] pb-3">
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
    <div className="teacher-soft-panel rounded-[14px] border border-dashed border-[#dbe2ec] px-6 py-8 text-center">
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
