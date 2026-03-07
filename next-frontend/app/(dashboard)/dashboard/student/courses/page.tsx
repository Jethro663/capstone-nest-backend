'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, GraduationCap } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentActionCard, StudentEmptyState, StudentSectionHeader } from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import type { ClassItem } from '@/types/class';

interface ClassWithProgress extends ClassItem {
  progress: number;
  completedCount: number;
  totalLessons: number;
}

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);
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
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="student-page space-y-6 rounded-3xl p-1">
      <StudentSectionHeader
        title="My Courses"
        subtitle="Track your class progress and continue where you left off."
      />

      {courses.length === 0 ? (
        <StudentEmptyState
          title="No courses yet"
          description="You are not enrolled in any classes yet."
          icon={<GraduationCap className="h-5 w-5" />}
        />
      ) : (
        <motion.div {...motionProps.container} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <motion.div key={course.id} {...motionProps.item}>
              <Link href={`/dashboard/student/classes/${course.id}`}>
                <StudentActionCard>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{course.subjectName || course.className || course.name}</p>
                      <p className="text-sm student-muted-text">{course.section?.name} • Grade {course.section?.gradeLevel}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-red-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>

                  <p className="mt-3 text-sm student-muted-text">{course.totalLessons} lessons</p>
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs student-muted-text">
                      <span>{course.completedCount} completed</span>
                      <span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>
                </StudentActionCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
