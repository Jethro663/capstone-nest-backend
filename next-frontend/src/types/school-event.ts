export type SchoolEventType = 'school_event' | 'holiday_break';

export interface SchoolEvent {
  id: string;
  eventType: SchoolEventType;
  schoolYear: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSchoolEventDto {
  eventType: SchoolEventType;
  schoolYear: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
}

export interface UpdateSchoolEventDto {
  eventType?: SchoolEventType;
  schoolYear?: string;
  title?: string;
  description?: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  allDay?: boolean;
}

export interface QuerySchoolEvents {
  schoolYear?: string;
  from?: string;
  to?: string;
}

