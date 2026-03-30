import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const schoolEventTypeEnum = pgEnum('school_event_type', [
  'school_event',
  'holiday_break',
]);

export const schoolEvents = pgTable(
  'school_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: schoolEventTypeEnum('event_type')
      .notNull()
      .default('school_event'),
    schoolYear: text('school_year').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    location: text('location'),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),
    allDay: boolean('all_day').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => ({
    schoolYearIdx: index('school_events_school_year_idx').on(table.schoolYear),
    startsAtIdx: index('school_events_starts_at_idx').on(table.startsAt),
    endsAtIdx: index('school_events_ends_at_idx').on(table.endsAt),
    archivedAtIdx: index('school_events_archived_at_idx').on(table.archivedAt),
  }),
);
