'use client';

export type SectionEventTag = 'assessment' | 'announcement' | 'event' | 'holiday';

export interface SectionUpcomingEvent {
  id: string;
  classId?: string;
  title: string;
  subtitle: string;
  tag: SectionEventTag;
  href: string;
  timestamp: number;
  dateKey: string;
  dayLabel: string;
  monthLabel: string;
}

export function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
