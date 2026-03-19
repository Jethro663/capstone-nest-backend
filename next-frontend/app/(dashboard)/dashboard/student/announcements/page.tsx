'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Inbox, Pin, User2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentPageShell, StudentPageStat, StudentSectionCard } from '@/components/student/StudentPageShell';
import { containerReveal, itemReveal } from '@/components/student/student-motion';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

interface AnnouncementWithClass extends Announcement {
  className: string;
  subjectCode: string;
}

function LocalEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-[var(--student-outline)] bg-[var(--student-surface-soft)]/30 p-16 text-center">
      <div className="mb-6 rounded-3xl bg-[var(--student-elevated)] p-6 text-[var(--student-text-muted)] shadow-sm">
        <Inbox className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-black text-[var(--student-text-strong)]">All caught up!</h3>
      <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-[var(--student-text-muted)]">
 
        No announcements have been posted for your classes yet. Check back later for updates.
      </p>
    </div>
  );
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
              className: `${cls.subjectName}`,
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
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <Skeleton className="h-44 rounded-[1.8rem]" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-[1.5rem]" />)}
        </div>
      </div>
    );
  }

  const pinnedCount = announcements.filter((ann) => ann.isPinned).length;

  return (
    <StudentPageShell
      badge="Class Bulletin"
      title="Announcements"
      description="Stay updated with class reminders, pinned messages, and teacher updates without missing the important stuff."
      stats={
        <>
          <StudentPageStat
            label="Posts"
            value={announcements.length}
            caption="Messages across your classes"
            icon={Inbox}
            accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
          />
          <StudentPageStat
            label="Pinned"
            value={pinnedCount}
            caption="Important updates to read first"
            icon={Pin}
            accent="bg-amber-100 text-amber-700"
          />
          <StudentPageStat
            label="Classes Active"
            value={new Set(announcements.map((ann) => ann.classId)).size}
            caption="Class feeds with posts"
            icon={Calendar}
            accent="bg-sky-100 text-sky-700"
          />
          <StudentPageStat
            label="Latest"
            value={announcements[0]?.createdAt ? new Date(announcements[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
            caption="Most recent post date"
            icon={User2}
            accent="bg-emerald-100 text-emerald-700"
          />
        </>
      }
    >
      <StudentSectionCard
        title="Bulletin Board"
        description="Pinned messages float to the top so the most important reminders are always easiest to find."
      >
        {announcements.length === 0 ? (
          <LocalEmptyState />
        ) : (
          <motion.div variants={containerReveal} initial="hidden" animate="visible" className="space-y-4">
            {announcements.map((ann) => (
              <motion.div
                key={`${ann.classId}-${ann.id}`}
                variants={itemReveal}
                className={`student-panel student-panel-hover rounded-[1.5rem] p-6 ${ann.isPinned ? 'border-[var(--student-accent-soft-strong)] bg-[linear-gradient(180deg,var(--student-elevated),var(--student-surface-soft))]' : ''}`}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="student-badge px-2 py-0 text-[10px] font-black">
                      {ann.subjectCode}
                    </Badge>
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--student-text-muted)]">
                      {ann.className}
                    </span>
                    {ann.isPinned ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-[var(--student-accent)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--student-accent-contrast)]">
                        <Pin className="h-3 w-3 fill-current" />
                        Pinned
                      </div>
                    ) : null}
 
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black leading-tight text-[var(--student-text-strong)]">
                      {ann.title}
                    </h3>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--student-text-muted)]">
                      {ann.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--student-outline)] pt-4">
                    <div className="flex items-center gap-2 text-xs text-[var(--student-text-muted)]">
                      <Calendar className="h-3.5 w-3.5" />
                      {ann.createdAt
                        ? new Date(ann.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : ''}
                    </div>
                    {ann.author ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]">
                          <User2 className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--student-text-strong)]">
                          Prof. {ann.author.firstName} {ann.author.lastName}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </StudentSectionCard>
    </StudentPageShell>
  );
}

