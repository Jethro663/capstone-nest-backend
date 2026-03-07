'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useReducedMotion, motion } from 'framer-motion';
import { BookOpen, ClipboardCheck, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentActionCard,
  StudentEmptyState,
  StudentSectionHeader,
  StudentStatCard,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import { getDescription, getTeacherName } from '@/utils/helpers';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const classRes = await classService.getByStudent(user.id);
      const enrolledClasses = classRes.data || [];
      setClasses(enrolledClasses);

      const [lessonResults, assessmentResults] = await Promise.all([
        Promise.all(enrolledClasses.slice(0, 8).map((c) => lessonService.getByClass(c.id).catch(() => ({ data: [] as Lesson[] })))),
        Promise.all(enrolledClasses.slice(0, 8).map((c) => assessmentService.getByClass(c.id).catch(() => ({ data: [] as Assessment[] })))),
      ]);

      setLessons(lessonResults.flatMap((r) => r.data || []));
      setAssessments(assessmentResults.flatMap((r) => r.data || []));
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
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const profileIncomplete = !user?.firstName || !user?.lastName;
  const publishedAssessments = assessments.filter((a) => a.isPublished);
  const completionRate = lessons.length > 0 ? Math.min(100, Math.round((classes.length / Math.max(1, lessons.length)) * 100)) : 0;

  return (
    <div className="student-page space-y-8 rounded-3xl p-1">
      <motion.section {...motionProps.container} className="space-y-8">
        <motion.div {...motionProps.item} className="student-card overflow-hidden border-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white">
          <div className="p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Student learning hub
                </p>
                <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  Welcome back, {user?.firstName || 'Student'}.
                </h1>
                <p className="mt-2 max-w-xl text-sm text-red-50">
                  Continue your lessons, check your assessments, and keep your progress moving every day.
                </p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-wide text-red-100">Profile completion</p>
                <p className="mt-1 text-2xl font-extrabold">{profileIncomplete ? '70%' : '100%'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {profileIncomplete && (
          <motion.div {...motionProps.item}>
            <StudentActionCard className="border-red-300 bg-red-50/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-red-900">Profile Incomplete</p>
                  <p className="text-sm text-red-700">Complete your profile so all student features stay available.</p>
                </div>
                <Link href="/complete-profile">
                  <Button variant="destructive" size="sm">Complete Profile</Button>
                </Link>
              </div>
            </StudentActionCard>
          </motion.div>
        )}

        <motion.div {...motionProps.container} className="grid gap-4 md:grid-cols-3">
          <StudentStatCard label="Classes" value={classes.length} accent="bg-red-500" icon={<GraduationCap className="h-4 w-4" />} />
          <StudentStatCard label="Lessons" value={lessons.length} accent="bg-blue-500" icon={<BookOpen className="h-4 w-4" />} />
          <StudentStatCard label="Assessments" value={publishedAssessments.length} accent="bg-amber-500" icon={<ClipboardCheck className="h-4 w-4" />} />
        </motion.div>

        <motion.div {...motionProps.item}>
          <StudentActionCard>
            <StudentSectionHeader
              title="Learning Momentum"
              subtitle="A quick pulse of your current activity."
            />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-red-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Active Courses</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{classes.length}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Published Assessments</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{publishedAssessments.length}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Progress Pulse</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{completionRate}%</p>
              </div>
            </div>
          </StudentActionCard>
        </motion.div>

        <motion.section {...motionProps.item} className="space-y-4">
          <StudentSectionHeader title="Your Classes" subtitle="Jump straight into your enrolled subjects." />
          {classes.length === 0 ? (
            <StudentEmptyState
              title="No classes yet"
              description="You are not enrolled in any classes. Ask your teacher or adviser for enrollment details."
              icon={<GraduationCap className="h-5 w-5" />}
            />
          ) : (
            <motion.div {...motionProps.container} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.slice(0, 6).map((cls) => (
                <motion.div key={cls.id} {...motionProps.item}>
                  <StudentActionCard>
                    <p className="text-base font-semibold text-slate-900">{cls.subjectName || cls.className || cls.name}</p>
                    <p className="mt-1 text-sm student-muted-text">{getTeacherName(cls.teacher)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <StudentStatusChip tone="info">Class</StudentStatusChip>
                      <Link href={`/dashboard/student/classes/${cls.id}`}>
                        <Button variant="ghost" className="h-8 px-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
                          Open
                        </Button>
                      </Link>
                    </div>
                  </StudentActionCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.section>

        {lessons.length > 0 && (
          <motion.section {...motionProps.item} className="space-y-4">
            <StudentSectionHeader title="Recent Lessons" subtitle="Pick up where you left off." />
            <motion.div {...motionProps.container} className="grid gap-4 md:grid-cols-2">
              {lessons.slice(0, 4).map((lesson) => (
                <motion.div key={lesson.id} {...motionProps.item}>
                  <StudentActionCard>
                    <p className="font-semibold text-slate-900">{lesson.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm student-muted-text">{getDescription(lesson.description)}</p>
                    <Link href={`/dashboard/student/lessons/${lesson.id}`}>
                      <Button variant="link" className="mt-2 h-auto p-0 text-red-600">Continue Lesson</Button>
                    </Link>
                  </StudentActionCard>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

        {publishedAssessments.length > 0 && (
          <motion.section {...motionProps.item} className="space-y-4">
            <StudentSectionHeader title="Pending Assessments" subtitle="Stay on schedule and submit before deadlines." />
            <motion.div {...motionProps.container} className="grid gap-4 md:grid-cols-2">
              {publishedAssessments.slice(0, 4).map((assessment) => {
                const isPastDue = assessment.dueDate && new Date(assessment.dueDate) < new Date();
                const typeTone = assessment.type === 'exam' ? 'danger' : assessment.type === 'assignment' ? 'warning' : 'info';

                return (
                  <motion.div key={assessment.id} {...motionProps.item}>
                    <StudentActionCard className={isPastDue ? 'border-rose-300 bg-rose-50/70' : ''}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 font-semibold text-slate-900">{assessment.title}</p>
                        <StudentStatusChip tone={typeTone}>{assessment.type}</StudentStatusChip>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm student-muted-text">{getDescription(assessment.description)}</p>
                      <div className="mt-3 flex items-center justify-between">
                        {assessment.dueDate ? (
                          <p className={isPastDue ? 'text-xs font-semibold text-rose-700' : 'text-xs student-muted-text'}>
                            {isPastDue ? 'Past due' : 'Due'}: {new Date(assessment.dueDate).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-xs student-muted-text">No due date</p>
                        )}
                        <Link href={`/dashboard/student/assessments/${assessment.id}`}>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            Open
                          </Button>
                        </Link>
                      </div>
                    </StudentActionCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.section>
        )}
      </motion.section>
    </div>
  );
}
