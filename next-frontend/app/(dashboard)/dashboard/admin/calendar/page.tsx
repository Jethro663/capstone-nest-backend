'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCcw,
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

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
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

  const currentYearIndex = schoolYearOptions.indexOf(selectedSchoolYear);

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

    const startsAt = form.allDay ? toIsoDateRange(form.startsAt, false) : toIsoDateTime(form.startsAt);
    const endsAt = form.allDay ? toIsoDateRange(form.endsAt, true) : toIsoDateTime(form.endsAt);

    if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) return null;

    return {
      eventType: form.eventType,
      schoolYear: selectedSchoolYear,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      startsAt,
      endsAt,
      allDay: form.allDay,
    };
  };

  const submitForm = async () => {
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
      description="Admin-managed school events and holiday breaks reflected in teacher calendars."
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
      <div className={styles.layout}>
        <AdminSectionCard
          title={editingEventId ? 'Edit School Event' : 'Create School Event'}
          description="Use all-day for date-only entries; disable all-day to input exact start and end times."
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
              />
            </div>
            <div className={styles.field}>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(event) => setField('location', event.target.value)}
                placeholder="Main Campus Quadrangle"
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
                onChange={(event) => setField('startsAt', event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Label>{form.allDay ? 'End Date' : 'End Date & Time'}</Label>
              <Input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.endsAt}
                onChange={(event) => setField('endsAt', event.target.value)}
              />
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
            <Button type="button" className="rounded-xl" onClick={() => void submitForm()} disabled={saving}>
              {editingEventId ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="School Event Timeline"
          description="Items in this school year are visible in teacher calendar views."
        >
          {events.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays className="h-5 w-5" />
              <p>No entries yet for {selectedSchoolYear}.</p>
            </div>
          ) : (
            <div className={styles.eventList}>
              {events.map((event) => (
                <article key={event.id} className={styles.eventCard}>
                  <div className={styles.eventTop}>
                    <span className={styles.eventType}>{getTypeLabel(event.eventType)}</span>
                    <span className={styles.eventSpan}>{formatEventSpan(event)}</span>
                  </div>
                  <h3>{event.title}</h3>
                  <p className={styles.eventMeta}>
                    {event.location ? `${event.location} - ` : ''}
                    {event.schoolYear}
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
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}
