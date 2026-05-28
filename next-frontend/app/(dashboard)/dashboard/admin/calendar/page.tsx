'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { classService } from '@/services/class-service';
import { schoolEventService } from '@/services/school-event-service';
import { getCurrentToFutureSchoolYears } from '@/lib/school-year';
import type { ClassItem } from '@/types/class';
import type {
  CreateSchoolEventDto,
  SchoolEvent,
  UpdateSchoolEventDto,
} from '@/types/school-event';
import { buildSchoolYearList } from '@/utils/calendar-feed';
import styles from './admin-calendar.module.css';

interface SchoolEventFormState {
  eventType: 'school_event' | 'holiday_break';
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  startsAt: string;
  endsAt: string;
}

interface FormDateRange {
  start: Date;
  end: Date;
  startMs: number;
  endMs: number;
}

interface SchoolEventValidationState {
  title?: string;
  startsAt?: string;
  endsAt?: string;
}

function emptyFormState(): SchoolEventFormState {
  return {
    eventType: 'school_event',
    title: '',
    description: '',
    location: '',
    allDay: true,
    startsAt: '',
    endsAt: '',
  };
}

function toLocalDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return toLocalDateInputValue(parsed);
}

function toDateTimeInputValue(iso?: string): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toIsoDateRange(value: string, endOfDay = false): string {
  const parsed = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return parsed.toISOString();
}

function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

function getTodayDateInputValue(): string {
  return toLocalDateInputValue(new Date());
}

function getDateInputMinValue(allDay: boolean): string {
  const today = getTodayDateInputValue();
  return allDay ? today : `${today}T00:00`;
}

function getEndInputMinValue(form: SchoolEventFormState): string {
  const todayMin = getDateInputMinValue(form.allDay);
  if (!form.startsAt) return todayMin;
  return form.startsAt > todayMin ? form.startsAt : todayMin;
}

function getInputLocalDayStartMs(allDay: boolean, value: string): number | null {
  if (!value) return null;
  const parsed = allDay ? new Date(`${value}T00:00:00.000`) : new Date(value);
  const parsedMs = parsed.getTime();
  if (Number.isNaN(parsedMs)) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
}

function mapEventToForm(event: SchoolEvent): SchoolEventFormState {
  return {
    eventType: event.eventType,
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    allDay: event.allDay,
    startsAt: event.allDay ? toDateInputValue(event.startsAt) : toDateTimeInputValue(event.startsAt),
    endsAt: event.allDay ? toDateInputValue(event.endsAt) : toDateTimeInputValue(event.endsAt),
  };
}

function formatEventSpan(event: SchoolEvent): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  if (event.allDay) {
    const startText = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const endText = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return startText === endText ? startText : `${startText} - ${endText}`;
  }
  return `${start.toLocaleString()} - ${end.toLocaleString()}`;
}

function getTypeLabel(eventType: SchoolEvent['eventType']): string {
  return eventType === 'holiday_break' ? 'Holiday / Break' : 'School Event';
}

function normalizeEventTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildDateRange(allDay: boolean, startsAt: string, endsAt: string): FormDateRange | null {
  const start = allDay ? new Date(`${startsAt}T00:00:00.000`) : new Date(startsAt);
  const end = allDay ? new Date(`${endsAt}T23:59:59.999`) : new Date(endsAt);
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return { start, end, startMs, endMs };
}

function getFormDateRange(form: SchoolEventFormState): FormDateRange | null {
  if (!form.startsAt || !form.endsAt) return null;
  return buildDateRange(form.allDay, form.startsAt, form.endsAt);
}

function getValidationDateRange(form: SchoolEventFormState): FormDateRange | null {
  const startsAt = form.startsAt || form.endsAt;
  const endsAt = form.endsAt || form.startsAt;
  if (!startsAt || !endsAt) return null;
  return buildDateRange(form.allDay, startsAt, endsAt);
}

function getEventDateRange(event: SchoolEvent): FormDateRange | null {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return { start, end, startMs, endMs };
}

function dateRangesOverlap(left: FormDateRange, right: FormDateRange): boolean {
  return left.startMs <= right.endMs && left.endMs >= right.startMs;
}

function timeRangesOverlap(left: FormDateRange, right: FormDateRange): boolean {
  return left.startMs < right.endMs && left.endMs > right.startMs;
}

function getInlineValidationMessage(errors: SchoolEventValidationState): string | null {
  return errors.title || errors.startsAt || errors.endsAt || null;
}

function validateSchoolEventForm(
  form: SchoolEventFormState,
  events: SchoolEvent[],
  editingEventId: string | null,
): SchoolEventValidationState {
  const errors: SchoolEventValidationState = {};
  const activeEvents = events.filter((event) => event.id !== editingEventId);
  const normalizedTitle = normalizeEventTitle(form.title);

  if (normalizedTitle) {
    const titleMatch = activeEvents.find((event) => normalizeEventTitle(event.title) === normalizedTitle);
    if (titleMatch) {
      errors.title = `"${titleMatch.title}" already exists in ${titleMatch.schoolYear}. Use a unique event title.`;
    }
  }

  const todayStartMs = getInputLocalDayStartMs(true, getTodayDateInputValue()) ?? 0;
  const startDayMs = getInputLocalDayStartMs(form.allDay, form.startsAt);
  const endDayMs = getInputLocalDayStartMs(form.allDay, form.endsAt);

  if (startDayMs !== null && startDayMs < todayStartMs) {
    errors.startsAt = 'Start date cannot be earlier than today.';
  }
  if (endDayMs !== null && endDayMs < todayStartMs) {
    errors.endsAt = 'End date cannot be earlier than today.';
  }

  const formRange = getValidationDateRange(form);
  if (!formRange || errors.startsAt || errors.endsAt) return errors;

  const hasCompleteDateWindow = Boolean(form.startsAt && form.endsAt);

  if (hasCompleteDateWindow && formRange.endMs < formRange.startMs) {
    errors.endsAt = 'End must be the same as or later than the start.';
    return errors;
  }

  if (form.allDay) {
    const dateConflict = activeEvents.find((event) => {
      const eventRange = getEventDateRange(event);
      return eventRange ? dateRangesOverlap(formRange, eventRange) : false;
    });

    if (dateConflict) {
      errors.startsAt = `This date is already used by "${dateConflict.title}" (${formatEventSpan(dateConflict)}).`;
    }

    return errors;
  }

  const allDayBlocker = activeEvents.find((event) => {
    if (!event.allDay) return false;
    const eventRange = getEventDateRange(event);
    return eventRange ? dateRangesOverlap(formRange, eventRange) : false;
  });

  if (allDayBlocker) {
    errors.startsAt = `This date is blocked by all-day event "${allDayBlocker.title}" (${formatEventSpan(allDayBlocker)}).`;
    return errors;
  }

  if (!hasCompleteDateWindow) return errors;

  const timeConflict = activeEvents.find((event) => {
    if (event.allDay) return false;
    const eventRange = getEventDateRange(event);
    return eventRange ? timeRangesOverlap(formRange, eventRange) : false;
  });

  if (timeConflict) {
    errors.endsAt = `This time is already taken by "${timeConflict.title}" (${formatEventSpan(timeConflict)}).`;
  }

  return errors;
}

export default function AdminCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<SchoolEventFormState>(emptyFormState());

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        setLoading(true);
        const classResponse = await classService.getAll({ limit: 300 });
        if (!active) return;
        const classRows = classResponse.data?.data || [];
        setClasses(classRows);

        const yearOptions = [
          ...new Set([
            ...buildSchoolYearList(classRows, []),
            ...getCurrentToFutureSchoolYears(4),
          ]),
        ].sort((left, right) => right.localeCompare(left));

        setSelectedSchoolYear(yearOptions[0] ?? '');
      } catch {
        if (!active) return;
        setClasses([]);
        setSelectedSchoolYear(getCurrentToFutureSchoolYears(1)[0]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, []);

  const schoolYearOptions = useMemo(() => {
    const fromData = buildSchoolYearList(classes, events);
    return [...new Set([...fromData, ...getCurrentToFutureSchoolYears(4)])].sort((left, right) =>
      right.localeCompare(left),
    );
  }, [classes, events]);

  const refreshEvents = async (schoolYear: string) => {
    if (!schoolYear) return;
    setLoading(true);
    try {
      const response = await schoolEventService.getAll({ schoolYear });
      setEvents(response.data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSchoolYear) return;

    let active = true;
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await schoolEventService.getAll({ schoolYear: selectedSchoolYear });
        if (!active) return;
        setEvents(response.data || []);
      } catch {
        if (!active) return;
        setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchEvents();
    return () => {
      active = false;
    };
  }, [selectedSchoolYear]);

  const eventStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingEvents = [...events]
      .filter((event) => new Date(event.endsAt).getTime() >= today.getTime())
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

    return {
      total: events.length,
      schoolEvents: events.filter((event) => event.eventType === 'school_event').length,
      breaks: events.filter((event) => event.eventType === 'holiday_break').length,
      upcoming: upcomingEvents.length,
      nextEvent: upcomingEvents[0] ?? null,
    };
  }, [events]);

  const currentYearIndex = schoolYearOptions.indexOf(selectedSchoolYear);
  const formValidation = useMemo(
    () => validateSchoolEventForm(form, events, editingEventId),
    [editingEventId, events, form],
  );
  const validationMessage = getInlineValidationMessage(formValidation);

  const setField = <K extends keyof SchoolEventFormState>(key: K, value: SchoolEventFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyFormState());
    setEditingEventId(null);
  };

  const handleYearStep = (step: -1 | 1) => {
    if (currentYearIndex < 0) return;
    const nextYear = schoolYearOptions[currentYearIndex + step];
    if (nextYear) setSelectedSchoolYear(nextYear);
  };

  const getPayload = (): CreateSchoolEventDto | UpdateSchoolEventDto | null => {
    if (!selectedSchoolYear) return null;
    if (!form.title.trim()) return null;
    if (!form.startsAt || !form.endsAt) return null;
    if (form.eventType === 'school_event' && !form.location.trim()) return null;

    const range = getFormDateRange(form);
    if (!range) return null;

    if (range.endMs < range.startMs) return null;
    if (validationMessage) return null;

    return {
      eventType: form.eventType,
      schoolYear: selectedSchoolYear,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      startsAt: form.allDay ? toIsoDateRange(form.startsAt, false) : toIsoDateTime(form.startsAt),
      endsAt: form.allDay ? toIsoDateRange(form.endsAt, true) : toIsoDateTime(form.endsAt),
      allDay: form.allDay,
    };
  };

  const submitForm = async () => {
    if (form.eventType === 'school_event' && !form.location.trim()) {
      toast.error('Location is required for school events.');
      return;
    }
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    const payload = getPayload();
    if (!payload) {
      toast.error('Please complete the form and ensure the end date is not earlier than the start date.');
      return;
    }

    try {
      setSaving(true);
      if (editingEventId) {
        await schoolEventService.update(editingEventId, payload);
        toast.success('School event updated.');
      } else {
        await schoolEventService.create(payload as CreateSchoolEventDto);
        toast.success('School event created.');
      }

      const refreshed = await schoolEventService.getAll({ schoolYear: selectedSchoolYear });
      setEvents(refreshed.data || []);
      resetForm();
    } catch {
      toast.error('Unable to save school event.');
    } finally {
      setSaving(false);
    }
  };

  const editEvent = (event: SchoolEvent) => {
    setEditingEventId(event.id);
    setForm(mapEventToForm(event));
  };

  const deleteEvent = async (event: SchoolEvent) => {
    try {
      await schoolEventService.remove(event.id);
      toast.success(`${event.title} archived.`);
      setEvents((current) => current.filter((row) => row.id !== event.id));
      if (editingEventId === event.id) resetForm();
    } catch {
      toast.error('Unable to archive event.');
    }
  };

  if (loading && schoolYearOptions.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <Skeleton className="h-80 rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Academic Calendar"
      title="School Calendar"
      description="Plan school events and breaks with a clearer, color-coded view for every teacher calendar."
      icon={CalendarDays}
      className={styles.calendarPage}
      actions={
        <div className={styles.actions}>
          <div className={styles.yearSwitcher}>
            <button
              type="button"
              onClick={() => handleYearStep(1)}
              disabled={currentYearIndex <= 0}
              aria-label="Switch to newer school year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select
              value={selectedSchoolYear}
              onChange={(event) => setSelectedSchoolYear(event.target.value)}
            >
              {schoolYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleYearStep(-1)}
              disabled={currentYearIndex === schoolYearOptions.length - 1 || currentYearIndex < 0}
              aria-label="Switch to older school year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => void refreshEvents(selectedSchoolYear)}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      }
    >
      <section className={styles.calendarHero} aria-label="Calendar overview">
        <div className={styles.heroCopy}>
          <span className={styles.heroKicker}>
            <Sparkles className="h-4 w-4" />
            Live academic planner
          </span>
          <h2>{selectedSchoolYear || 'School year'} rhythm board</h2>
          <p>
            Keep campus-wide dates easy to scan: school programs, celebrations, and holiday breaks now stand out before
            they reach teacher calendars.
          </p>
          <div className={styles.nextEventCard}>
            <div className={styles.nextEventIcon} aria-hidden="true">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <span>Next on deck</span>
              <strong>{eventStats.nextEvent ? eventStats.nextEvent.title : 'No upcoming entry yet'}</strong>
              <p>
                {eventStats.nextEvent
                  ? formatEventSpan(eventStats.nextEvent)
                  : 'Create the first calendar entry for this school year.'}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={`${styles.heroStat} ${styles.heroStatRed}`}>
            <span>Total entries</span>
            <strong>{eventStats.total}</strong>
            <small>Visible in teacher calendars</small>
          </div>
          <div className={`${styles.heroStat} ${styles.heroStatBlue}`}>
            <span>School events</span>
            <strong>{eventStats.schoolEvents}</strong>
            <small>Programs, meetings, and campus days</small>
          </div>
          <div className={`${styles.heroStat} ${styles.heroStatAmber}`}>
            <span>Breaks</span>
            <strong>{eventStats.breaks}</strong>
            <small>Holidays and suspension windows</small>
          </div>
          <div className={`${styles.heroStat} ${styles.heroStatGreen}`}>
            <span>Upcoming</span>
            <strong>{eventStats.upcoming}</strong>
            <small>Still active from today onward</small>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <AdminSectionCard
          title={editingEventId ? 'Edit School Event' : 'Create School Event'}
          description="Use all-day for date-only entries; disable all-day to input exact start and end times."
          className={styles.composerCard}
          action={
            <Button type="button" variant="outline" className="rounded-xl" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          }
        >
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label>Event Type</Label>
              <select
                value={form.eventType}
                onChange={(event) =>
                  setField('eventType', event.target.value as SchoolEventFormState['eventType'])
                }
              >
                <option value="school_event">School Event</option>
                <option value="holiday_break">Holiday / Break</option>
              </select>
            </div>
            <div className={styles.field}>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(event) => setField('title', event.target.value)}
                placeholder="Foundation Day Program"
                aria-invalid={Boolean(formValidation.title)}
                aria-describedby={formValidation.title ? 'calendar-title-validation' : undefined}
              />
              {formValidation.title ? (
                <p id="calendar-title-validation" className={styles.fieldFeedback} role="alert">
                  {formValidation.title}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(event) => setField('location', event.target.value)}
                placeholder="Main Campus Quadrangle"
                required={form.eventType === 'school_event'}
              />
            </div>
            <div className={styles.fieldCheckbox}>
              <label>
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(event) => setField('allDay', event.target.checked)}
                />
                All day event
              </label>
            </div>
            <div className={styles.field}>
              <Label>{form.allDay ? 'Start Date' : 'Start Date & Time'}</Label>
              <Input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.startsAt}
                min={getDateInputMinValue(form.allDay)}
                onChange={(event) => setField('startsAt', event.target.value)}
                aria-invalid={Boolean(formValidation.startsAt)}
                aria-describedby={formValidation.startsAt ? 'calendar-start-validation' : undefined}
              />
              {formValidation.startsAt ? (
                <p id="calendar-start-validation" className={styles.fieldFeedback} role="alert">
                  {formValidation.startsAt}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <Label>{form.allDay ? 'End Date' : 'End Date & Time'}</Label>
              <Input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.endsAt}
                min={getEndInputMinValue(form)}
                onChange={(event) => setField('endsAt', event.target.value)}
                aria-invalid={Boolean(formValidation.endsAt)}
                aria-describedby={formValidation.endsAt ? 'calendar-end-validation' : undefined}
              />
              {formValidation.endsAt ? (
                <p id="calendar-end-validation" className={styles.fieldFeedback} role="alert">
                  {formValidation.endsAt}
                </p>
              ) : null}
            </div>
            <div className={styles.fieldWide}>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                rows={4}
                placeholder="Optional details to show in calendars."
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" className="rounded-xl" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => void submitForm()}
              disabled={saving || Boolean(validationMessage)}
              title={validationMessage || undefined}
            >
              {editingEventId ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="School Event Timeline"
          description="Items in this school year are visible in teacher calendar views."
          className={styles.timelineCard}
        >
          {events.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays className="h-5 w-5" />
              <p>No entries yet for {selectedSchoolYear}.</p>
            </div>
          ) : (
            <div className={styles.eventList}>
              {events.map((event) => {
                const isBreak = event.eventType === 'holiday_break';

                return (
                  <article
                    key={event.id}
                    className={`${styles.eventCard} ${isBreak ? styles.eventCardBreak : styles.eventCardSchool}`}
                  >
                    <span className={styles.eventAura} aria-hidden="true" />
                    <div className={styles.eventTop}>
                      <span className={styles.eventType}>{getTypeLabel(event.eventType)}</span>
                      <span className={styles.eventSpan}>
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatEventSpan(event)}
                      </span>
                    </div>
                    <h3>{event.title}</h3>
                    <p className={styles.eventMeta}>
                      {event.location ? (
                        <>
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{event.location}</span>
                          <span className={styles.eventDot} aria-hidden="true" />
                        </>
                      ) : null}
                      <span>{event.schoolYear}</span>
                    </p>
                    {event.description ? <p className={styles.eventDescription}>{event.description}</p> : null}
                    <div className={styles.eventActions}>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => editEvent(event)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                        onClick={() => void deleteEvent(event)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Archive
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}
