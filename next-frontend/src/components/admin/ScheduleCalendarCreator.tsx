'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SCHEDULE_DAYS, type ScheduleDay } from '@/utils/constants';

export interface ScheduleSlot {
  days: ScheduleDay[];
  startTime: string;
  endTime: string;
}

export interface ExistingScheduleSlot extends ScheduleSlot {
  subjectName: string;
  subjectCode: string;
  teacherName?: string;
  room?: string;
}

interface ScheduleCalendarCreatorProps {
  value: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  existingSlots?: ExistingScheduleSlot[];
  disabled?: boolean;
}

const DAY_LABELS: Record<ScheduleDay, string> = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  Th: 'Thu',
  F: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
};

const DURATION_PRESETS = [
  { label: '10 min', minutes: 10 },
  { label: '25 min', minutes: 25 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '90 min', minutes: 90 },
];

const GRID_START_MINUTES = 6 * 60;
const GRID_END_MINUTES = 21 * 60;
const GRID_INTERVAL_MINUTES = 30;
const GRID_TOTAL_MINUTES = GRID_END_MINUTES - GRID_START_MINUTES;
const PIXELS_PER_MINUTE = 1.2;

const SLOT_COLORS = [
  {
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/35',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/35',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  {
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/35',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
  },
  {
    bg: 'bg-amber-500/18',
    border: 'border-amber-500/35',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/35',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  {
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/35',
    text: 'text-cyan-700',
    dot: 'bg-cyan-500',
  },
];

type TimeMark = {
  minute: number;
  label: string;
  isHour: boolean;
};

const TIME_MARKS: TimeMark[] = Array.from(
  { length: (GRID_TOTAL_MINUTES / GRID_INTERVAL_MINUTES) + 1 },
  (_, index) => {
    const minute = GRID_START_MINUTES + (index * GRID_INTERVAL_MINUTES);
    return {
      minute,
      label: formatTime12h(minutesToTime(minute)),
      isHour: minute % 60 === 0,
    };
  },
);

const SLOT_MARKS = TIME_MARKS.slice(0, -1);
const TIMELINE_HEIGHT = Math.max(GRID_TOTAL_MINUTES * PIXELS_PER_MINUTE, 360);

const TIME_OPTIONS = generateTimeOptions();

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let minutes = GRID_START_MINUTES; minutes <= GRID_END_MINUTES; minutes += 5) {
    options.push(minutesToTime(minutes));
  }
  return options;
}

function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return (hours * 60) + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatTime12h(hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

function getDefaultEndTime(startTime: string): string {
  return minutesToTime(Math.min(timeToMinutes(startTime) + 60, GRID_END_MINUTES));
}

function getSlotStyle(slot: ScheduleSlot): React.CSSProperties {
  const top = Math.max(0, timeToMinutes(slot.startTime) - GRID_START_MINUTES) * PIXELS_PER_MINUTE;
  const duration = Math.max(10, timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime));
  return {
    top: `${top}px`,
    height: `${duration * PIXELS_PER_MINUTE}px`,
  };
}

function createDayRecord<T>(factory: () => T): Record<ScheduleDay, T> {
  return {
    M: factory(),
    T: factory(),
    W: factory(),
    Th: factory(),
    F: factory(),
    Sa: factory(),
    Su: factory(),
  };
}

export function ScheduleCalendarCreator({
  value,
  onChange,
  existingSlots = [],
  disabled = false,
}: ScheduleCalendarCreatorProps) {
  const [activeCell, setActiveCell] = useState<{ day: ScheduleDay; time: string } | null>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    if (disabled) {
      setActiveCell(null);
      setCustomStart('');
      setCustomEnd('');
    }
  }, [disabled]);

  const existingDayMap = useMemo(() => {
    const map = createDayRecord<{ idx: number; slot: ExistingScheduleSlot }[]>(() => []);
    existingSlots.forEach((slot, idx) => {
      slot.days.forEach((day) => {
        map[day].push({ idx, slot });
      });
    });
    return map;
  }, [existingSlots]);

  const userDayMap = useMemo(() => {
    const map = createDayRecord<{ slotIndex: number; slot: ScheduleSlot }[]>(() => []);
    value.forEach((slot, slotIndex) => {
      slot.days.forEach((day) => {
        map[day].push({ slotIndex, slot });
      });
    });
    return map;
  }, [value]);

  const cellStateMap = useMemo(() => {
    const map = createDayRecord<Record<string, 'existing' | 'user' | null>>(() => ({}));

    SCHEDULE_DAYS.forEach((day) => {
      SLOT_MARKS.forEach(({ label, minute }) => {
        const time = minutesToTime(minute);
        map[day][time] = null;
      });
    });

    existingSlots.forEach((slot) => {
      slot.days.forEach((day) => {
        SLOT_MARKS.forEach(({ minute }) => {
          const time = minutesToTime(minute);
          const cellMinutes = timeToMinutes(time);
          if (
            cellMinutes >= timeToMinutes(slot.startTime) &&
            cellMinutes < timeToMinutes(slot.endTime) &&
            map[day][time] === null
          ) {
            map[day][time] = 'existing';
          }
        });
      });
    });

    value.forEach((slot) => {
      slot.days.forEach((day) => {
        SLOT_MARKS.forEach(({ minute }) => {
          const time = minutesToTime(minute);
          const cellMinutes = timeToMinutes(time);
          if (cellMinutes >= timeToMinutes(slot.startTime) && cellMinutes < timeToMinutes(slot.endTime)) {
            map[day][time] = 'user';
          }
        });
      });
    });

    return map;
  }, [existingSlots, value]);

  const hasAnyOverlap = useCallback(
    (day: ScheduleDay, startMinutes: number, endMinutes: number) => {
      const userConflict = userDayMap[day].some(({ slot }) =>
        rangesOverlap(
          startMinutes,
          endMinutes,
          timeToMinutes(slot.startTime),
          timeToMinutes(slot.endTime),
        ),
      );

      if (userConflict) {
        return true;
      }

      return existingDayMap[day].some(({ slot }) =>
        rangesOverlap(
          startMinutes,
          endMinutes,
          timeToMinutes(slot.startTime),
          timeToMinutes(slot.endTime),
        ),
      );
    },
    [existingDayMap, userDayMap],
  );

  const resetComposer = useCallback(() => {
    setActiveCell(null);
    setCustomStart('');
    setCustomEnd('');
  }, []);

  const addSlot = useCallback(
    (day: ScheduleDay, startTime: string, endTime: string) => {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      if (
        startMinutes < GRID_START_MINUTES ||
        endMinutes > GRID_END_MINUTES ||
        endMinutes <= startMinutes ||
        hasAnyOverlap(day, startMinutes, endMinutes)
      ) {
        return;
      }

      onChange([
        ...value,
        {
          days: [day],
          startTime,
          endTime,
        },
      ]);
      resetComposer();
    },
    [hasAnyOverlap, onChange, resetComposer, value],
  );

  const handleCellSelect = useCallback(
    (day: ScheduleDay, time: string) => {
      if (disabled || cellStateMap[day][time]) {
        return;
      }

      if (activeCell?.day === day && activeCell.time === time) {
        resetComposer();
        return;
      }

      setActiveCell({ day, time });
      setCustomStart(time);
      setCustomEnd(getDefaultEndTime(time));
    },
    [activeCell, cellStateMap, disabled, resetComposer],
  );

  const handleQuickAdd = useCallback(
    (durationMinutes: number) => {
      if (!activeCell) {
        return;
      }

      const endTime = minutesToTime(
        Math.min(timeToMinutes(activeCell.time) + durationMinutes, GRID_END_MINUTES),
      );
      addSlot(activeCell.day, activeCell.time, endTime);
    },
    [activeCell, addSlot],
  );

  const handleCustomAdd = useCallback(() => {
    if (!activeCell || !customStart || !customEnd) {
      return;
    }

    addSlot(activeCell.day, customStart, customEnd);
  }, [activeCell, addSlot, customEnd, customStart]);

  const handleRemoveSlot = useCallback(
    (slotIndex: number, day: ScheduleDay) => {
      const slot = value[slotIndex];
      if (!slot) {
        return;
      }

      if (slot.days.length === 1) {
        onChange(value.filter((_, index) => index !== slotIndex));
        return;
      }

      const updated = [...value];
      updated[slotIndex] = {
        ...slot,
        days: slot.days.filter((entryDay) => entryDay !== day),
      };
      onChange(updated);
    },
    [onChange, value],
  );

  const selectedRangeState = useMemo(() => {
    if (!activeCell || !customStart || !customEnd) {
      return {
        canAdd: false,
        overlaps: false,
        outOfBounds: false,
        invalidRange: true,
      };
    }

    const startMinutes = timeToMinutes(customStart);
    const endMinutes = timeToMinutes(customEnd);
    const invalidRange = endMinutes <= startMinutes;
    const outOfBounds = startMinutes < GRID_START_MINUTES || endMinutes > GRID_END_MINUTES;
    const overlaps = !invalidRange && !outOfBounds
      ? hasAnyOverlap(activeCell.day, startMinutes, endMinutes)
      : false;

    return {
      canAdd: !invalidRange && !outOfBounds && !overlaps,
      overlaps,
      outOfBounds,
      invalidRange,
    };
  }, [activeCell, customEnd, customStart, hasAnyOverlap]);

  const renderDayColumn = (day: ScheduleDay) => (
    <div
      key={day}
      className="relative min-w-[92px] flex-1 border-r border-slate-200/80 last:border-r-0"
      style={{ height: `${TIMELINE_HEIGHT}px` }}
    >
      {TIME_MARKS.map((mark, index) => {
        if (index === TIME_MARKS.length - 1) {
          return null;
        }

        const time = minutesToTime(mark.minute);
        const state = cellStateMap[day][time];
        const top = (mark.minute - GRID_START_MINUTES) * PIXELS_PER_MINUTE;
        const isSelected = activeCell?.day === day && activeCell.time === time;

        return (
          <div key={`${day}-${time}`}>
            <div
              className="absolute inset-x-0 border-t"
              style={{
                top: `${top}px`,
                borderColor: mark.isHour ? 'rgba(15,23,42,0.16)' : 'rgba(15,23,42,0.08)',
              }}
            />
            <button
              type="button"
              className={`absolute inset-x-0 text-left transition-colors ${
                state === null && !disabled ? 'hover:bg-red-50/70' : ''
              } ${
                isSelected ? 'bg-red-50 ring-1 ring-inset ring-[#ff4b4b]' : ''
              }`}
              style={{
                top: `${top}px`,
                height: `${GRID_INTERVAL_MINUTES * PIXELS_PER_MINUTE}px`,
              }}
              onClick={() => handleCellSelect(day, time)}
              disabled={disabled || state !== null}
              aria-label={`Select ${DAY_LABELS[day]} at ${formatTime12h(time)}`}
            >
              {state === null ? (
                <span className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-slate-100" />
              ) : null}
            </button>
          </div>
        );
      })}

      {activeCell?.day === day ? (
        <div
          className="absolute z-30 w-[248px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
          style={{
            top: `${Math.min(
              (timeToMinutes(activeCell.time) - GRID_START_MINUTES) * PIXELS_PER_MINUTE,
              TIMELINE_HEIGHT - 228,
            )}px`,
            left: SCHEDULE_DAYS.indexOf(day) >= SCHEDULE_DAYS.length - 2 ? 'auto' : 'calc(100% + 8px)',
            right: SCHEDULE_DAYS.indexOf(day) >= SCHEDULE_DAYS.length - 2 ? 'calc(100% + 8px)' : 'auto',
          }}
        >
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-900">
              {DAY_LABELS[activeCell.day]} at {formatTime12h(activeCell.time)}
            </p>
            <p className="text-xs leading-5 text-slate-500">
              Add a slot from this start time or set a custom range.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {DURATION_PRESETS.map((preset) => {
              const endTime = minutesToTime(
                Math.min(timeToMinutes(activeCell.time) + preset.minutes, GRID_END_MINUTES),
              );
              const presetDisabled = hasAnyOverlap(
                activeCell.day,
                timeToMinutes(activeCell.time),
                timeToMinutes(endTime),
              );

              return (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-[11px] font-bold"
                  disabled={presetDisabled}
                  onClick={() => handleQuickAdd(preset.minutes)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <div className="grid gap-2">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Start
                </span>
                <select
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="admin-select h-9 rounded-lg px-3 text-xs"
                >
                  {TIME_OPTIONS.slice(0, -1).map((time) => (
                    <option key={`start-${time}`} value={time}>
                      {formatTime12h(time)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  End
                </span>
                <select
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="admin-select h-9 rounded-lg px-3 text-xs"
                >
                  {TIME_OPTIONS.filter((time) => timeToMinutes(time) > timeToMinutes(customStart || activeCell.time)).map((time) => (
                    <option key={`end-${time}`} value={time}>
                      {formatTime12h(time)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex-1 rounded-lg text-[11px] font-bold"
                onClick={resetComposer}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="admin-button-solid h-8 flex-1 rounded-lg text-[11px] font-black"
                disabled={!selectedRangeState.canAdd}
                onClick={handleCustomAdd}
              >
                Add Slot
              </Button>
            </div>

            {selectedRangeState.invalidRange ? (
              <p className="text-[11px] text-amber-600">End time must be after start time.</p>
            ) : null}
            {selectedRangeState.outOfBounds ? (
              <p className="text-[11px] text-amber-600">Use a time between 6:00 AM and 9:00 PM.</p>
            ) : null}
            {selectedRangeState.overlaps ? (
              <p className="text-[11px] text-rose-600">This overlaps an existing section schedule.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {existingDayMap[day].map(({ idx, slot }) => (
        <Tooltip key={`existing-${day}-${idx}`}>
          <TooltipTrigger asChild>
            <div
              className="absolute inset-x-1 z-[5] rounded-lg border border-slate-300/90 bg-slate-100/90 px-1.5 py-1 text-center shadow-sm"
              style={getSlotStyle(slot)}
            >
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
                {slot.subjectCode}
              </p>
              <p className="truncate text-[10px] text-slate-500">
                {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-56">
            <p className="text-xs font-semibold text-slate-900">
              {slot.subjectName} ({slot.subjectCode})
            </p>
            <p className="text-[11px] text-slate-500">
              {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
            </p>
            {slot.teacherName ? (
              <p className="text-[11px] text-slate-500">Teacher: {slot.teacherName}</p>
            ) : null}
            {slot.room ? (
              <p className="text-[11px] text-slate-500">Room: {slot.room}</p>
            ) : null}
          </TooltipContent>
        </Tooltip>
      ))}

      {userDayMap[day].map(({ slotIndex, slot }) => {
        const color = SLOT_COLORS[slotIndex % SLOT_COLORS.length];
        return (
          <button
            key={`user-${day}-${slotIndex}`}
            type="button"
            className={`absolute inset-x-1 z-10 rounded-lg border px-1.5 py-1 text-left shadow-sm transition-opacity hover:opacity-85 ${color.bg} ${color.border} ${color.text}`}
            style={getSlotStyle(slot)}
            onClick={() => handleRemoveSlot(slotIndex, day)}
            title="Remove this schedule block"
          >
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em]">
              {DAY_LABELS[day]}
            </p>
            <p className="truncate text-[10px] font-semibold">
              {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
            </p>
          </button>
        );
      })}
    </div>
  );

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[var(--admin-text-strong)]">Class Schedule</h3>
            <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
              {disabled
                ? 'Fill in subject, code, grade level, school year, and section to enable scheduling.'
                : 'Click any open cell to open the add popup, then choose a quick duration or custom range.'}
            </p>
          </div>
          {!disabled && value.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onChange([])}
            >
              Clear All
            </Button>
          ) : null}
        </div>

        <div className={`relative overflow-hidden rounded-xl border border-[var(--admin-outline)] bg-white ${disabled ? 'opacity-45' : ''}`}>
          {disabled ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
              <div className="px-6 text-center">
                <p className="text-sm font-black text-[var(--admin-text-strong)]">Schedule Locked</p>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  Complete the class details above first.
                </p>
              </div>
            </div>
          ) : null}

          <div className="min-w-[760px]">
            <div className="flex border-b border-slate-200 bg-slate-50/95">
              <div className="w-16 shrink-0 border-r border-slate-200" />
              {SCHEDULE_DAYS.map((day) => (
                <div
                  key={day}
                  className="flex-1 border-r border-slate-200 px-2 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 last:border-r-0"
                >
                  {DAY_LABELS[day]}
                </div>
              ))}
            </div>

            <div className="flex max-h-[430px] overflow-y-auto">
              <div
                className="relative w-16 shrink-0 border-r border-slate-200 bg-slate-50/70"
                style={{ height: `${TIMELINE_HEIGHT}px` }}
              >
                {TIME_MARKS.map((mark) => (
                  <div
                    key={`hour-${mark.minute}`}
                    className="absolute inset-x-0 pr-2 text-right"
                    style={{
                      top: `${(mark.minute - GRID_START_MINUTES) * PIXELS_PER_MINUTE}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {mark.isHour ? (
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        {mark.label.replace(':00 ', ' ')}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 flex-1">
                {SCHEDULE_DAYS.map((day) => renderDayColumn(day))}
              </div>
            </div>
          </div>
        </div>

        {!disabled && existingSlots.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
            <span className="inline-block h-3 w-4 rounded border border-slate-300 bg-slate-100" />
            Existing section classes are shown in gray.
          </div>
        ) : null}

        {value.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {value.map((slot, index) => {
              const color = SLOT_COLORS[index % SLOT_COLORS.length];
              return (
                <Badge
                  key={`${slot.startTime}-${slot.endTime}-${index}`}
                  variant="secondary"
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${color.bg} ${color.border} ${color.text}`}
                  onClick={() => onChange(value.filter((_, slotIndex) => slotIndex !== index))}
                >
                  <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${color.dot}`} />
                  {slot.days.map((day) => DAY_LABELS[day]).join('/')} {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
                  <span className="ml-2 opacity-60">x</span>
                </Badge>
              );
            })}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
