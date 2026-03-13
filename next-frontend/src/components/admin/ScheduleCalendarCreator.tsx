'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SCHEDULE_DAYS, type ScheduleDay } from '@/utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  days: ScheduleDay[];
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

interface ScheduleCalendarCreatorProps {
  value: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduleCalendarCreator({ value, onChange }: ScheduleCalendarCreatorProps) {
  // State for the popover when creating a new slot
  const [activeCell, setActiveCell] = useState<{ day: ScheduleDay; time: string } | null>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Map of day -> array of slot indices for efficient lookup
  const daySlotMap = useMemo(() => {
    const map: Record<string, { slotIndex: number; slot: ScheduleSlot }[]> = {};
    for (const day of SCHEDULE_DAYS) {
      map[day] = [];
    }
    value.forEach((slot, slotIndex) => {
      for (const day of slot.days) {
        map[day]?.push({ slotIndex, slot });
      }
    });
    return map;
  }, [value]);

  /** Get the slot occupying a given cell (day + time) */
  const getSlotAtCell = useCallback(
    (day: ScheduleDay, time: string): { slotIndex: number; slot: ScheduleSlot } | null => {
      const cellMin = timeToMinutes(time);
      const entries = daySlotMap[day] || [];
      for (const entry of entries) {
        const start = timeToMinutes(entry.slot.startTime);
        const end = timeToMinutes(entry.slot.endTime);
        if (cellMin >= start && cellMin < end) {
          return entry;
        }
      }
      return null;
    },
    [daySlotMap],
  );

  /** Add a slot with a preset duration */
  const handlePresetClick = useCallback(
    (day: ScheduleDay, startTime: string, durationMinutes: number) => {
      const startMin = timeToMinutes(startTime);
      const endMin = Math.min(startMin + durationMinutes, GRID_END_HOUR * 60);
      const endTime = minutesToTime(endMin);

      // Check for overlap with existing slots on this day
      const dayEntries = daySlotMap[day] || [];
      const hasOverlap = dayEntries.some((entry) =>
        rangesOverlap(startMin, endMin, timeToMinutes(entry.slot.startTime), timeToMinutes(entry.slot.endTime)),
      );
      if (hasOverlap) return; // silently reject

      onChange([...value, { days: [day], startTime, endTime }]);
      setActiveCell(null);
    },
    [daySlotMap, onChange, value],
  );

  /** Add a slot with custom start/end */
  const handleCustomAdd = useCallback(() => {
    if (!activeCell || !customStart || !customEnd) return;
    const startMin = timeToMinutes(customStart);
    const endMin = timeToMinutes(customEnd);
    if (endMin <= startMin) return; // invalid range

    const dayEntries = daySlotMap[activeCell.day] || [];
    const hasOverlap = dayEntries.some((entry) =>
      rangesOverlap(startMin, endMin, timeToMinutes(entry.slot.startTime), timeToMinutes(entry.slot.endTime)),
    );
    if (hasOverlap) return;

    onChange([...value, { days: [activeCell.day], startTime: customStart, endTime: customEnd }]);
    setActiveCell(null);
    setCustomStart('');
    setCustomEnd('');
  }, [activeCell, customEnd, customStart, daySlotMap, onChange, value]);

  /** Remove a slot */
  const handleRemoveSlot = useCallback(
    (slotIndex: number, day: ScheduleDay) => {
      const slot = value[slotIndex];
      if (!slot) return;

      if (slot.days.length === 1) {
        // Only this day — remove the whole slot
        onChange(value.filter((_, i) => i !== slotIndex));
      } else {
        // Multiple days — just remove this day from the slot
        const updated = [...value];
        updated[slotIndex] = {
          ...slot,
          days: slot.days.filter((d) => d !== day),
        };
        onChange(updated);
      }
    },
    [onChange, value],
  );

  /** Compute the visual position and height of a slot block for a given cell */
  const getSlotStyle = useCallback(
    (slot: ScheduleSlot): React.CSSProperties => {
      const gridStartMin = GRID_START_HOUR * 60;
      const totalGridMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60;
      const startMin = timeToMinutes(slot.startTime) - gridStartMin;
      const endMin = timeToMinutes(slot.endTime) - gridStartMin;
      const top = (startMin / totalGridMinutes) * 100;
      const height = ((endMin - startMin) / totalGridMinutes) * 100;
      return { top: `${top}%`, height: `${height}%` };
    },
    [],
  );

  // Render the column for a single day showing all slot blocks
  const renderDayColumn = (day: ScheduleDay) => {
    const entries = daySlotMap[day] || [];
    // Deduplicate: only render each slot once per day
    const seen = new Set<number>();

    return (
      <div key={day} className="relative flex-1 min-w-0">
        {/* Grid lines */}
        {HALF_HOUR_SLOTS.map((time) => {
          const isHour = time.endsWith(':00');
          const cellSlot = getSlotAtCell(day, time);
          const isCellOccupied = !!cellSlot;
          return (
            <div
              key={time}
              className={`h-6 border-b border-r ${isHour ? 'border-border/60' : 'border-border/20'}
                ${!isCellOccupied ? 'cursor-pointer hover:bg-primary/5' : ''}`}
            >
              {!isCellOccupied && (
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
                  <PopoverContent
                    className="w-64 p-3 space-y-3"
                    side="right"
                    align="start"
                    sideOffset={4}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {DAY_LABELS[day]} — {formatTime12h(time)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Choose a duration or set custom times
                      </p>
                    </div>

                    {/* Preset durations */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {DURATION_PRESETS.map((preset) => {
                        const endMin = timeToMinutes(time) + preset.minutes;
                        const wouldOverflow = endMin > GRID_END_HOUR * 60;
                        return (
                          <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={wouldOverflow}
                            className="text-xs h-8"
                            onClick={() => handlePresetClick(day, time, preset.minutes)}
                          >
                            {preset.label}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Custom time range */}
                    <div className="space-y-2 border-t pt-2">
                      <p className="text-xs font-medium text-muted-foreground">Custom Range</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={`s-${t}`} value={t}>
                              {formatTime12h(t)}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-muted-foreground">to</span>
                        <select
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {TIME_OPTIONS.filter((t) => timeToMinutes(t) > timeToMinutes(customStart)).map((t) => (
                            <option key={`e-${t}`} value={t}>
                              {formatTime12h(t)}
                            </option>
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

        {/* Rendered slot blocks (absolutely positioned) */}
        {entries.map(({ slotIndex, slot }) => {
          if (seen.has(slotIndex)) return null;
          seen.add(slotIndex);
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Class Schedule</h3>
          <p className="text-xs text-muted-foreground">
            Click on a time slot to add a schedule. Click an existing block to remove it.
          </p>
        </div>
        {value.length > 0 && (
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
      <div className="rounded-xl border bg-card overflow-hidden">
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
          {/* Time labels column */}
          <div className="w-14 shrink-0">
            {HALF_HOUR_SLOTS.map((time) => {
              const isHour = time.endsWith(':00');
              return (
                <div
                  key={time}
                  className="h-6 flex items-center justify-end pr-2 border-b border-border/20"
                >
                  {isHour && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatTime12h(time).replace(':00 ', ' ')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 min-w-0">
            {SCHEDULE_DAYS.map((day) => renderDayColumn(day))}
          </div>
        </div>
      </div>

      {/* Summary chips */}
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
