'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { useAuth } from '@/providers/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { TeacherContextRail } from '@/components/teacher/TeacherContextRail';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

export default function TeacherCalendarPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const classesRes = await classService.getByTeacher(user.id, 'active');
      const classData = classesRes.data || [];
      setClasses(classData);

      const announcementResponses = await Promise.all(
        classData.slice(0, 5).map((classItem) =>
          announcementService.getByClass(classItem.id, { limit: 2 }).catch(() => ({
            success: true,
            message: '',
            data: [] as Announcement[],
          })),
        ),
      );
      setAnnouncements(
        announcementResponses
          .flatMap((response) => response.data || [])
          .slice(0, 8),
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const scheduleRows = useMemo(
    () =>
      classes.flatMap((classItem) =>
        (classItem.schedules || []).map((schedule) => ({
          id: `${classItem.id}-${schedule.id}`,
          subject: classItem.subjectName,
          section: classItem.section?.name ?? 'Section',
          days: schedule.days.join('/'),
          range: `${schedule.startTime}-${schedule.endTime}`,
          room: classItem.room || 'Room TBA',
        })),
      ),
    [classes],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-[28rem] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="teacher-classes-shell">
      <div className="teacher-classes-main">
        <header className="teacher-page-header">
          <div>
            <h1>Calendar</h1>
            <p>Teacher-first schedule view across your active classes.</p>
          </div>
        </header>

        <section className="teacher-schedule-table">
          {scheduleRows.length === 0 ? (
            <div className="teacher-empty-panel">
              <p>No schedules found for your active classes.</p>
            </div>
          ) : (
            scheduleRows.map((row) => (
              <article key={row.id} className="teacher-schedule-row">
                <div>
                  <h3>{row.subject}</h3>
                  <p>{row.section}</p>
                </div>
                <div>
                  <span>{row.days}</span>
                  <span>{row.range}</span>
                  <span>{row.room}</span>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      <TeacherContextRail announcements={announcements} classes={classes} title="Calendar" />
    </div>
  );
}
