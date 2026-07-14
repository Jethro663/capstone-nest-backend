'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, Hash, Megaphone, Pin, User2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { normalizeRichText } from '@/lib/rich-text';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

interface AnnouncementWithClass extends Announcement {
  className: string;
  subjectCode: string;
}

type AnnouncementViewFilter = 'all' | 'pinned';
type StudentPageStatus = 'loading' | 'ready' | 'error' | 'partial';

const ANNOUNCEMENT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

function formatAnnouncementDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', ANNOUNCEMENT_DATE_OPTIONS);
}

function summarizeAnnouncement(content: string) {
  const text = normalizeRichText(content)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return 'Open this announcement to view the full class update from your teacher.';
  }

  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export default function StudentAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementWithClass[]>([]);
  const [status, setStatus] = useState<StudentPageStatus>('loading');
  const [viewFilter, setViewFilter] = useState<AnnouncementViewFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setStatus('error');
      return;
    }

    try {
      setStatus('loading');
      const classesRes = await classService.getByStudent(user.id);
      const classes: ClassItem[] = classesRes.data || [];

      const results = await Promise.allSettled(
        classes.map(async (cls) => {
          const res = await announcementService.getByClass(cls.id);
          const items: Announcement[] = Array.isArray(res.data) ? res.data : [];
          return items.map((ann) => ({
            ...ann,
            className: cls.subjectName,
            subjectCode: cls.subjectCode,
          }));
        }),
      );

      const fulfilledResults = results.filter(
        (result): result is PromiseFulfilledResult<AnnouncementWithClass[]> =>
          result.status === 'fulfilled',
      );
      const failedCount = results.length - fulfilledResults.length;

      if (results.length > 0 && fulfilledResults.length === 0) {
        setStatus('error');
        return;
      }

      const all: AnnouncementWithClass[] = fulfilledResults
        .flatMap((result) => result.value)
        .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const dateA = new Date(a.createdAt ?? 0).getTime();
        const dateB = new Date(b.createdAt ?? 0).getTime();
        return dateB - dateA;
      });

      setAnnouncements(all);
      setStatus(failedCount > 0 ? 'partial' : 'ready');
    } catch {
      setStatus('error');
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const subjectFilters = useMemo(() => {
    const subjectMap = new Map<string, { code: string; className: string }>();

    for (const announcement of announcements) {
      const code = (announcement.subjectCode || 'GENERAL').trim();
      if (!subjectMap.has(code)) {
        subjectMap.set(code, {
          code,
          className: announcement.className,
        });
      }
    }

    return Array.from(subjectMap.values()).sort((left, right) =>
      left.code.localeCompare(right.code),
    );
  }, [announcements]);

  useEffect(() => {
    if (subjectFilter === 'all') return;
    if (subjectFilters.some((entry) => entry.code === subjectFilter)) return;
    setSubjectFilter('all');
  }, [subjectFilter, subjectFilters]);

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const resolvedSubjectCode = (announcement.subjectCode || 'GENERAL').trim();
        if (viewFilter === 'pinned' && !announcement.isPinned) return false;
        if (subjectFilter !== 'all' && resolvedSubjectCode !== subjectFilter) return false;
        return true;
      }),
    [announcements, subjectFilter, viewFilter],
  );

  const hasActiveFilters = viewFilter !== 'all' || subjectFilter !== 'all';
  const pinnedCount = announcements.filter((announcement) => announcement.isPinned).length;
  const latestAnnouncement = announcements[0];
  const latestAnnouncementDate = latestAnnouncement
    ? formatAnnouncementDate(latestAnnouncement.createdAt)
    : status === 'ready'
      ? 'No posts yet'
      : 'Unavailable';

  if (status === 'loading' && announcements.length === 0) {
    return (
      <div className="student-announcements-page">
        <Skeleton className="h-44 rounded-[1rem]" />
        <Skeleton className="h-20 rounded-[1rem]" />
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-56 rounded-[1rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error' && announcements.length === 0) {
    return (
      <DashboardStatePanel
        kind="error"
        title="Announcements couldn't be loaded"
        description="Your class announcements are temporarily unavailable. Try loading them again."
        primaryAction={{ label: 'Try again', onClick: () => void fetchData() }}
      />
    );
  }

  return (
    <div className="student-announcements-page">
      <section className="student-announcements-header">
        <div className="student-announcements-header__copy">
          <span className="student-announcements-header__icon" aria-hidden="true">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <h1>Announcements</h1>
            <p>Keep class updates structured with fast scanning and side metadata.</p>
          </div>
        </div>
        <div className="student-announcements-header__stats">
          <article className="student-announcements-header__stat">
            <p>Total posts</p>
            <strong>{announcements.length}</strong>
          </article>
          <article className="student-announcements-header__stat">
            <p>Pinned</p>
            <strong>{pinnedCount}</strong>
          </article>
          <article className="student-announcements-header__stat">
            <p>Latest</p>
            <strong>{latestAnnouncementDate}</strong>
          </article>
          <article className="student-announcements-header__stat">
            <p>Subjects</p>
            <strong>{subjectFilters.length || 'N/A'}</strong>
          </article>
        </div>
      </section>

      <section className="student-announcements-body">
        {status === 'partial' ? (
          <DashboardStatePanel
            kind="unavailable"
            title="Some announcements couldn't be loaded"
            description="Announcements from available classes remain visible while you retry the missing feeds."
            primaryAction={{
              label: 'Retry announcements',
              onClick: () => void fetchData(),
            }}
          />
        ) : status === 'error' ? (
          <DashboardStatePanel
            kind="unavailable"
            title="Announcement refresh failed"
            description="Your last complete announcement list remains visible while you retry."
            primaryAction={{
              label: 'Retry announcements',
              onClick: () => void fetchData(),
            }}
          />
        ) : null}

        <div className="student-announcements-toolbar">
          <p>
            Showing <strong>{filteredAnnouncements.length}</strong> of{' '}
            <strong>{announcements.length}</strong> announcements.
          </p>

          <div className="student-announcements-toolbar__controls">
            <div
              className="student-announcements-toolbar__toggle-group"
              role="group"
              aria-label="Announcement visibility filter"
            >
              <button
                type="button"
                data-active={viewFilter === 'all'}
                onClick={() => setViewFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                data-active={viewFilter === 'pinned'}
                onClick={() => setViewFilter('pinned')}
              >
                <Pin className="h-3.5 w-3.5" />
                Pinned
              </button>
            </div>

            <label className="student-announcements-toolbar__subject">
              <span>Subject</span>
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                aria-label="Filter announcements by subject"
              >
                <option value="all">All subjects</option>
                {subjectFilters.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.code} - {entry.className}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {status === 'ready' && filteredAnnouncements.length === 0 ? (
          <DashboardStatePanel
            kind="empty"
            title={
              announcements.length === 0
                ? 'No posts yet'
                : 'No announcements match these filters'
            }
            description={
              announcements.length === 0
                ? 'Announcements from your teachers will appear here.'
                : 'Reset the filters to see every available announcement.'
            }
            primaryAction={
              hasActiveFilters
                ? {
                    label: 'Reset filters',
                    onClick: () => {
                      setViewFilter('all');
                      setSubjectFilter('all');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="student-announcements-list">
            {filteredAnnouncements.map((ann) => (
              <article
                key={`${ann.classId}-${ann.id}`}
                className={`student-announcements-item ${ann.isPinned ? 'student-announcements-item--pinned' : ''}`}
              >
                <div className="student-announcements-item__layout">
                  <div className="student-announcements-item__main">
                    <header className="student-announcements-item__headline">
                      <div className="student-announcements-item__headline-top">
                        <h2>{ann.title}</h2>
                        {ann.isPinned ? (
                          <span className="student-announcements-item__pin-label">
                            <Pin className="h-3.5 w-3.5" />
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="student-announcements-item__summary">
                        {summarizeAnnouncement(ann.content)}
                      </p>
                    </header>

                    <section className="student-announcements-item__segment">
                      <p className="student-announcements-item__segment-label">Announcement details</p>
                      <RichTextRenderer
                        html={normalizeRichText(ann.content)}
                        className="student-announcements-item__content"
                      />
                    </section>
                  </div>

                  <aside
                    className="student-announcements-item__side"
                    aria-label={`Announcement metadata for ${ann.title}`}
                  >
                    <p className="student-announcements-item__side-title">Quick details</p>
                    <dl className="student-announcements-item__facts">
                      <div className="student-announcements-item__fact">
                        <dt>
                          <Calendar className="h-3.5 w-3.5" />
                          Date
                        </dt>
                        <dd>{formatAnnouncementDate(ann.createdAt)}</dd>
                      </div>
                      <div className="student-announcements-item__fact">
                        <dt>
                          <BookOpen className="h-3.5 w-3.5" />
                          Subject
                        </dt>
                        <dd>{ann.className || 'Class update'}</dd>
                      </div>
                      <div className="student-announcements-item__fact">
                        <dt>
                          <Hash className="h-3.5 w-3.5" />
                          Subject code
                        </dt>
                        <dd>{ann.subjectCode || 'Not set'}</dd>
                      </div>
                      <div className="student-announcements-item__fact">
                        <dt>
                          <User2 className="h-3.5 w-3.5" />
                          Posted by
                        </dt>
                        <dd>
                          {ann.author
                            ? `Prof. ${ann.author.firstName} ${ann.author.lastName}`
                            : 'Your teacher'}
                        </dd>
                      </div>
                    </dl>
                  </aside>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
