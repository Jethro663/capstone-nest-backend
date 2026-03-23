'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { classService } from '@/services/class-service';
import { SCHEDULE_DAYS, type ScheduleDay } from '@/utils/constants';
import type { ClassItem } from '@/types/class';
import { cn } from '@/utils/cn';

const DAY_LABELS: Record<string, string> = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  Th: 'Thursday',
  F: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

const DAY_SHORT: Record<string, string> = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  Th: 'Thu',
  F: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
};

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 19;

const CLASS_COLORS = [
  { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', dot: 'bg-red-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', dot: 'bg-rose-500' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', dot: 'bg-orange-500' },
  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', dot: 'bg-pink-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900', dot: 'bg-cyan-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', dot: 'bg-violet-500' },
];

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

interface FlatSlot {
  day: ScheduleDay;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  room: string;
  colorIndex: number;
}

interface SectionScheduleViewerProps {
  sectionId: string;
  theme?: 'default' | 'teacher';
}

export function SectionScheduleViewer({
  sectionId,
  theme = 'default',
}: SectionScheduleViewerProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await classService.getBySection(sectionId);
      setClasses(res.data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const flatSlots = useMemo<FlatSlot[]>(() => {
    const slots: FlatSlot[] = [];
    classes.forEach((cls, classIndex) => {
      if (!cls.schedules?.length) return;
      const teacherName = cls.teacher
        ? `${cls.teacher.firstName || ''} ${cls.teacher.lastName || ''}`.trim()
        : 'Unassigned';
      for (const sched of cls.schedules) {
        for (const day of sched.days) {
          slots.push({
            day,
            startTime: sched.startTime,
            endTime: sched.endTime,
            subjectName: cls.subjectName,
            subjectCode: cls.subjectCode,
            teacherName,
            room: cls.room || '—',
            colorIndex: classIndex % CLASS_COLORS.length,
          });
        }
      }
    });
    return slots;
  }, [classes]);

  const daySlotMap = useMemo(() => {
    const map: Record<string, FlatSlot[]> = {};
    for (const day of SCHEDULE_DAYS) map[day] = [];
    for (const slot of flatSlots) {
      map[slot.day]?.push(slot);
    }
    for (const day of SCHEDULE_DAYS) {
      map[day]?.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }
    return map;
  }, [flatSlots]);

  const { gridStart, gridEnd } = useMemo(() => {
    if (flatSlots.length === 0) {
      return { gridStart: GRID_START_HOUR, gridEnd: GRID_END_HOUR };
    }
    let minH = 24;
    let maxH = 0;
    for (const slot of flatSlots) {
      const sh = Math.floor(timeToMinutes(slot.startTime) / 60);
      const eh = Math.ceil(timeToMinutes(slot.endTime) / 60);
      if (sh < minH) minH = sh;
      if (eh > maxH) maxH = eh;
    }
    return {
      gridStart: Math.max(GRID_START_HOUR, minH - 1),
      gridEnd: Math.min(GRID_END_HOUR, maxH + 1),
    };
  }, [flatSlots]);

  const hourSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = gridStart; h <= gridEnd; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, [gridStart, gridEnd]);

  const classesWithSchedules = classes.filter((c) => (c.schedules?.length ?? 0) > 0);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (classesWithSchedules.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Section Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground text-sm">
            No class schedules have been set for this section yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalGridMinutes = (gridEnd - gridStart) * 60;
  const isTeacherTheme = theme === 'teacher';

  const getSlotStyle = (slot: FlatSlot): React.CSSProperties => {
    const startMin = timeToMinutes(slot.startTime) - gridStart * 60;
    const endMin = timeToMinutes(slot.endTime) - gridStart * 60;
    const top = (startMin / totalGridMinutes) * 100;
    const height = ((endMin - startMin) / totalGridMinutes) * 100;
    return { top: `${top}%`, height: `${height}%` };
  };

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isTeacherTheme &&
          'rounded-[1.7rem] border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,244,244,0.92))] shadow-[0_28px_60px_-38px_rgba(127,29,29,0.16)]',
      )}
    >
      <CardHeader
        className={cn(
          'pb-3',
          isTeacherTheme && 'border-b border-[var(--teacher-outline)] bg-white/55',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle
            className={cn('text-lg', isTeacherTheme && 'text-[var(--teacher-text-strong)]')}
          >
            Section Schedule
          </CardTitle>
          <span
            className={cn(
              'text-sm text-muted-foreground',
              isTeacherTheme && 'text-[var(--teacher-text-muted)]',
            )}
          >
            {classesWithSchedules.length} class
            {classesWithSchedules.length !== 1 ? 'es' : ''} scheduled
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <div
          className={cn(
            'overflow-hidden rounded-xl border',
            isTeacherTheme
              ? 'border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,244,244,0.88))]'
              : 'bg-card',
          )}
        >
          <div
            className={cn(
              'flex border-b bg-muted/40',
              isTeacherTheme && 'border-[var(--teacher-outline)] bg-white/55',
            )}
          >
            <div className="w-16 shrink-0 sm:w-20" />
            {SCHEDULE_DAYS.map((day) => (
              <div
                key={day}
                className={cn(
                  'min-w-0 flex-1 border-r px-1 py-2.5 text-center font-semibold text-muted-foreground last:border-r-0',
                  isTeacherTheme &&
                    'border-[var(--teacher-outline)] text-[var(--teacher-text-muted)]',
                )}
              >
                <span className="hidden text-xs uppercase tracking-wider sm:inline">
                  {DAY_SHORT[day]}
                </span>
                <span className="text-[11px] uppercase tracking-wider sm:hidden">
                  {day}
                </span>
              </div>
            ))}
          </div>

          <div className="flex max-h-[500px] overflow-y-auto">
            <div className="w-16 shrink-0 sm:w-20">
              {hourSlots.map((time) => (
                <div
                  key={time}
                  className={cn(
                    'flex h-14 items-start justify-end border-b border-border/30 pr-2 pt-0.5 sm:h-16',
                    isTeacherTheme && 'border-[var(--teacher-outline)]',
                  )}
                >
                  <span
                    className={cn(
                      'whitespace-nowrap text-[11px] font-medium text-muted-foreground sm:text-xs',
                      isTeacherTheme && 'text-[var(--teacher-text-muted)]',
                    )}
                  >
                    {formatTime12h(time).replace(':00 ', ' ')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex min-w-0 flex-1">
              {SCHEDULE_DAYS.map((day) => {
                const dayEntries = daySlotMap[day] || [];
                return (
                  <div key={day} className="relative min-w-0 flex-1">
                    {hourSlots.map((time) => (
                      <div
                        key={time}
                        className={cn(
                          'h-14 border-b border-r border-border/30 sm:h-16',
                          isTeacherTheme && 'border-[var(--teacher-outline)]',
                        )}
                      />
                    ))}

                    {dayEntries.map((slot, index) => {
                      const color = CLASS_COLORS[slot.colorIndex];
                      return (
                        <TooltipProvider
                          key={`${slot.subjectCode}-${slot.startTime}-${index}`}
                          delayDuration={100}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute inset-x-0.5 z-10 flex cursor-default flex-col justify-center overflow-hidden rounded-lg border-2 px-1 py-0.5 shadow-sm transition-shadow hover:shadow-md sm:inset-x-1 sm:px-2 ${color.bg} ${color.border} ${color.text}`}
                                style={getSlotStyle(slot)}
                              >
                                <span className="truncate text-[11px] font-bold leading-snug sm:text-xs">
                                  {slot.subjectCode}
                                </span>
                                <span className="truncate text-[10px] leading-snug opacity-80 sm:text-[11px]">
                                  {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
                                </span>
                                <span className="hidden truncate text-[10px] leading-snug opacity-60 sm:block">
                                  {slot.room !== '—' ? slot.room : ''}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-60 space-y-0.5">
                              <p className="text-sm font-semibold">{slot.subjectName}</p>
                              <p className="text-xs text-muted-foreground">
                                {DAY_LABELS[slot.day]} · {formatTime12h(slot.startTime)} -{' '}
                                {formatTime12h(slot.endTime)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Teacher: {slot.teacherName}
                              </p>
                              <p className="text-xs text-muted-foreground">Room: {slot.room}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-2 pb-2 pt-4 sm:px-0">
          {classesWithSchedules.map((cls, index) => {
            const color = CLASS_COLORS[index % CLASS_COLORS.length];
            return (
              <Badge
                key={cls.id}
                variant="outline"
                className={cn(
                  'gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                  color.border,
                  color.text,
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', color.dot)} />
                {cls.subjectCode}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
