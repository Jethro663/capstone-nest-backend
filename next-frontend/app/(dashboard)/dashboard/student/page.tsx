'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentPageShell,
  StudentPageStat,
  StudentSectionCard,
} from '@/components/student/StudentPageShell';
import { StudentStatusChip } from '@/components/student/student-primitives';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import { getTeacherName } from '@/utils/helpers';

function formatShortDate(value?: string) {
  if (!value) {
    return 'No due date';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getAssessmentHref(assessment: Assessment) {
  return assessment.type === 'file_upload'
    ? `/dashboard/student/assessments/${assessment.id}/take`
    : `/dashboard/student/assessments/${assessment.id}`;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoading(true);
      const classRes = await classService.getByStudent(user.id);
      const enrolledClasses = classRes.data || [];
      setClasses(enrolledClasses);

      const [lessonResults, assessmentResults] = await Promise.all([
        Promise.all(
          enrolledClasses
            .slice(0, 8)
            .map((course) =>
              lessonService.getByClass(course.id).catch(() => ({ data: [] as Lesson[] })),
            ),
        ),
        Promise.all(
          enrolledClasses
            .slice(0, 8)
            .map((course) =>
              assessmentService.getByClass(course.id).catch(() => ({ data: [] as Assessment[] })),
            ),
        ),
      ]);

      setLessons(lessonResults.flatMap((result) => result.data || []));
      setAssessments(assessmentResults.flatMap((result) => result.data || []));
    } catch {
      // Keep the dashboard usable even if one of the feeds has an issue.
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
        <Skeleton className="h-52 w-full rounded-[1.75rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
        <Skeleton className="h-52 w-full rounded-[1.7rem]" />
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Skeleton className="h-[26rem] rounded-[1.7rem]" />
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-[1.7rem]" />
            <Skeleton className="h-64 rounded-[1.7rem]" />
          </div>
        </div>
      </div>
    );
  }

  const profileIncomplete = !user?.firstName || !user?.lastName;
  const publishedAssessments = assessments.filter((assessment) => assessment.isPublished);
  const recentLessons = lessons.slice(0, 4);
  const pendingAssessments = publishedAssessments.slice(0, 4);
  const featuredClasses = classes.slice(0, 3);
  const profileCompletion = profileIncomplete ? 70 : 100;
  const learningProgress = lessons.length > 0
    ? Math.min(100, Math.round((classes.length / Math.max(1, lessons.length)) * 100))
    : 0;
  const completedFocusCount = Math.max(0, lessons.length - pendingAssessments.length);
  const continueHref = classes[0] ? `/dashboard/student/classes/${classes[0].id}` : '/dashboard/student/courses';

  return (
    <StudentPageShell
      badge="Student Dashboard"
      title={`Welcome back, ${user?.firstName || 'Student'}!`}
      description={
        classes.length > 0
          ? `You're enrolled in ${classes.length} class${classes.length === 1 ? '' : 'es'} today. Let's keep your learning streak moving with a quick, calm view of what's next.`
          : 'Your learning space is ready. Once your classes appear, this dashboard will guide you to what to read, finish, and celebrate next.'
      }
      actions={(
        <>
          <Link href={continueHref}>
            <Button className="student-button-solid rounded-2xl px-5 font-black">
              Continue Learning
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/student/courses">
            <Button variant="outline" className="student-button-outline rounded-2xl px-5 font-black">
              View My Courses
            </Button>
          </Link>
        </>
      )}
      stats={(
        <>
          <StudentPageStat
            label="Enrolled Classes"
            value={classes.length}
            caption={classes.length > 0 ? 'Learning spaces ready for you' : 'Waiting for your first class'}
            icon={GraduationCap}
            accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
          />
          <StudentPageStat
            label="Ready Lessons"
            value={lessons.length}
            caption={recentLessons.length > 0 ? `${recentLessons.length} fresh lessons to revisit` : 'New lessons will show up here'}
            icon={BookOpenCheck}
            accent="bg-[rgba(16,185,129,0.16)] text-emerald-600"
          />
          <StudentPageStat
            label="Pending Tasks"
            value={publishedAssessments.length}
            caption={publishedAssessments.length > 0 ? 'Friendly reminders, not pressure' : 'Nothing urgent right now'}
            icon={ClipboardCheck}
            accent="bg-[rgba(245,158,11,0.18)] text-amber-600"
          />
          <StudentPageStat
            label="Profile Ready"
            value={`${profileCompletion}%`}
            caption={profileIncomplete ? 'Complete your profile when you have a moment' : 'Everything looks ready to go'}
            icon={Target}
            accent="bg-[rgba(59,130,246,0.16)] text-sky-600"
          />
        </>
      )}
    >
      <StudentSectionCard
        title="Today's Learning Rhythm"
        description="A softer progress snapshot so you can quickly see where you are and where to head next."
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="student-dashboard-progress-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                  Learning Progress
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--student-text-strong)]">
                  {learningProgress}%
                </p>
                <p className="mt-2 max-w-md text-sm text-[var(--student-text-muted)]">
                  You already have {classes.length} class{classes.length === 1 ? '' : 'es'} in motion and {lessons.length} lesson{lessons.length === 1 ? '' : 's'} ready to explore.
                </p>
              </div>
              <div className="student-dashboard-hero-chip">
                <Sparkles className="h-4 w-4 text-[var(--student-accent)]" />
                <span>Keep the streak alive</span>
              </div>
            </div>
            <div className="mt-5">
              <div className="student-dashboard-meter">
                <div
                  className="student-dashboard-meter__fill"
                  style={{ width: `${Math.max(12, learningProgress)}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="student-dashboard-hero-chip">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <span>{completedFocusCount} completed focus item{completedFocusCount === 1 ? '' : 's'}</span>
                </div>
                <div className="student-dashboard-hero-chip">
                  <CalendarClock className="h-4 w-4 text-amber-600" />
                  <span>{pendingAssessments.length} task{pendingAssessments.length === 1 ? '' : 's'} to check soon</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="student-dashboard-mini-card">
              <div className="flex items-center gap-3">
                <div className="student-dashboard-mini-card__icon bg-[rgba(59,130,246,0.14)] text-sky-600">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--student-text-muted)]">
                    Profile Check
                  </p>
                  <p className="text-sm font-bold text-[var(--student-text-strong)]">
                    {profileIncomplete ? 'Almost there' : 'All set'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--student-text-muted)]">
                {profileIncomplete
                  ? 'Adding the last few profile details helps your dashboard stay personal and complete.'
                  : 'Your account details are ready, so you can focus on classes and tasks.'}
              </p>
            </div>

            <div className="student-dashboard-mini-card">
              <div className="flex items-center gap-3">
                <div className="student-dashboard-mini-card__icon bg-[rgba(16,185,129,0.16)] text-emerald-600">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--student-text-muted)]">
                    Quick Focus
                  </p>
                  <p className="text-sm font-bold text-[var(--student-text-strong)]">
                    {recentLessons.length > 0 ? 'Revisit your newest lesson' : 'Your next lesson will appear here'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--student-text-muted)]">
                {recentLessons.length > 0
                  ? `Start with ${recentLessons[0].title} for an easy return to today's learning flow.`
                  : 'Once a lesson is shared with you, this card becomes your quickest way back in.'}
              </p>
            </div>
          </div>
        </div>
      </StudentSectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <StudentSectionCard
          title="Keep Exploring Your Classes"
          description="Your class cards are now built to be easier to scan, friendlier to use, and quicker to jump into."
          action={(
            <Link href="/dashboard/student/courses">
              <Button variant="outline" className="student-button-outline rounded-xl text-xs font-black">
                View all courses
              </Button>
            </Link>
          )}
        >
          {featuredClasses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredClasses.map((course) => {
                const classLessons = lessons.filter((lesson) => lesson.classId === course.id).length;
                const classAssessments = publishedAssessments.filter((assessment) => assessment.classId === course.id).length;
                const displayName = course.subjectName || course.className || course.name;

                return (
                  <motion.article
                    key={course.id}
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.99 }}
                    className="student-dashboard-course-card"
                  >
                    <div className="student-dashboard-course-card__glow" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <Badge variant="outline" className="student-badge px-2 py-0 text-[10px] font-black">
                          CLASSROOM
                        </Badge>
                        <div className="student-dashboard-hero-chip">
                          <BookOpen className="h-4 w-4 text-[var(--student-accent)]" />
                          <span>{classLessons} lesson{classLessons === 1 ? '' : 's'}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="line-clamp-2 text-lg font-black leading-tight text-[var(--student-text-strong)]">
                          {displayName}
                        </h3>
                        <p className="text-sm text-[var(--student-text-muted)]">
                          Learn with {getTeacherName(course.teacher)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="student-dashboard-course-card__metric">
                          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                            Lessons
                          </span>
                          <strong>{classLessons}</strong>
                        </div>
                        <div className="student-dashboard-course-card__metric">
                          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                            Tasks
                          </span>
                          <strong>{classAssessments}</strong>
                        </div>
                      </div>

                      <div className="student-dashboard-meter student-dashboard-meter--compact">
                        <div
                          className="student-dashboard-meter__fill"
                          style={{
                            width: `${Math.max(
                              14,
                              Math.min(
                                100,
                                Math.round(((classLessons + Math.max(1, classAssessments)) / Math.max(1, lessons.length + publishedAssessments.length)) * 100),
                              ),
                            )}%`,
                          }}
                        />
                      </div>

                      <Link href={`/dashboard/student/classes/${course.id}`}>
                        <Button className="student-button-solid h-11 w-full rounded-2xl justify-between px-4 font-black">
                          Enter Class
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="student-dashboard-empty">
              <GraduationCap className="h-8 w-8 text-[var(--student-accent)]" />
              <div className="space-y-1">
                <p className="text-base font-black text-[var(--student-text-strong)]">Your dashboard is ready for your first class.</p>
                <p className="text-sm text-[var(--student-text-muted)]">
                  Once you&apos;re enrolled, your active classrooms will show up here with quick ways to continue learning.
                </p>
              </div>
              <Link href="/dashboard/student/courses">
                <Button variant="outline" className="student-button-outline rounded-xl font-black">
                  Open My Courses
                </Button>
              </Link>
            </div>
          )}
        </StudentSectionCard>

        <div className="space-y-6">
          <StudentSectionCard
            title="Recent Lessons"
            description="Easy re-entry points so you can pick up where you left off without hunting around."
          >
            {recentLessons.length > 0 ? (
              <div className="space-y-3">
                {recentLessons.map((lesson, index) => (
                  <motion.div key={lesson.id} whileHover={{ x: 4 }} className="student-dashboard-list-card">
                    <div className="student-dashboard-list-card__icon">
                      <BookOpen className="h-4 w-4 text-[var(--student-accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[var(--student-text-strong)]">{lesson.title}</p>
                      <p className="text-xs text-[var(--student-text-muted)]">
                        Lesson {index + 1} in your recent activity
                      </p>
                    </div>
                    <Link href={`/dashboard/student/lessons/${lesson.id}`}>
                      <Button variant="outline" size="sm" className="student-button-outline rounded-xl px-3 font-black">
                        Open
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="student-dashboard-empty student-dashboard-empty--compact">
                <BookOpenCheck className="h-7 w-7 text-emerald-600" />
                <div className="space-y-1">
                  <p className="text-sm font-black text-[var(--student-text-strong)]">No recent lessons yet.</p>
                  <p className="text-sm text-[var(--student-text-muted)]">
                    As soon as your teacher publishes lessons, they&apos;ll appear here for quick return visits.
                  </p>
                </div>
              </div>
            )}
          </StudentSectionCard>

          <StudentSectionCard
            title="Pending Tasks"
            description="A calmer to-do space with clear due dates and a simple next step."
          >
            {pendingAssessments.length > 0 ? (
              <div className="space-y-3">
                {pendingAssessments.map((assessment) => (
                  <motion.div key={assessment.id} whileHover={{ y: -3 }} className="student-dashboard-task-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <StudentStatusChip tone={assessment.type === 'exam' ? 'danger' : 'warning'}>
                          {assessment.type.replace('_', ' ').toUpperCase()}
                        </StudentStatusChip>
                        <p className="text-base font-black leading-tight text-[var(--student-text-strong)]">
                          {assessment.title}
                        </p>
                      </div>
                      <div className="student-dashboard-task-date">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>{formatShortDate(assessment.dueDate)}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[var(--student-text-muted)]">
                      {assessment.description?.trim()
                        ? assessment.description
                        : "You have a task waiting here. Open it when you're ready and work through it one step at a time."}
                    </p>
                    <Link href={getAssessmentHref(assessment)}>
                      <Button className="student-button-solid mt-4 h-10 w-full rounded-2xl font-black">
                        Start Task
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="student-dashboard-empty student-dashboard-empty--compact">
                <ClipboardCheck className="h-7 w-7 text-emerald-600" />
                <div className="space-y-1">
                  <p className="text-sm font-black text-[var(--student-text-strong)]">You&apos;re all caught up right now.</p>
                  <p className="text-sm text-[var(--student-text-muted)]">
                    When a new assessment is published, this area will show the due date and fastest way to begin.
                  </p>
                </div>
              </div>
            )}
          </StudentSectionCard>
        </div>
      </div>
    </StudentPageShell>
  );
}

