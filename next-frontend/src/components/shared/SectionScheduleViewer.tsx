'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

const DAY_LABELS: Record<ScheduleDay, string> = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  Th: 'Thursday',
  F: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

const DAY_SHORT: Record<ScheduleDay, string> = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  Th: 'Thu',
  F: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
};

const GRID_MINUTES_START = 6 * 60;
const GRID_MINUTES_END = 21 * 60;
const GRID_STEP_MINUTES = 30;
const PIXELS_PER_MINUTE = 1.2;
const DEFAULT_VIEWPORT_HEIGHT = 420;

const CLASS_COLORS = [
  { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', dot: 'bg-red-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', dot: 'bg-rose-500' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', dot: 'bg-orange-500' },
  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', dot: 'bg-pink-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900', dot: 'bg-cyan-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', dot: 'bg-violet-500' },
] as const;

type FlatSlot = {
  day: ScheduleDay;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  room: string;
  colorIndex: number;
};

type TimeMark = {
  minute: number;
  label: string;
  isHour: boolean;
};

interface SectionScheduleViewerProps {
  sectionId: string;
  theme?: 'default' | 'teacher';
  chrome?: 'card' | 'flat';
}

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

function formatMinuteLabel(minute: number) {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  return formatTime12h(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
}

export function SectionScheduleViewer({
  sectionId,
  theme = 'default',
  chrome = 'card',
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

      cls.schedules.forEach((schedule) => {
        schedule.days.forEach((day) => {
          slots.push({
            day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            subjectName: cls.subjectName,
            subjectCode: cls.subjectCode,
            teacherName,
            room: cls.room || '-',
            colorIndex: classIndex % CLASS_COLORS.length,
          });
        });
      });
    });

    return slots;
  }, [classes]);

  const classesWithSchedules = useMemo(
    () => classes.filter((entry) => (entry.schedules?.length ?? 0) > 0),
    [classes],
  );

  const daySlotMap = useMemo(() => {
    const map: Record<ScheduleDay, FlatSlot[]> = {
      M: [],
      T: [],
      W: [],
      Th: [],
      F: [],
      Sa: [],
      Su: [],
    };

    flatSlots.forEach((slot) => {
      map[slot.day].push(slot);
    });

    SCHEDULE_DAYS.forEach((day) => {
      map[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    });

    return map;
  }, [flatSlots]);

  const rangeStart = GRID_MINUTES_START;
  const rangeEnd = GRID_MINUTES_END;

  const timeMarks = useMemo<TimeMark[]>(() => {
    const marks: TimeMark[] = [];

    for (let minute = rangeStart; minute <= rangeEnd; minute += GRID_STEP_MINUTES) {
      marks.push({
        minute,
        label: formatMinuteLabel(minute),
        isHour: minute % 60 === 0,
      });
    }

    return marks;
  }, [rangeEnd, rangeStart]);

  const timelineHeight = Math.max((rangeEnd - rangeStart) * PIXELS_PER_MINUTE, 360);
  const isTeacherTheme = theme === 'teacher';
  const isFlat = chrome === 'flat';

  const getBlockStyle = (slot: FlatSlot): React.CSSProperties => {
    const top = (timeToMinutes(slot.startTime) - rangeStart) * PIXELS_PER_MINUTE;
    const height = (timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)) * PIXELS_PER_MINUTE;

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  if (loading) {
    return isFlat ? (
      <div className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    ) : (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[360px] rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (classesWithSchedules.length === 0) {
    return isFlat ? (
      <div className="rounded-xl border border-[var(--admin-outline)] bg-[#fbfcfe] px-4 py-8 text-center text-sm text-muted-foreground">
        No class schedules have been set for this section yet.
      </div>
    ) : (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Section Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No class schedules have been set for this section yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const scheduleContent = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className={cn('text-lg', isTeacherTheme && 'text-[var(--teacher-text-strong)]')}>
            Section Schedule
          </CardTitle>
          <p className={cn('text-sm text-muted-foreground', isTeacherTheme && 'text-[var(--teacher-text-muted)]')}>
            Blocks are aligned directly to their actual start and end times.
          </p>
        </div>
        <span
          className={cn(
            'text-sm font-semibold text-muted-foreground',
            isTeacherTheme && 'text-[var(--teacher-text-muted)]',
          )}
        >
          {classesWithSchedules.length} class{classesWithSchedules.length === 1 ? '' : 'es'} scheduled
        </span>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border',
          isTeacherTheme
            ? 'border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,244,244,0.88))]'
            : 'border-[var(--admin-outline)] bg-white',
        )}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div
              className={cn(
                'flex border-b bg-[#f8fbff]',
                isTeacherTheme && 'border-[var(--teacher-outline)] bg-white/55',
              )}
            >
              <div className="w-16 shrink-0 border-r border-[var(--admin-outline)] sm:w-20" />
              {SCHEDULE_DAYS.map((day) => (
                <div
                  key={day}
                  className={cn(
                    'min-w-[92px] flex-1 border-r px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground last:border-r-0',
                    isTeacherTheme && 'border-[var(--teacher-outline)] text-[var(--teacher-text-muted)]',
                  )}
                >
                  {DAY_SHORT[day]}
                </div>
              ))}
            </div>

            <div
              className="overflow-y-auto"
              style={{ maxHeight: `${DEFAULT_VIEWPORT_HEIGHT}px` }}
            >
              <div className="flex">
                <div
                  className="relative w-16 shrink-0 border-r border-[var(--admin-outline)] bg-[#fbfcfe] sm:w-20"
                  style={{ height: `${timelineHeight}px` }}
                >
                  {timeMarks.map((mark) => {
                    const top = (mark.minute - rangeStart) * PIXELS_PER_MINUTE;

                    return (
                      <div
                        key={mark.minute}
                        className="absolute inset-x-0"
                        style={{ top: `${top}px` }}
                      >
                        {mark.isHour ? (
                          <span className="absolute -translate-y-1/2 right-2 text-[11px] font-medium text-muted-foreground sm:text-xs">
                            {mark.label.replace(':00 ', ' ')}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="flex min-w-0 flex-1">
                  {SCHEDULE_DAYS.map((day) => (
                    <div
                      key={day}
                      className={cn(
                        'relative min-w-[92px] flex-1 border-r last:border-r-0',
                        isTeacherTheme ? 'border-[var(--teacher-outline)]' : 'border-[var(--admin-outline)]',
                      )}
                      style={{ height: `${timelineHeight}px` }}
                    >
                      {timeMarks.map((mark, index) => {
                        if (index === timeMarks.length - 1) return null;

                        const top = (mark.minute - rangeStart) * PIXELS_PER_MINUTE;

                        return (
                          <div
                            key={`${day}-${mark.minute}`}
                            className={cn(
                              'absolute inset-x-0 border-t',
                              mark.isHour ? 'border-[rgba(15,23,42,0.16)]' : 'border-[rgba(15,23,42,0.08)]',
                              isTeacherTheme && (mark.isHour ? 'border-[rgba(127,29,29,0.2)]' : 'border-[rgba(127,29,29,0.1)]'),
                            )}
                            style={{ top: `${top}px` }}
                          />
                        );
                      })}

                      {daySlotMap[day].map((slot, index) => {
                        const color = CLASS_COLORS[slot.colorIndex];
                        const durationMinutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
                        const isCompact = durationMinutes < 60;

                        return (
                          <TooltipProvider key={`${day}-${slot.subjectCode}-${slot.startTime}-${index}`} delayDuration={120}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'absolute inset-x-1 z-10 overflow-hidden rounded-lg border px-2 py-1 shadow-sm',
                                    color.bg,
                                    color.border,
                                    color.text,
                                  )}
                                  style={getBlockStyle(slot)}
                                >
                                  <div className="flex h-full flex-col justify-between gap-1">
                                    <div className="min-w-0">
                                      <p className="truncate text-[11px] font-bold sm:text-xs">
                                        {slot.subjectCode}
                                      </p>
                                      <p className="truncate text-[10px] leading-tight opacity-85 sm:text-[11px]">
                                        {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
                                      </p>
                                    </div>
                                    {!isCompact ? (
                                      <p className="truncate text-[10px] leading-tight opacity-70">
                                        {slot.room !== '-' ? slot.room : slot.teacherName}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-60 space-y-1">
                                <p className="text-sm font-semibold">{slot.subjectName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {DAY_LABELS[slot.day]} · {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
                                </p>
                                <p className="text-xs text-muted-foreground">Teacher: {slot.teacherName}</p>
                                <p className="text-xs text-muted-foreground">Room: {slot.room}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
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
    </div>
  );

  if (isFlat) {
    return scheduleContent;
  }

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isTeacherTheme &&
          'rounded-[1.7rem] border-[var(--teacher-outline)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,244,244,0.92))] shadow-[0_28px_60px_-38px_rgba(127,29,29,0.16)]',
      )}
    >
      <CardContent className="p-4 sm:p-6">{scheduleContent}</CardContent>
    </Card>
  );
}
