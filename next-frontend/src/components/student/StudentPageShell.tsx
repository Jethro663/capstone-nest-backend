'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { containerReveal, itemReveal } from './student-motion';

export function StudentPageShell({
  badge = 'Student Space',
  title,
  description,
  actions,
  stats,
  children,
  className,
}: {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn('student-page mx-auto max-w-7xl space-y-8 p-6 md:p-10', className)}
      initial="hidden"
      animate="visible"
      variants={containerReveal}
    >
      <motion.section
        variants={itemReveal}
        className="student-panel student-play-panel relative rounded-[1.75rem] px-6 py-6 md:px-8"
      >
        <div className="absolute -left-8 top-0 h-32 w-32 rounded-full bg-[var(--student-accent-soft)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-[var(--student-hero-stripe)] blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="student-kicker inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em]">
                <Sparkles className="h-3.5 w-3.5" />
                {badge}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-[var(--student-text-strong)] md:text-[2.25rem]">
                  {title}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[var(--student-text-muted)] md:text-[15px]">
                  {description}
                </p>
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>
          {stats ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{stats}</div> : null}
        </div>
      </motion.section>
      {children}
    </motion.div>
  );
}

export function StudentPageStat({
  label,
  value,
  caption,
  icon: Icon,
  accent = 'bg-[var(--student-accent-soft)] text-[var(--student-accent)]',
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
}) {
  return (
    <motion.div variants={itemReveal}>
      <div className="student-card student-card-hover student-play-panel rounded-[1.5rem] p-4">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
              {label}
            </p>
            <div className="text-3xl font-black tracking-tight text-[var(--student-text-strong)]">
              {value}
            </div>
            {caption ? (
              <p className="text-xs font-medium text-[var(--student-text-muted)]">{caption}</p>
            ) : null}
          </div>
          {Icon ? (
            <div className={cn('rounded-2xl p-3 shadow-sm', accent)}>
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export function StudentSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <motion.div variants={itemReveal}>
      <Card className={cn('student-section-card overflow-hidden rounded-[1.7rem]', className)}>
        <CardHeader className="student-section-card__header pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black tracking-tight text-[var(--student-text-strong)]">
                {title}
              </CardTitle>
              {description ? (
                <p className="text-sm text-[var(--student-text-muted)]">{description}</p>
              ) : null}
            </div>
            {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
          </div>
        </CardHeader>
        <CardContent className={cn('p-6', contentClassName)}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
