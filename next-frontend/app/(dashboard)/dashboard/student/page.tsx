'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { GraduationCap, BookOpen, ClipboardCheck, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  StudentStatCard,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import { getTeacherName } from '@/utils/helpers';

const fContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
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

export default function StudentDashboardPage() {
  const { user } = useAuth();
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
      // Keep the page usable if one of the dashboard feeds fails.
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const profileIncomplete = !user?.firstName || !user?.lastName;
  const publishedAssessments = assessments.filter((a) => a.isPublished);
  const completionRate = lessons.length > 0
    ? Math.min(100, Math.round((classes.length / Math.max(1, lessons.length)) * 100))
    : 0;

  return (
    <motion.div
      className="mx-auto max-w-7xl space-y-8 p-6 md:p-10"
      initial="hidden"
      animate="visible"
      variants={fContainer}
    >
      <motion.section
        variants={fItem}
        className="student-panel relative overflow-hidden rounded-[1.75rem] p-6"
      >
        <div className="absolute right-0 top-0 h-full w-32 -skew-x-12 translate-x-8 bg-[var(--student-hero-stripe)]" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="student-kicker inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="h-3 w-3" /> Learning Hub
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--student-text-strong)]">
              Welcome back, <span className="student-accent-text">{user?.firstName || 'Student'}</span>.
            </h1>
            <p className="text-sm font-medium text-[var(--student-text-muted)]">
              You have <span className="border-b-2 border-[var(--student-accent)] font-bold text-[var(--student-text-strong)]">{publishedAssessments.length} pending tasks</span> to finalize.
            </p>
          </div>

          <div className="student-soft-panel flex min-w-[220px] items-center gap-4 rounded-2xl px-5 py-3 shadow-sm">
            <div className="flex-1 text-center">
              <p className="text-[9px] font-black uppercase tracking-tighter text-[var(--student-text-muted)]">Profile</p>
              <p className="text-xl font-black text-[var(--student-text-strong)]">{profileIncomplete ? '70%' : '100%'}</p>
            </div>
            <div className="student-divider h-8 w-px" />
            <div className="flex-1 text-center">
              <p className="text-[9px] font-black uppercase tracking-tighter text-[var(--student-text-muted)]">Progress</p>
              <p className="text-xl font-black text-[var(--student-accent)]">{completionRate}%</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.div variants={fContainer} className="grid gap-6 md:grid-cols-3">
        {[
          { label: 'My Classes', val: classes.length, icon: <GraduationCap />, color: 'bg-[var(--student-text-strong)]' },
          { label: 'Lessons', val: lessons.length, icon: <BookOpen />, color: 'bg-[var(--student-accent)]' },
          { label: 'Assessments', val: publishedAssessments.length, icon: <ClipboardCheck />, color: 'bg-[var(--student-text-strong)]' },
        ].map((stat, i) => (
          <motion.div key={i} variants={fItem} whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
            <StudentStatCard
              label={stat.label}
              value={stat.val}
              accent={stat.color}
              icon={stat.icon}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.section variants={fItem} className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--student-outline)] pb-3">
          <h2 className="text-xl font-black tracking-tight text-[var(--student-text-strong)]">Your Enrolled Classes</h2>
          <Button variant="ghost" className="text-xs font-bold text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]">See All</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <motion.div key={cls.id} variants={fItem} whileHover={{ scale: 1.02 }}>
              <div className="student-panel student-panel-hover group rounded-[1.5rem] p-6">
                <div className="space-y-4">
                  <Badge variant="outline" className="student-badge font-black text-[10px]">COURSE</Badge>
                  <h3 className="text-lg font-black leading-tight text-[var(--student-text-strong)]">
                    {cls.subjectName || cls.className || cls.name}
                  </h3>
                  <p className="text-xs font-bold text-[var(--student-text-muted)]">
                    Teacher: {getTeacherName(cls.teacher)}
                  </p>

                  <div className="h-px w-full bg-[var(--student-outline)] transition-colors group-hover:bg-[var(--student-accent-soft-strong)]" />

                  <Link href={`/dashboard/student/classes/${cls.id}`} className="block">
                    <Button variant="outline" className="student-button-outline flex h-9 w-full justify-between text-xs font-bold">
                      Enter Class <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <div className="grid gap-8 lg:grid-cols-2">
        <motion.section variants={fItem} className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-[var(--student-text-strong)]">
            <BookOpen className="h-4 w-4 text-[var(--student-accent)]" /> Recent Lessons
          </h2>
          <div className="space-y-3">
            {lessons.slice(0, 3).map((lesson) => (
              <motion.div key={lesson.id} whileHover={{ x: 5 }}>
                <div className="student-panel student-panel-hover group flex items-center justify-between rounded-xl p-4">
                  <p className="truncate text-sm font-bold text-[var(--student-text-strong)]">{lesson.title}</p>
                  <Link href={`/dashboard/student/lessons/${lesson.id}`}>
                    <ArrowRight className="h-4 w-4 cursor-pointer text-[var(--student-text-muted)] transition-colors group-hover:text-[var(--student-accent)]" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={fItem} className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-[var(--student-text-strong)]">
            <ClipboardCheck className="h-4 w-4 text-[var(--student-accent)]" /> Pending Tasks
          </h2>
          <div className="space-y-3">
            {publishedAssessments.slice(0, 3).map((assessment) => (
              <motion.div key={assessment.id} whileHover={{ scale: 1.01 }}>
                <div className="student-panel student-panel-hover rounded-2xl p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <StudentStatusChip tone={assessment.type === 'exam' ? 'danger' : 'warning'}>
                      {assessment.type.toUpperCase()}
                    </StudentStatusChip>
                    <span className="flex items-center gap-1 text-[9px] font-black text-[var(--student-text-muted)]">
                      <Clock className="h-3 w-3" /> {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'NO DATE'}
                    </span>
                  </div>
                  <p className="mb-4 truncate text-base font-black text-[var(--student-text-strong)]">{assessment.title}</p>
                  <Link href={assessment.type === 'file_upload' ? `/dashboard/student/assessments/${assessment.id}/take` : `/dashboard/student/assessments/${assessment.id}`}>
                    <Button className="student-button-solid h-9 w-full rounded-xl text-xs font-black">
                      START
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
