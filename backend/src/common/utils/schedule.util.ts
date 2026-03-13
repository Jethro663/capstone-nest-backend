/** Full English names keyed by the abbreviated day codes used in the DB */
const DAY_FULL_NAMES: Record<string, string> = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  Th: 'Thursday',
  F: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

export interface CalendarSlot {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  /** Full English day names, e.g. ['Monday', 'Wednesday', 'Friday'] */
  daysExpanded: string[];
  /** Numeric hour component of startTime (0-23) */
  startHour: number;
  /** Numeric minute component of startTime (0-59) */
  startMinute: number;
  /** Numeric hour component of endTime (0-23) */
  endHour: number;
  /** Numeric minute component of endTime (0-59) */
  endMinute: number;
}

/**
 * Transforms a raw `class_schedules` row into a calendar-ready object.
 * The frontend only needs to read `startHour`/`endHour` etc. — no string
 * parsing required on the client side.
 */
export function toCalendarSlot(slot: {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
}): CalendarSlot {
  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);

  return {
    id: slot.id,
    days: slot.days,
    startTime: slot.startTime,
    endTime: slot.endTime,
    daysExpanded: slot.days.map((d) => DAY_FULL_NAMES[d] ?? d),
    startHour: sh,
    startMinute: sm,
    endHour: eh,
    endMinute: em,
  };
}

/**
 * Converts HH:MM string to total minutes since midnight.
 * Used for time-range overlap checks.
 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
