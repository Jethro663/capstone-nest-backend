'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, GraduationCap, Layers3, LibraryBig, TimerReset } from 'lucide-react';
import { motion } from 'framer-motion';
 
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClassCard } from '@/components/class/ClassCard';
import { StudentEmptyState } from '@/components/student/student-primitives';
import { StudentPageShell, StudentPageStat } from '@/components/student/StudentPageShell';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { containerReveal, itemReveal } from '@/components/student/student-motion';
import type { ClassItem, ClassVisibilityStatus } from '@/types/class';

 
interface ClassWithProgress extends ClassItem {
  progress: number;
  completedCount: number;
  totalLessons: number;
}

const TABS: Array<{ value: ClassVisibilityStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'hidden', label: 'Hidden' },
];

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<ClassWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ClassVisibilityStatus>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await classService.getByStudent(user.id);
      const enrolled = res.data || [];

      const withProgress = await Promise.all(
        enrolled.map(async (cls) => {
          try {
            const [lessonsRes, completedRes] = await Promise.all([
              lessonService.getByClass(cls.id),
              lessonService.getCompletedByClass(cls.id),
            ]);
            const total = lessonsRes.data?.length ?? 0;
            const completed = completedRes.data?.length ?? 0;
            return {
              ...cls,
              totalLessons: total,
              completedCount: completed,
              progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            };
          } catch {
            return { ...cls, totalLessons: 0, completedCount: 0, progress: 0 };
          }
        }),
      );

      setCourses(withProgress);
    } catch {
      /* fail silently */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const progressAverage = useMemo(() => {
    if (!courses.length) return 0;
    return Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length);
  }, [courses]);

  const inProgressCount = courses.filter(
    (course) => course.progress > 0 && course.progress < 100,
  ).length;
  const hiddenCount = courses.filter((course) => course.isHidden).length;

  const visibleCourses = useMemo(() => {
    return courses.filter((course) => {
      if (tab === 'hidden') {
        return Boolean(course.isHidden);
      }
      if (course.isHidden) {
        return false;
      }
      if (tab === 'active') {
        return course.isActive;
      }
      if (tab === 'archived') {
        return !course.isActive;
      }
      return true;
    });
  }, [courses, tab]);

  const toggleHidden = useCallback(async (course: ClassWithProgress) => {
    setTogglingId(course.id);
    try {
      if (course.isHidden) {
        await classService.unhide(course.id);
      } else {
        await classService.hide(course.id);
      }

      setCourses((current) => current.map((entry) => (
        entry.id === course.id ? { ...entry, isHidden: !entry.isHidden } : entry
      )));
    } finally {
      setTogglingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <Skeleton className="h-44 rounded-[1.8rem]" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-[1.5rem]" />)}
 
        </div>
      </div>
    );
  }

  return (
    <StudentPageShell
      badge="Learning Home"
      title="My Courses"
      description="Keep your classes organized, spot what needs attention next, and jump back into lessons without digging around."
      actions={
        <Tabs value={tab} onValueChange={(value) => setTab(value as ClassVisibilityStatus)}>
          <TabsList className="student-tab-list h-auto flex-wrap justify-start">
            {TABS.map((entry) => (
              <TabsTrigger
                key={entry.value}
                value={entry.value}
                className="student-tab px-4 py-2.5 text-sm font-bold"
              >
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      stats={
        <>
          <StudentPageStat
            label="Courses"
            value={courses.length}
            caption={`Showing ${tab} classes`}
            icon={LibraryBig}
            accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
 
          />
          <StudentPageStat
            label="In Progress"
            value={inProgressCount}
            caption="Classes with active lesson progress"
            icon={Layers3}
            accent="bg-sky-100 text-sky-700"
          />
          <StudentPageStat
            label="Average Progress"
            value={`${progressAverage}%`}
            caption="Across the visible classes"
            icon={TimerReset}
            accent="bg-amber-100 text-amber-700"
          />
          <StudentPageStat
            label={tab === 'hidden' ? 'Ready to Restore' : 'Lessons Finished'}
            value={
              tab === 'hidden'
                ? hiddenCount
                : courses.filter((course) => course.progress === 100).length
            }
            caption={tab === 'hidden' ? 'Hidden classes in storage' : 'Fully completed classes'}
            icon={GraduationCap}
            accent="bg-emerald-100 text-emerald-700"
          />
        </>
      }
    >
      {visibleCourses.length === 0 ? (
        <StudentEmptyState
          title={`No ${tab} courses`}
          description={
            tab === 'hidden'
              ? 'Hidden classes will stay here until you restore them.'
              : tab === 'archived'
                ? 'Archived classes will appear here when your term closes.'
                : 'You are not enrolled in any active classes yet.'
          }
          icon={<GraduationCap className="h-5 w-5" />}
        />
      ) : (
        <motion.div
          variants={containerReveal}
          initial="hidden"
          animate="visible"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleCourses.map((course) => (
            <motion.div key={course.id} variants={itemReveal}>
              <ClassCard
                classItem={course}
                className="student-panel student-panel-hover"
                subtitle={course.section?.name || 'Standard Section'}
                meta={[
                  `${course.completedCount} / ${course.totalLessons} lessons`,
                  `${course.progress}% progress`,
                ]}
                action={(
                  <Button
                    type="button"
                    size="sm"
                    className="student-button-outline rounded-xl"
                    disabled={togglingId === course.id}
                    onClick={() => void toggleHidden(course)}
                  >
                    {course.isHidden || tab === 'hidden' ? (
                      <>
                        <Eye className="mr-2 h-4 w-4" /> Restore
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide
                      </>
                    )}
                  </Button>
                )}
                footer={(
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                        <span>Course Journey</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="student-progress-track relative h-2.5 w-full overflow-hidden rounded-full">
                        <motion.div
                          className="student-progress-fill absolute left-0 top-0 h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/student/classes/${course.id}`}
                      className="flex items-center justify-between rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--student-accent)] transition hover:border-[var(--student-outline-strong)]"
                    >
                      Open Class
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </StudentPageShell>
  );
}

