'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
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
  sky: 'from-sky-500/18 via-cyan-400/10 to-transparent text-sky-700 dark:text-sky-200',
  teal: 'from-teal-500/18 via-emerald-400/10 to-transparent text-teal-700 dark:text-teal-200',
  amber: 'from-amber-400/24 via-orange-300/10 to-transparent text-amber-700 dark:text-amber-200',
  rose: 'from-rose-500/18 via-pink-400/10 to-transparent text-rose-700 dark:text-rose-200',
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
    <div className={cn('teacher-page space-y-6 pb-4', className)}>
      <section className="teacher-panel relative overflow-hidden rounded-[1.9rem] px-6 py-6 md:px-8 md:py-8">
        <div className="teacher-highlight absolute inset-0 opacity-90" />
        <div className="absolute -left-10 top-0 h-36 w-36 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="teacher-kicker inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em]">
                <Sparkles className="h-3.5 w-3.5" />
                {badge}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-[var(--teacher-text-strong)] md:text-[2.2rem]">
                  {title}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[var(--teacher-text-muted)] md:text-[15px]">
                  {description}
                </p>
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>

          {stats ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{stats}</div> : null}
        </div>
      </section>

      {children}
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
    <div className="teacher-soft-panel teacher-panel-hover relative overflow-hidden rounded-[1.5rem] p-4">
      <div className={cn('absolute inset-x-0 top-0 h-full bg-gradient-to-br opacity-90', accentMap[accent])} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--teacher-text-muted)]">
            {label}
          </p>
          <div className="text-3xl font-black tracking-tight text-[var(--teacher-text-strong)]">
            {value}
          </div>
          {caption ? (
            <p className="text-xs font-medium text-[var(--teacher-text-muted)]">{caption}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl border border-white/30 bg-white/45 p-3 text-[var(--teacher-accent)] shadow-sm">
            <Icon className="h-5 w-5" />
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
      className={cn('overflow-hidden rounded-[1.7rem] border-white/30', className)}
    >
      <CardHeader className="border-b border-white/20 bg-white/35 pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black tracking-tight text-[var(--teacher-text-strong)]">
              {title}
            </CardTitle>
            {description ? (
              <p className="text-sm text-[var(--teacher-text-muted)]">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('p-6', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function TeacherEmptyState({
  title,
  description,
  action,
}: TeacherEmptyStateProps) {
  return (
    <div className="teacher-soft-panel rounded-[1.5rem] px-6 py-10 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <p className="text-lg font-black tracking-tight text-[var(--teacher-text-strong)]">
          {title}
        </p>
        <p className="text-sm leading-6 text-[var(--teacher-text-muted)]">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
