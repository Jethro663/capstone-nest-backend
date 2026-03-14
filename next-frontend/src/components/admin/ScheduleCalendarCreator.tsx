'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SCHEDULE_DAYS, type ScheduleDay } from '@/utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  days: ScheduleDay[];
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

/** A read-only slot from an existing class in the same section */
export interface ExistingScheduleSlot extends ScheduleSlot {
  subjectName: string;
  subjectCode: string;
  teacherName?: string;
  room?: string;
}

interface ScheduleCalendarCreatorProps {
  value: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  /** Read-only occupied blocks from other classes in the section */
  existingSlots?: ExistingScheduleSlot[];
  /** Lock the calendar — greyed out with helper message */
  disabled?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  M: 'Mon', T: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri', Sa: 'Sat', Su: 'Sun',
};

/** Duration presets in minutes */
const DURATION_PRESETS = [
  { label: '10 min', minutes: 10 },
  { label: '25 min', minutes: 25 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
] as const;

/** Generate time labels from 6:00 AM to 9:00 PM in 30-min steps for the grid */
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 21; // 9 PM
const HALF_HOUR_SLOTS: string[] = [];
for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
  HALF_HOUR_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < GRID_END_HOUR) {
    HALF_HOUR_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
  }
}

/** 5-minute interval options for the custom time selector */
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === GRID_END_HOUR && m > 0) break;
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// ─── Utility Functions ────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Check if two time ranges overlap */
function rangesOverlap(
  s1: number, e1: number,
  s2: number, e2: number,
): boolean {
  return s1 < e2 && e1 > s2;
}

// ─── Slot Colors ──────────────────────────────────────────────────────────────

const SLOT_COLORS = [
  { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  { bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
];

// ─── Helper: slot style computation ───────────────────────────────────────────

function getSlotStyle(slot: ScheduleSlot): React.CSSProperties {
  const gridStartMin = GRID_START_HOUR * 60;
  const totalGridMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60;
  const startMin = timeToMinutes(slot.startTime) - gridStartMin;
  const endMin = timeToMinutes(slot.endTime) - gridStartMin;
  const top = (startMin / totalGridMinutes) * 100;
  const height = ((endMin - startMin) / totalGridMinutes) * 100;
  return { top: `${top}%`, height: `${height}%` };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduleCalendarCreator({
  value,
  onChange,
  existingSlots = [],
  disabled = false,
}: ScheduleCalendarCreatorProps) {
  const [activeCell, setActiveCell] = useState<{ day: ScheduleDay; time: string } | null>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ─── Existing slots: flatten to per-day entries for fast lookup ────────────
  const existingDayMap = useMemo(() => {
    const map: Record<string, { idx: number; slot: ExistingScheduleSlot }[]> = {};
    for (const day of SCHEDULE_DAYS) map[day] = [];
    existingSlots.forEach((slot, idx) => {
      for (const day of slot.days) {
        map[day]?.push({ idx, slot });
      }
    });
    return map;
  }, [existingSlots]);

  // ─── User slots: same pattern ─────────────────────────────────────────────
  const daySlotMap = useMemo(() => {
    const map: Record<string, { slotIndex: number; slot: ScheduleSlot }[]> = {};
    for (const day of SCHEDULE_DAYS) map[day] = [];
    value.forEach((slot, slotIndex) => {
      for (const day of slot.days) {
        map[day]?.push({ slotIndex, slot });
      }
    });
    return map;
  }, [value]);

  /** Is a cell occupied by a USER slot? */
  const getUserSlotAtCell = useCallback(
    (day: ScheduleDay, time: string) => {
      const cellMin = timeToMinutes(time);
      for (const entry of (daySlotMap[day] || [])) {
        const s = timeToMinutes(entry.slot.startTime);
        const e = timeToMinutes(entry.slot.endTime);
        if (cellMin >= s && cellMin < e) return entry;
      }
      return null;
    },
    [daySlotMap],
  );

  /** Is a cell occupied by an EXISTING (read-only) slot? */
  const getExistingAtCell = useCallback(
    (day: ScheduleDay, time: string) => {
      const cellMin = timeToMinutes(time);
      for (const entry of (existingDayMap[day] || [])) {
        const s = timeToMinutes(entry.slot.startTime);
        const e = timeToMinutes(entry.slot.endTime);
        if (cellMin >= s && cellMin < e) return entry;
      }
      return null;
    },
    [existingDayMap],
  );

  /** Does a new range overlap any existing or user slot on a day? */
  const hasAnyOverlap = useCallback(
    (day: ScheduleDay, startMin: number, endMin: number) => {
      const allEntries = [
        ...(daySlotMap[day] || []).map((e) => e.slot),
        ...(existingDayMap[day] || []).map((e) => e.slot),
      ];
      return allEntries.some((s) =>
        rangesOverlap(startMin, endMin, timeToMinutes(s.startTime), timeToMinutes(s.endTime)),
      );
    },
    [daySlotMap, existingDayMap],
  );

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handlePresetClick = useCallback(
    (day: ScheduleDay, startTime: string, durationMinutes: number) => {
      const startMin = timeToMinutes(startTime);
      const endMin = Math.min(startMin + durationMinutes, GRID_END_HOUR * 60);
      if (hasAnyOverlap(day, startMin, endMin)) return;
      onChange([...value, { days: [day], startTime, endTime: minutesToTime(endMin) }]);
      setActiveCell(null);
    },
    [hasAnyOverlap, onChange, value],
  );

  const handleCustomAdd = useCallback(() => {
    if (!activeCell || !customStart || !customEnd) return;
    const startMin = timeToMinutes(customStart);
    const endMin = timeToMinutes(customEnd);
    if (endMin <= startMin) return;
    if (hasAnyOverlap(activeCell.day, startMin, endMin)) return;
    onChange([...value, { days: [activeCell.day], startTime: customStart, endTime: customEnd }]);
    setActiveCell(null);
    setCustomStart('');
    setCustomEnd('');
  }, [activeCell, customEnd, customStart, hasAnyOverlap, onChange, value]);

  const handleRemoveSlot = useCallback(
    (slotIndex: number, day: ScheduleDay) => {
      const slot = value[slotIndex];
      if (!slot) return;
      if (slot.days.length === 1) {
        onChange(value.filter((_, i) => i !== slotIndex));
      } else {
        const updated = [...value];
        updated[slotIndex] = { ...slot, days: slot.days.filter((d) => d !== day) };
        onChange(updated);
      }
    },
    [onChange, value],
  );

  // ─── Day Column Renderer ──────────────────────────────────────────────────

  const renderDayColumn = (day: ScheduleDay) => {
    const userEntries = daySlotMap[day] || [];
    const existEntries = existingDayMap[day] || [];
    const seenUser = new Set<number>();
    const seenExist = new Set<number>();

    return (
      <div key={day} className="relative flex-1 min-w-0">
        {/* Grid cells */}
        {HALF_HOUR_SLOTS.map((time) => {
          const isHour = time.endsWith(':00');
          const isOccupied = !!getUserSlotAtCell(day, time) || !!getExistingAtCell(day, time);
          const canClick = !disabled && !isOccupied;
          return (
            <div
              key={time}
              className={`h-6 border-b border-r ${isHour ? 'border-border/60' : 'border-border/20'}
                ${canClick ? 'cursor-pointer hover:bg-primary/5' : ''}`}
            >
              {canClick && (
                <Popover
                  open={activeCell?.day === day && activeCell?.time === time}
                  onOpenChange={(open) => {
                    if (open) {
                      setActiveCell({ day, time });
                      setCustomStart(time);
                      setCustomEnd(minutesToTime(timeToMinutes(time) + 60));
                    } else {
                      setActiveCell(null);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-full w-full"
                      aria-label={`Add schedule on ${DAY_LABELS[day]} at ${formatTime12h(time)}`}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 space-y-3" side="right" align="start" sideOffset={4}>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{DAY_LABELS[day]} — {formatTime12h(time)}</p>
                      <p className="text-xs text-muted-foreground">Choose a duration or set custom times</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DURATION_PRESETS.map((preset) => {
                        const endMin = timeToMinutes(time) + preset.minutes;
                        const wouldOverflow = endMin > GRID_END_HOUR * 60;
                        const wouldOverlap = hasAnyOverlap(day, timeToMinutes(time), endMin);
                        return (
                          <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={wouldOverflow || wouldOverlap}
                            className="text-xs h-8"
                            onClick={() => handlePresetClick(day, time, preset.minutes)}
                          >
                            {preset.label}
                          </Button>
                        );
                      })}
                    </div>
                    <div className="space-y-2 border-t pt-2">
                      <p className="text-xs font-medium text-muted-foreground">Custom Range</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={`s-${t}`} value={t}>{formatTime12h(t)}</option>
                          ))}
                        </select>
                        <span className="text-xs text-muted-foreground">to</span>
                        <select
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {TIME_OPTIONS.filter((t) => timeToMinutes(t) > timeToMinutes(customStart)).map((t) => (
                            <option key={`e-${t}`} value={t}>{formatTime12h(t)}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={handleCustomAdd}
                        disabled={!customStart || !customEnd || timeToMinutes(customEnd) <= timeToMinutes(customStart)}
                      >
                        Add Custom Slot
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}

        {/* ── Existing (read-only) slot blocks ─────────────────────────────── */}
        {existEntries.map(({ idx, slot }) => {
          if (seenExist.has(idx)) return null;
          seenExist.add(idx);
          return (
            <TooltipProvider key={`exist-${idx}`} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute inset-x-0.5 z-[5] rounded-md border px-1
                      flex flex-col justify-center items-center
                      bg-zinc-500/15 border-zinc-400/30 dark:bg-zinc-600/20 dark:border-zinc-500/30
                      pointer-events-auto"
                    style={{
                      ...getSlotStyle(slot),
                      backgroundImage:
                        'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(161,161,170,0.13) 3px, rgba(161,161,170,0.13) 5px)',
                    }}
                  >
                    <span className="text-[10px] font-semibold leading-tight truncate w-full text-center text-zinc-600 dark:text-zinc-400">
                      {slot.subjectCode}
                    </span>
                    <span className="text-[9px] leading-tight truncate w-full text-center text-zinc-500 dark:text-zinc-500">
                      {formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-52">
                  <p className="font-semibold text-xs">{slot.subjectName} ({slot.subjectCode})</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                  </p>
                  {slot.teacherName && (
                    <p className="text-[11px] text-muted-foreground">Teacher: {slot.teacherName}</p>
                  )}
                  {slot.room && (
                    <p className="text-[11px] text-muted-foreground">Room: {slot.room}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* ── User slot blocks ─────────────────────────────────────────────── */}
        {userEntries.map(({ slotIndex, slot }) => {
          if (seenUser.has(slotIndex)) return null;
          seenUser.add(slotIndex);
          const color = SLOT_COLORS[slotIndex % SLOT_COLORS.length];
          return (
            <button
              key={`block-${slotIndex}`}
              type="button"
              className={`absolute inset-x-0.5 z-10 rounded-md border px-1 flex flex-col justify-center items-center
                ${color.bg} ${color.border} ${color.text}
                cursor-pointer transition-all hover:opacity-80 hover:shadow-sm group`}
              style={getSlotStyle(slot)}
              onClick={() => handleRemoveSlot(slotIndex, day)}
              title="Click to remove"
            >
              <span className="text-[10px] font-semibold leading-tight truncate w-full text-center">
                {formatTime12h(slot.startTime)}
              </span>
              <span className="text-[9px] leading-tight truncate w-full text-center opacity-70">
                {formatTime12h(slot.endTime)}
              </span>
              <span className="absolute top-0.5 right-0.5 hidden group-hover:block text-[10px] opacity-60">✕</span>
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Class Schedule</h3>
          <p className="text-xs text-muted-foreground">
            {disabled
              ? 'Fill in subject, code, grade level, school year, and section to enable scheduling.'
              : 'Click on a time slot to add a schedule. Click an existing block to remove it.'}
          </p>
        </div>
        {!disabled && value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-red-500 hover:text-red-600"
            onClick={() => onChange([])}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className={`rounded-xl border bg-card overflow-hidden relative ${disabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
        {/* Disabled overlay */}
        {disabled && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-xl">
            <div className="text-center px-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-muted-foreground/60"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <p className="text-sm font-medium text-muted-foreground">Schedule Locked</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Complete the class details above first</p>
            </div>
          </div>
        )}

        {/* Day headers */}
        <div className="flex border-b bg-muted/40">
          <div className="w-14 shrink-0" />
          {SCHEDULE_DAYS.map((day) => (
            <div
              key={day}
              className="flex-1 min-w-0 px-1 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
            >
              {DAY_LABELS[day]}
            </div>
          ))}
        </div>

        {/* Time grid body */}
        <div className="flex max-h-[380px] overflow-y-auto">
          <div className="w-14 shrink-0">
            {HALF_HOUR_SLOTS.map((time) => {
              const isHour = time.endsWith(':00');
              return (
                <div key={time} className="h-6 flex items-center justify-end pr-2 border-b border-border/20">
                  {isHour && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatTime12h(time).replace(':00 ', ' ')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-1 min-w-0">
            {SCHEDULE_DAYS.map((day) => renderDayColumn(day))}
          </div>
        </div>
      </div>

      {/* Existing slots legend */}
      {!disabled && existingSlots.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block w-4 h-3 rounded border border-zinc-400/30 bg-zinc-500/15"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(161,161,170,0.13) 3px, rgba(161,161,170,0.13) 5px)' }}
          />
          <span>= Existing section classes (hover for details)</span>
        </div>
      )}

      {/* Summary chips for user slots */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((slot, index) => {
            const color = SLOT_COLORS[index % SLOT_COLORS.length];
            return (
              <Badge
                key={index}
                variant="secondary"
                className={`${color.bg} ${color.text} border ${color.border} text-xs cursor-pointer hover:opacity-70`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${color.dot}`} />
                {slot.days.map((d) => DAY_LABELS[d]).join('/')}{' '}
                {formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)}
                <span className="ml-1.5 opacity-50">✕</span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
