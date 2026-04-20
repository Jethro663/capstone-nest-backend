'use client';

export type StudentEventTag = 'assessment' | 'announcement' | 'event' | 'holiday';

export interface StudentUpcomingEvent {
  id: string;
  classId: string;
  title: string;
  subtitle: string;
  tag: StudentEventTag;
  href: string;
  timestamp: number;
  dateKey: string;
  dayLabel: string;
  monthLabel: string;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
