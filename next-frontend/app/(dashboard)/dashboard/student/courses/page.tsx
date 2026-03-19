'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, GraduationCap, Sparkles } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClassCard } from '@/components/class/ClassCard';
import { StudentEmptyState } from '@/components/student/student-primitives';
import type { ClassItem, ClassVisibilityStatus } from '@/types/class';

const fContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fItem: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 280, damping: 24 },
  },
};

interface ClassWithProgress extends ClassItem {
  progress: number;
  completedCount: number;
  totalLessons: number;
}

const TABS: Array<{ value: ClassVisibilityStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'hidden', label: 'Hidden' },
];

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ClassVisibilityStatus>('active');
  const [courses, setCourses] = useState<ClassWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await classService.getByStudent(user.id, tab);
      const classList = res.data || [];

      const withProgress = await Promise.all(
        classList.map(async (cls) => {
          try {
            const [lessonsRes, completedRes] = await Promise.all([
              lessonService.getByClass(cls.id),
              lessonService.getCompletedByClass(cls.id),
            ]);
            const publishedLessons = (lessonsRes.data || []).filter((lesson) => !lesson.isDraft);
            const totalLessons = publishedLessons.length;
            const completedCount = (completedRes.data || []).filter((entry) => entry.completed).length;

            return {
              ...cls,
              totalLessons,
              completedCount,
              progress: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
            };
          } catch {
            return {
              ...cls,
              totalLessons: 0,
              completedCount: 0,
              progress: 0,
            };
          }
        }),
      );

      setCourses(withProgress);
    } finally {
      setLoading(false);
    }
  }, [tab, user?.id]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const toggleHidden = useCallback(
    async (course: ClassWithProgress) => {
      try {
        setTogglingId(course.id);
        if (course.isHidden || tab === 'hidden') {
          await classService.unhide(course.id);
        } else {
          await classService.hide(course.id);
        }
        await fetchCourses();
      } finally {
        setTogglingId(null);
      }
    },
    [fetchCourses, tab],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-[1.5rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-7xl space-y-8 p-6 md:p-10"
      initial="hidden"
      animate="visible"
      variants={fContainer}
    >
      <motion.div variants={fItem} className="space-y-3">
        <div className="student-kicker inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
          <Sparkles className="h-3 w-3" /> Academic Progress
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--student-text-strong)]">My Courses</h1>
        <p className="text-sm font-medium text-[var(--student-text-muted)]">
          Keep your active classes in view, archive old work cleanly, and hide anything you want out of the main lane.
        </p>
      </motion.div>

      <motion.div variants={fItem} className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Button
            key={entry.value}
            type="button"
            size="sm"
            variant={tab === entry.value ? 'default' : 'outline'}
            className={tab === entry.value ? 'student-button-solid' : 'student-button-outline'}
            onClick={() => setTab(entry.value)}
          >
            {entry.label}
          </Button>
        ))}
      </motion.div>

      {courses.length === 0 ? (
        <motion.div variants={fItem}>
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
        </motion.div>
      ) : (
        <motion.div variants={fContainer} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <motion.div key={course.id} variants={fItem}>
              <ClassCard
                classItem={course}
                className="student-panel"
                subtitle={course.section?.name || 'Standard Section'}
                meta={[
                  `${course.completedCount} / ${course.totalLessons} lessons`,
                  `${course.progress}% progress`,
                ]}
                action={(
                  <Button
                    type="button"
                    size="sm"
                    className="student-button-outline"
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
                  <div className="space-y-3">
                    <div className="student-progress-track relative h-2 w-full overflow-hidden rounded-full">
                      <motion.div
                        className="student-progress-fill absolute left-0 top-0 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    </div>
                    <Link
                      href={`/dashboard/student/classes/${course.id}`}
                      className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--student-accent)]"
                    >
                      Open Class <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
