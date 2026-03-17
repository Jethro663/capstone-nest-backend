'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, BookOpen, Megaphone } from 'lucide-react';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentActionCard,
  StudentEmptyState,
  StudentSectionHeader,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import { getDescription } from '@/utils/helpers';
import type { ClassItem } from '@/types/class';
import type { Lesson, LessonCompletion } from '@/types/lesson';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';

export default function StudentClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AssessmentAttempt[]>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, lessonsRes, completedRes, assessmentsRes, announcementsRes] = await Promise.all([
        classService.getById(classId),
        lessonService.getByClass(classId),
        lessonService.getCompletedByClass(classId).catch(() => ({ data: [] as LessonCompletion[] })),
        assessmentService.getByClass(classId),
        announcementService.getByClass(classId).catch(() => ({ data: [] as Announcement[] })),
      ]);

      setClassItem(classRes.data);
      setLessons(lessonsRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);

      const completionMap: Record<string, boolean> = {};
      (completedRes.data || []).forEach((c) => {
        completionMap[c.lessonId] = c.completed;
      });
      setCompletions(completionMap);

      const published = (assessmentsRes.data || []).filter((a) => a.isPublished);
      const attemptResults = await Promise.all(
        published.map((a) =>
          assessmentService.getStudentAttempts(a.id).catch(() => ({ data: [] as AssessmentAttempt[] })),
        ),
      );
      const attemptsMap: Record<string, AssessmentAttempt[]> = {};
      published.forEach((a, i) => {
        attemptsMap[a.id] = attemptResults[i].data || [];
      });
      setAttempts(attemptsMap);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!classItem) {
    return <p className="text-[var(--student-text-muted)]">Class not found.</p>;
  }

  return (
    <div className="student-page space-y-6 rounded-3xl p-1">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="w-fit text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <StudentActionCard className="border-0 bg-[var(--student-accent)] text-[var(--student-accent-contrast)]">
        <StudentSectionHeader
title={classItem.subjectName || classItem.className || "Class"}          subtitle={`${classItem.section?.name} \u2022 Grade ${classItem.section?.gradeLevel}`}
          className="[&_h2]:text-[var(--student-accent-contrast)] [&_p]:text-[var(--student-accent-contrast)]/70"
        />
      </StudentActionCard>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="mt-4 space-y-3">
          <StudentSectionHeader title="Lessons" subtitle={`${lessons.length} lesson(s)`} />
          {lessons.length === 0 ? (
            <StudentEmptyState title="No lessons yet" description="Your teacher hasn't posted lessons yet." icon={<BookOpen className="h-5 w-5" />} />
          ) : (
            <motion.div {...motionProps.container} className="space-y-3">
              {lessons
                .filter((l) => !l.isDraft)
                .sort((a, b) => a.order - b.order)
                .map((lesson) => (
                  <motion.div key={lesson.id} {...motionProps.item}>
                    <Link href={`/dashboard/student/lessons/${lesson.id}?classId=${classId}`}>
                      <StudentActionCard>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[var(--student-text-strong)]">{lesson.title}</p>
                            <p className="line-clamp-1 text-sm student-muted-text">{getDescription(lesson.description)}</p>
                          </div>
                          {completions[lesson.id] && <StudentStatusChip tone="success">Completed</StudentStatusChip>}
                        </div>
                      </StudentActionCard>
                    </Link>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="assessments" className="mt-4 space-y-3">
          <StudentSectionHeader title="Assessments" subtitle={`${assessments.filter((a) => a.isPublished).length} published`} />
          {assessments.filter((a) => a.isPublished).length === 0 ? (
            <StudentEmptyState title="No assessments" description="Published assessments will appear here." icon={<BookOpen className="h-5 w-5" />} />
          ) : (
            <motion.div {...motionProps.container} className="space-y-3">
              {assessments
                .filter((a) => a.isPublished)
                .map((assessment) => {
                  const myAttempts = attempts[assessment.id] || [];
                  const bestAttempt = myAttempts.length > 0
                    ? myAttempts.reduce((best, a) => ((a.score ?? 0) > (best.score ?? 0) ? a : best), myAttempts[0])
                    : null;
                  return (
                    <motion.div key={assessment.id} {...motionProps.item}>
                      <Link href={assessment.type === 'file_upload' ? `/dashboard/student/assessments/${assessment.id}/take?classId=${classId}` : `/dashboard/student/assessments/${assessment.id}?classId=${classId}`}>
                        <StudentActionCard>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--student-text-strong)]">{assessment.title}</p>
                              <p className="line-clamp-1 text-sm student-muted-text">{getDescription(assessment.description)}</p>
                            </div>
                            {bestAttempt ? (
                              <StudentStatusChip tone={bestAttempt.passed ? 'success' : 'danger'}>
                                {bestAttempt.passed ? 'Passed' : 'Needs Improvement'} \u2022 {bestAttempt.score}/{bestAttempt.totalPoints}
                              </StudentStatusChip>
                            ) : (
                              <StudentStatusChip tone="warning">Not Started</StudentStatusChip>
                            )}
                          </div>
                        </StudentActionCard>
                      </Link>
                    </motion.div>
                  );
                })}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="mt-4 space-y-3">
          <StudentSectionHeader title="Announcements" subtitle={`${announcements.length} update(s)`} />
          {announcements.length === 0 ? (
            <StudentEmptyState title="No announcements" description="Class updates from your teacher will appear here." icon={<Megaphone className="h-5 w-5" />} />
          ) : (
            <motion.div {...motionProps.container} className="space-y-3">
              {announcements.map((ann) => (
                <motion.div key={ann.id} {...motionProps.item}>
                  <StudentActionCard>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--student-text-strong)]">{ann.title}</p>
                      {ann.isPinned && <StudentStatusChip tone="warning">Pinned</StudentStatusChip>}
                    </div>
                    <p className="mt-2 text-sm student-muted-text">{ann.content}</p>
                    <p className="mt-2 text-xs student-muted-text">
                      {ann.author?.firstName} {ann.author?.lastName} \u2022 {new Date(ann.createdAt!).toLocaleDateString()}
                    </p>
                  </StudentActionCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
