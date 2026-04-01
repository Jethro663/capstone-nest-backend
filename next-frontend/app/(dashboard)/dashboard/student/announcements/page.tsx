'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Inbox, Megaphone, Pin, User2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { plainTextToRichHtml } from '@/lib/rich-text';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Skeleton } from '@/components/ui/skeleton';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

interface AnnouncementWithClass extends Announcement {
  className: string;
  subjectCode: string;
}

function announcementContentToHtml(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return plainTextToRichHtml(trimmed);
}

export default function StudentAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementWithClass[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="student-announcements-page space-y-5">
        <Skeleton className="h-32 rounded-[1rem]" />
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40 rounded-[1rem]" />
          ))}
        </div>
      </div>
    );
  }

  const pinnedCount = announcements.filter((announcement) => announcement.isPinned).length;
  const activeClassCount = new Set(announcements.map((announcement) => announcement.classId)).size;

  return (
    <div className="student-announcements-page space-y-5">
      <section className="student-announcements-header">
        <div className="student-announcements-header__copy">
          <span className="student-announcements-header__icon" aria-hidden="true">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <h1>Announcements</h1>
            <p>Class reminders and updates across your enrolled subjects.</p>
          </div>
        </div>
      </section>

      <section className="student-announcements-body">
        <div className="student-announcements-toolbar">
          <p>
            Viewing <strong>{announcements.length}</strong> posts from <strong>{activeClassCount}</strong>{' '}
            active classes.
          </p>
          <span className="student-announcements-toolbar__pin">
            <Pin className="h-3.5 w-3.5" />
            {pinnedCount} pinned
          </span>
        </div>

        {announcements.length === 0 ? (
          <div className="student-announcements-empty">
            <div className="space-y-3">
              <Inbox className="mx-auto h-8 w-8 text-[var(--student-text-muted)]" />
              <p>No announcements have been posted for your classes yet.</p>
            </div>
          </div>
        ) : (
          <div className="student-announcements-list">
            {announcements.map((ann) => (
              <article
                key={`${ann.classId}-${ann.id}`}
                className={`student-announcements-item ${ann.isPinned ? 'student-announcements-item--pinned' : ''}`}
              >
                <div className="student-announcements-item__main">
                  <div className="student-announcements-item__title-row">
                    <h2>{ann.title}</h2>
                    <div className="student-announcements-item__meta">
                      {ann.isPinned ? (
                        <span className="student-announcements-item__pin-label">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </span>
                      ) : null}
                      <span>
                        {ann.createdAt
                          ? new Date(ann.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                      <span>{ann.className}</span>
                    </div>
                  </div>

                  <div className="student-announcements-item__subject">
                    <span className="student-announcements-item__subject-code">{ann.subjectCode}</span>
                  </div>

                  <RichTextRenderer
                    html={announcementContentToHtml(ann.content)}
                    className="student-announcements-item__content"
                  />

                  <div className="student-announcements-item__footer">
                    <div className="student-announcements-item__date">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {ann.createdAt
                          ? new Date(ann.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                    <p className="student-announcements-item__author">
                      <User2 className="h-3.5 w-3.5" />
                      {ann.author
                        ? `Prof. ${ann.author.firstName} ${ann.author.lastName}`
                        : 'Posted by your teacher'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
