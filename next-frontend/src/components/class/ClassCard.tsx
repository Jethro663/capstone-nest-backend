'use client';

import type { ReactNode } from 'react';
import { BookOpen, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import type { ClassItem } from '@/types/class';
import { getClassCardPreset } from './class-card-presets';

type Props = {
  classItem: ClassItem;
  subtitle: string;
  meta: string[];
  footer?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ClassCard({
  classItem,
  subtitle,
  meta,
  footer,
  action,
  className,
}: Props) {
  const preset = getClassCardPreset(classItem.cardPreset);

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-[1.5rem] border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
        preset.surfaceClass,
        className,
      )}
    >
      <div
        className={cn('relative h-28 overflow-hidden', preset.bannerClass)}
        style={
          classItem.cardBannerUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.20), rgba(15,23,42,0.72)), url(${classItem.cardBannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_40%)]" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <Badge className="border-white/20 bg-black/20 text-white backdrop-blur">
            {classItem.section?.gradeLevel
              ? `Grade ${classItem.section.gradeLevel}`
              : 'Class'}
          </Badge>
          {classItem.cardBannerUrl ? (
            <Badge className="border-white/20 bg-white/15 text-white backdrop-blur">
              <ImageIcon className="mr-1 h-3 w-3" /> Custom
            </Badge>
          ) : null}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight text-white">
              {classItem.subjectName || classItem.className || classItem.name}
            </p>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {classItem.subjectCode}
            </p>
          </div>
          <div className="rounded-xl bg-white/12 p-2 text-white backdrop-blur">
            <BookOpen className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{subtitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          {action}
        </div>

        {footer}
      </div>
    </div>
  );
}
