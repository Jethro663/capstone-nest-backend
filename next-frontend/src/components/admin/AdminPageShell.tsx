'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';

export function AdminPageShell({
  badge,
  title,
  description,
  actions,
  stats,
  meta,
  children,
  className,
  variant = 'default',
}: {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  stats?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'compact-form';
}) {
  const isCompact = variant === 'compact-form';

  return (
    <div className={cn('admin-page space-y-6 pb-6', isCompact && 'admin-page--compact', className)}>
      <section className={cn('admin-page-header', isCompact && 'admin-page-header--compact')}>
        <div className={cn('admin-page-header__copy', isCompact && 'admin-page-header__copy--compact')}>
          <div className="space-y-1">
            <h1 className="admin-page-header__title">{title}</h1>
            <p className="admin-page-header__description">{description}</p>
            {badge ? <p className="admin-page-header__eyebrow">{badge}</p> : null}
          </div>
        </div>
        {actions ? <div className={cn('admin-page-header__actions', isCompact && 'admin-page-header__actions--compact')}>{actions}</div> : null}
      </section>

      {meta ? <section className="admin-compact-meta">{meta}</section> : null}
      {stats ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{stats}</section> : null}
      {children}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  caption,
  accent = 'emerald',
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: LucideIcon;
  accent?: 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';
}) {
  return (
    <div className={cn('admin-stat-card', `admin-stat-card--${accent}`)}>
      <div className="space-y-2">
        <p className="admin-stat-card__label">{label}</p>
        <div className="admin-stat-card__value">{value}</div>
        {caption ? <p className="admin-stat-card__caption">{caption}</p> : null}
      </div>
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  density = 'default',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  density?: 'default' | 'compact';
}) {
  const isCompact = density === 'compact';

  return (
    <Card className={cn('admin-section-card overflow-hidden rounded-xl', isCompact && 'admin-section-card--compact rounded-lg', className)}>
      <CardHeader className={cn('admin-section-card__header pb-4', isCompact && 'pb-3')}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className={cn('text-xl font-semibold tracking-tight text-[var(--admin-text-strong)]', isCompact && 'text-lg')}>
              {title}
            </CardTitle>
            {description ? <p className={cn('text-sm text-[var(--admin-text-muted)]', isCompact && 'text-[0.82rem]')}>{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('p-6', isCompact && 'p-4 md:p-5', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-state rounded-xl px-6 py-10 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <p className="text-lg font-semibold tracking-tight text-[var(--admin-text-strong)]">{title}</p>
        <p className="text-sm leading-6 text-[var(--admin-text-muted)]">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
