'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, Hash, Inbox, Pin, User2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { normalizeRichText } from '@/lib/rich-text';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Skeleton } from '@/components/ui/skeleton';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

interface AnnouncementWithClass extends Announcement {
  className: string;
  subjectCode: string;
}

type AnnouncementViewFilter = 'all' | 'pinned';

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
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<AnnouncementViewFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const classesRes = await classService.getByStudent(user.id);
      const classes: ClassItem[] = classesRes.data || [];

      const results = await Promise.all(
        classes.map(async (cls) => {
          try {
            const res = await announcementService.getByClass(cls.id);
            const items: Announcement[] = Array.isArray(res.data) ? res.data : [];
            return items.map((ann) => ({
              ...ann,
              className: cls.subjectName,
              subjectCode: cls.subjectCode,
            }));
          } catch {
            return [];
          }
        }),
      );

      const all: AnnouncementWithClass[] = results.flat().sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const dateA = new Date(a.createdAt ?? 0).getTime();
        const dateB = new Date(b.createdAt ?? 0).getTime();
        return dateB - dateA;
      });

      setAnnouncements(all);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
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

  if (loading) {
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

  return (
    <div className="student-announcements-page">
      <section className="student-announcements-body">
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

        {filteredAnnouncements.length === 0 ? (
          <div className="student-announcements-empty">
            <div className="space-y-3">
              <Inbox className="mx-auto h-8 w-8 text-[var(--student-text-muted)]" />
              <p>
                {announcements.length === 0
                  ? 'No announcements have been posted for your classes yet.'
                  : 'No announcements match your selected filters.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="student-announcements-empty__reset"
                  onClick={() => {
                    setViewFilter('all');
                    setSubjectFilter('all');
                  }}
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          </div>
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
