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

// ─── Constants ────────────────────────────────────────────────────────────────

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
  M: 'Mon', T: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri', Sa: 'Sat', Su: 'Sun',
};

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 19; // 7 PM — tighter for viewer
const HOUR_SLOTS: string[] = [];
for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
  HOUR_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
}

/**
 * Curated palette — vibrant but soft, optimised for contrast on both
 * light and dark backgrounds. Each class gets a unique hue.
 */
const CLASS_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-900 dark:text-blue-100', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-900 dark:text-emerald-100', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-900 dark:text-violet-100', dot: 'bg-violet-500' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-900 dark:text-amber-100', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-900 dark:text-rose-100', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-900 dark:text-cyan-100', dot: 'bg-cyan-500' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-900 dark:text-orange-100', dot: 'bg-orange-500' },
  { bg: 'bg-pink-100 dark:bg-pink-900/40', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-900 dark:text-pink-100', dot: 'bg-pink-500' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SectionScheduleViewer({ sectionId }: SectionScheduleViewerProps) {
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

  // Flatten all class schedules into per-day slots with metadata
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

  // Group by day for the grid
  const daySlotMap = useMemo(() => {
    const map: Record<string, FlatSlot[]> = {};
    for (const day of SCHEDULE_DAYS) map[day] = [];
    for (const slot of flatSlots) {
      map[slot.day]?.push(slot);
    }
    // Sort each day by start time
    for (const day of SCHEDULE_DAYS) {
      map[day]?.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }
    return map;
  }, [flatSlots]);

  // Determine actual grid range from data
  const { gridStart, gridEnd } = useMemo(() => {
    if (flatSlots.length === 0) return { gridStart: GRID_START_HOUR, gridEnd: GRID_END_HOUR };
    let minH = 24;
    let maxH = 0;
    for (const slot of flatSlots) {
      const sh = Math.floor(timeToMinutes(slot.startTime) / 60);
      const eh = Math.ceil(timeToMinutes(slot.endTime) / 60);
      if (sh < minH) minH = sh;
      if (eh > maxH) maxH = eh;
    }
    // Pad 1 hour on each side
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

  // Total classes with schedules
  const classesWithSchedules = classes.filter((c) => (c.schedules?.length ?? 0) > 0);

  // ─── Loading state ──────────────────────────────────────────────────────────
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

  // ─── Empty state ────────────────────────────────────────────────────────────
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

  // ─── Slot position computation ──────────────────────────────────────────────
  const totalGridMinutes = (gridEnd - gridStart) * 60;

  const getSlotStyle = (slot: FlatSlot): React.CSSProperties => {
    const startMin = timeToMinutes(slot.startTime) - gridStart * 60;
    const endMin = timeToMinutes(slot.endTime) - gridStart * 60;
    const top = (startMin / totalGridMinutes) * 100;
    const height = ((endMin - startMin) / totalGridMinutes) * 100;
    return { top: `${top}%`, height: `${height}%` };
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Section Schedule</CardTitle>
          <span className="text-sm text-muted-foreground">
            {classesWithSchedules.length} class{classesWithSchedules.length !== 1 ? 'es' : ''} scheduled
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {/* ── Calendar Grid ──────────────────────────────────────────── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Day headers */}
          <div className="flex border-b bg-muted/40">
            <div className="w-16 sm:w-20 shrink-0" />
            {SCHEDULE_DAYS.map((day) => (
              <div
                key={day}
                className="flex-1 min-w-0 px-1 py-2.5 text-center font-semibold text-muted-foreground border-r last:border-r-0"
              >
                {/* Full label on sm+ , abbreviation on mobile */}
                <span className="hidden sm:inline text-xs uppercase tracking-wider">{DAY_SHORT[day]}</span>
                <span className="sm:hidden text-[11px] uppercase tracking-wider">{day}</span>
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div className="flex max-h-[500px] overflow-y-auto">
            {/* Time labels */}
            <div className="w-16 sm:w-20 shrink-0">
              {hourSlots.map((time) => (
                <div
                  key={time}
                  className="h-14 sm:h-16 flex items-start justify-end pr-2 pt-0.5 border-b border-border/30"
                >
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {formatTime12h(time).replace(':00 ', ' ')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex flex-1 min-w-0">
              {SCHEDULE_DAYS.map((day) => {
                const dayEntries = daySlotMap[day] || [];
                return (
                  <div key={day} className="relative flex-1 min-w-0">
                    {/* Hour grid lines */}
                    {hourSlots.map((time) => (
                      <div
                        key={time}
                        className="h-14 sm:h-16 border-b border-r border-border/30"
                      />
                    ))}

                    {/* Slot blocks */}
                    {dayEntries.map((slot, i) => {
                      const color = CLASS_COLORS[slot.colorIndex];
                      return (
                        <TooltipProvider key={`${slot.subjectCode}-${slot.startTime}-${i}`} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute inset-x-0.5 sm:inset-x-1 z-10 rounded-lg border-2 px-1 sm:px-2 py-0.5
                                  flex flex-col justify-center overflow-hidden
                                  ${color.bg} ${color.border} ${color.text}
                                  shadow-sm transition-shadow hover:shadow-md cursor-default`}
                                style={getSlotStyle(slot)}
                              >
                                <span className="text-[11px] sm:text-xs font-bold leading-snug truncate">
                                  {slot.subjectCode}
                                </span>
                                <span className="text-[10px] sm:text-[11px] leading-snug truncate opacity-80">
                                  {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                                </span>
                                <span className="hidden sm:block text-[10px] leading-snug truncate opacity-60">
                                  {slot.room !== '—' ? slot.room : ''}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-60 space-y-0.5">
                              <p className="font-semibold text-sm">{slot.subjectName}</p>
                              <p className="text-xs text-muted-foreground">
                                {DAY_LABELS[slot.day]} · {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                              </p>
                              <p className="text-xs text-muted-foreground">Teacher: {slot.teacherName}</p>
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

        {/* ── Legend ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 px-2 sm:px-0 pt-4 pb-2">
          {classesWithSchedules.map((cls, i) => {
            const color = CLASS_COLORS[i % CLASS_COLORS.length];
            return (
              <Badge
                key={cls.id}
                variant="secondary"
                className={`${color.bg} ${color.text} border ${color.border} text-xs sm:text-sm py-1 px-2.5`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${color.dot}`} />
                {cls.subjectName} ({cls.subjectCode})
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
