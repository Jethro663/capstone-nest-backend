'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { BookOpen, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StudentEmptyState } from '@/components/student/student-primitives';
import type { ClassItem } from '@/types/class';

const fContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fItem: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

interface ClassWithProgress extends ClassItem {
  progress: number;
  completedCount: number;
  totalLessons: number;
}

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<ClassWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Render empty state if progress data cannot be loaded.
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
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-[1.5rem]" />)}
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
      <motion.div variants={fItem} className="space-y-2">
        <div className="student-kicker inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
          <Sparkles className="h-3 w-3" /> Academic Progress
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--student-text-strong)]">My Courses</h1>
        <p className="text-sm font-medium text-[var(--student-text-muted)]">Track your class progress and continue where you left off.</p>
      </motion.div>

      {courses.length === 0 ? (
        <motion.div variants={fItem}>
          <StudentEmptyState
            title="No courses yet"
            description="You are not enrolled in any classes yet."
            icon={<GraduationCap className="h-5 w-5" />}
          />
        </motion.div>
      ) : (
        <motion.div
          variants={fContainer}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {courses.map((course) => (
            <motion.div key={course.id} variants={fItem} whileHover={{ y: -5 }}>
              <Link href={`/dashboard/student/classes/${course.id}`}>
                <div className="student-panel student-panel-hover group flex h-full flex-col rounded-[1.5rem] p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <Badge variant="outline" className="student-badge font-black text-[10px]">
                      {course.section?.gradeLevel ? `GRADE ${course.section.gradeLevel}` : 'COURSE'}
                    </Badge>
                    <div className="rounded-lg bg-[var(--student-surface-soft)] p-2 text-[var(--student-text-muted)] transition-colors group-hover:bg-[var(--student-accent-soft)] group-hover:text-[var(--student-accent)]">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-black leading-tight text-[var(--student-text-strong)] transition-colors group-hover:text-[var(--student-accent)]">
                      {course.subjectName || course.className || course.name}
                    </h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-tight text-[var(--student-text-muted)]">
                      {course.section?.name || 'Standard Section'}
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--student-text-muted)]">Progress</p>
                        <p className="text-sm font-black text-[var(--student-text-strong)]">{course.completedCount} / {course.totalLessons} Lessons</p>
                      </div>
                      <span className="text-lg font-black text-[var(--student-accent)]">{course.progress}%</span>
                    </div>

                    <div className="student-progress-track relative h-2 w-full overflow-hidden rounded-full">
                      <motion.div
                        className="student-progress-fill absolute left-0 top-0 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--student-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                        Continue Learning <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
