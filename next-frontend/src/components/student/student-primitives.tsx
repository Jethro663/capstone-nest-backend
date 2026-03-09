'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { itemReveal } from './student-motion';

export function StudentSectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--student-text-strong)]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm student-muted-text">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StudentStatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <motion.div variants={itemReveal}>
      <Card className="student-card student-card-hover">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm student-muted-text">{label}</p>
            <span className={cn('rounded-full p-2 text-white shadow-sm', accent)}>{icon}</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--student-text-strong)]">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StudentEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card className="student-card">
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="rounded-full border border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)] p-3 text-[var(--student-accent)]">{icon}</div>
        <p className="text-lg font-semibold text-[var(--student-text-strong)]">{title}</p>
        <p className="max-w-md text-sm student-muted-text">{description}</p>
      </CardContent>
    </Card>
  );
}

export function StudentStatusChip({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  children: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-900 border-amber-300'
      : tone === 'danger'
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : tone === 'info'
            ? 'bg-blue-100 text-blue-800 border-blue-300'
            : 'border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]';

  return (
    <Badge variant="outline" className={cn('border font-semibold', toneClass, className)}>
      {children}
    </Badge>
  );
}

export function StudentActionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('student-card student-card-hover', className)}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
