'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ChevronRight, Clock3, FileText, FolderOpen, Megaphone, Sparkles, Target } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { fileService } from '@/services/file-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { UploadedFile } from '@/types/file';

const LESSONS_PAGE_SIZE = 6;
const ASSESSMENTS_PAGE_SIZE = 6;
const MODULES_PAGE_SIZE = 8;

type AssessmentBucket = 'all' | 'upcoming' | 'past_due' | 'completed';
type TabKey = 'lessons' | 'assessments' | 'announcements' | 'modules';

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
  const [modules, setModules] = useState<UploadedFile[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesTotalPages, setModulesTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('lessons');
  const [lessonFilter, setLessonFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [lessonSort, setLessonSort] = useState<'asc' | 'desc'>('asc');
  const [lessonPage, setLessonPage] = useState(1);
  const [assessmentBucket, setAssessmentBucket] = useState<AssessmentBucket>('all');
  const [assessmentPage, setAssessmentPage] = useState(1);
  const [moduleSearch, setModuleSearch] = useState('');
  const [modulePage, setModulePage] = useState(1);

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

  const fetchModules = useCallback(async () => {
    try {
      setModulesLoading(true);
      const response = await fileService.getAll({
        classId,
        search: moduleSearch || undefined,
        page: modulePage,
        limit: MODULES_PAGE_SIZE,
      });
      setModules(response.data || []);
      setModulesTotalPages(response.totalPages || 1);
    } catch {
      setModules([]);
      setModulesTotalPages(1);
    } finally {
      setModulesLoading(false);
    }
  }, [classId, modulePage, moduleSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'modules') {
      void fetchModules();
    }
  }, [activeTab, fetchModules]);

  useEffect(() => {
    setLessonPage(1);
  }, [lessonFilter, lessonSort]);

  useEffect(() => {
    setAssessmentPage(1);
  }, [assessmentBucket]);

  useEffect(() => {
    setModulePage(1);
  }, [moduleSearch]);

  const filteredLessons = useMemo(() => {
    const filtered = lessons.filter((lesson) => {
      if (lessonFilter === 'completed') return completions[lesson.id];
      if (lessonFilter === 'pending') return !completions[lesson.id];
      return true;
    });

    return [...filtered].sort((a, b) => (
      lessonSort === 'asc' ? a.order - b.order : b.order - a.order
    ));
  }, [completions, lessonFilter, lessonSort, lessons]);

  const lessonPageItems = filteredLessons.slice(
    (lessonPage - 1) * LESSONS_PAGE_SIZE,
    lessonPage * LESSONS_PAGE_SIZE,
  );
  const lessonTotalPages = Math.max(Math.ceil(filteredLessons.length / LESSONS_PAGE_SIZE), 1);

  const assessmentCards = useMemo(() => {
    return assessments.map((assessment) => {
      const myAttempts = attempts[assessment.id] || [];
      const latestAttempt = myAttempts[0] || null;
      const hasCompletedAttempt = myAttempts.some((attempt) => attempt.isSubmitted);
      const isPastDue = Boolean(assessment.dueDate && new Date(assessment.dueDate) < new Date());
      const bucket: AssessmentBucket = hasCompletedAttempt
        ? 'completed'
        : isPastDue
          ? 'past_due'
          : 'upcoming';

      return {
        assessment,
        latestAttempt,
        bucket,
      };
    }).filter((entry) => assessmentBucket === 'all' || entry.bucket === assessmentBucket);
  }, [assessmentBucket, assessments, attempts]);

  const assessmentPageItems = assessmentCards.slice(
    (assessmentPage - 1) * ASSESSMENTS_PAGE_SIZE,
    assessmentPage * ASSESSMENTS_PAGE_SIZE,
  );
  const assessmentTotalPages = Math.max(
    Math.ceil(assessmentCards.length / ASSESSMENTS_PAGE_SIZE),
    1,
  );
  const completedLessonCount = Object.values(completions).filter(Boolean).length;
  const lessonCompletionRate = lessons.length ? Math.round((completedLessonCount / lessons.length) * 100) : 0;
  const pendingLessonCount = Math.max(lessons.length - completedLessonCount, 0);
  const upcomingAssessmentCount = assessmentCards.filter((entry) => entry.bucket === 'upcoming').length;
 

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
    return <p className="text-muted-foreground">Class not found.</p>;
  }

  return (
    <div className="student-page space-y-6 rounded-3xl p-1">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="w-fit text-red-700 hover:bg-red-50">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <StudentActionCard className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,var(--student-accent)_0%,color-mix(in_srgb,var(--student-accent)_68%,white)_100%)] text-[var(--student-accent-contrast)] shadow-[var(--student-shadow-hover)]">
        <div className="absolute right-[-2rem] top-[-1rem] h-28 w-28 rounded-full bg-white/18 blur-2xl" />
        <div className="absolute bottom-[-2rem] left-[-1rem] h-24 w-24 rounded-full bg-white/14 blur-2xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--student-text-strong)]">
                <Sparkles className="h-3.5 w-3.5" />
                Subject Space
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--student-text-strong)]">{classItem.subjectName || classItem.className || 'Class'}</h1>
                <p className="max-w-2xl text-sm font-medium text-[color:color-mix(in_srgb,var(--student-text-muted)_92%,var(--student-text-strong)_8%)]">
                  {`${classItem.section?.name || 'Section'} • Grade ${classItem.section?.gradeLevel || classItem.subjectGradeLevel || 'TBA'}`}
                </p>
                <p className="max-w-2xl text-sm text-[color:color-mix(in_srgb,var(--student-text-muted)_94%,var(--student-text-strong)_6%)]">
                  Keep moving through lessons, check what is still pending, and jump back into the next part of this class without digging through a plain list.
                </p>
              </div>
            </div>
            <div className="grid min-w-[220px] grid-cols-3 gap-2 text-right text-xs font-semibold text-[var(--student-text-strong)]">
              <div className="rounded-2xl border border-black/10 bg-white/35 px-3 py-3">
                <p className="text-lg font-extrabold">{lessons.length}</p>
                <p className="text-[color:color-mix(in_srgb,var(--student-text-muted)_94%,var(--student-text-strong)_6%)]">Lessons</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/35 px-3 py-3">
                <p className="text-lg font-extrabold">{completedLessonCount}</p>
                <p className="text-[color:color-mix(in_srgb,var(--student-text-muted)_94%,var(--student-text-strong)_6%)]">Done</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/35 px-3 py-3">
                <p className="text-lg font-extrabold">{assessments.length}</p>
                <p className="text-[color:color-mix(in_srgb,var(--student-text-muted)_94%,var(--student-text-strong)_6%)]">Assessments</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-black/10 bg-white/35 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--student-text-muted)_92%,var(--student-text-strong)_8%)]">Progress</p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--student-text-strong)]">{lessonCompletionRate}%</p>
              <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--student-text-muted)_94%,var(--student-text-strong)_6%)]">Lesson completion so far</p>
            </div>
            <div className="rounded-[1.4rem] border border-black/10 bg-white/35 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--student-text-muted)_92%,var(--student-text-strong)_8%)]">Still Pending</p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--student-text-strong)]">{pendingLessonCount}</p>
              <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--student-text-muted)_94%,var(--student-text-strong)_6%)]">Lessons waiting for your next visit</p>
            </div>
            <div className="rounded-[1.4rem] border border-black/10 bg-white/35 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--student-text-muted)_92%,var(--student-text-strong)_8%)]">Upcoming Tasks</p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--student-text-strong)]">{upcomingAssessmentCount}</p>
              <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--student-text-muted)_94%,var(--student-text-strong)_6%)]">Assessments likely needing attention next</p>
            </div>
          </div>
        </div>
      </StudentActionCard>

      <StudentActionCard className="student-panel-hover border border-[var(--student-outline)] bg-[var(--student-glass)]">
        <div className="flex flex-wrap gap-2">
          {([
            ['lessons', 'Lessons'],
            ['assessments', 'Assessments'],
            ['announcements', 'Announcements'],
            ['modules', 'Modules'],
          ] as Array<[TabKey, string]>).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={activeTab === value ? 'default' : 'outline'}
              className={activeTab === value ? 'student-button-solid rounded-xl' : 'student-button-outline rounded-xl'}
              onClick={() => setActiveTab(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </StudentActionCard>

      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <StudentSectionHeader
            title="Lessons"
            subtitle={`${filteredLessons.length} lesson${filteredLessons.length === 1 ? '' : 's'} in view. Pick up where you left off or jump ahead when you feel ready.`}
            action={(
              <div className="flex flex-wrap gap-2">
                {(['all', 'completed', 'pending'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={lessonFilter === value ? 'default' : 'outline'}
                    className={lessonFilter === value ? 'student-button-solid' : 'student-button-outline'}
                    onClick={() => setLessonFilter(value)}
                  >
                    {value === 'all' ? 'All' : value === 'completed' ? 'Completed' : 'Pending'}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="outline" className="student-button-outline" onClick={() => setLessonSort((current) => current === 'asc' ? 'desc' : 'asc')}>
                  Order: {lessonSort === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>
            )}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <StudentActionCard className="student-panel-hover border border-[var(--student-outline)] bg-[var(--student-glass)]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--student-accent-soft)] p-3 text-[var(--student-accent)]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] student-muted-text">In View</p>
                  <p className="mt-2 text-2xl font-extrabold text-[var(--student-text-strong)]">{filteredLessons.length}</p>
                  <p className="mt-1 text-sm student-muted-text">Lessons matching your current filter</p>
                </div>
              </div>
            </StudentActionCard>
            <StudentActionCard className="student-panel-hover border border-[var(--student-outline)] bg-[var(--student-glass)]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--student-success-bg)] p-3 text-[var(--student-success-text)]">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] student-muted-text">Completed</p>
                  <p className="mt-2 text-2xl font-extrabold text-[var(--student-text-strong)]">{completedLessonCount}</p>
                  <p className="mt-1 text-sm student-muted-text">Lessons you have already finished</p>
                </div>
              </div>
            </StudentActionCard>
            <StudentActionCard className="student-panel-hover border border-[var(--student-outline)] bg-[var(--student-glass)]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--student-accent-soft)] p-3 text-[var(--student-accent)]">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] student-muted-text">Current Page</p>
                  <p className="mt-2 text-2xl font-extrabold text-[var(--student-text-strong)]">{lessonPage}</p>
                  <p className="mt-1 text-sm student-muted-text">Page {lessonPage} of {lessonTotalPages}</p>
                </div>
              </div>
            </StudentActionCard>
          </div>

          {lessonPageItems.length === 0 ? (
            <StudentEmptyState
              title="No lessons in this view"
              description="Try a different lesson filter or come back after your teacher publishes more content."
              icon={<BookOpen className="h-5 w-5" />}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {lessonPageItems.map((lesson, index) => (
                <StudentActionCard key={lesson.id} className="student-panel-hover relative overflow-hidden border border-[var(--student-outline)] bg-[linear-gradient(180deg,var(--student-surface)_0%,var(--student-elevated)_100%)]">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[var(--student-accent-soft)] blur-3xl opacity-70" />
                  <div className="relative space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-[var(--student-accent-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-accent)]">
                            Lesson {((lessonPage - 1) * LESSONS_PAGE_SIZE) + index + 1}
                          </span>
                          <StudentStatusChip tone={completions[lesson.id] ? 'success' : 'warning'}>
                            {completions[lesson.id] ? 'Completed' : 'Pending'}
                          </StudentStatusChip>
                        </div>
                        <p className="text-lg font-bold tracking-tight text-[var(--student-text-strong)]">{lesson.title}</p>
                        <p className="line-clamp-3 text-sm leading-6 student-muted-text">{getDescription(lesson.description)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-1 student-muted-text">
                        Order #{lesson.order}
                      </span>
                      <span className="rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-1 student-muted-text">
                        {completions[lesson.id] ? 'Ready for review' : 'Ready to continue'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm student-muted-text">
                        {completions[lesson.id]
                          ? 'You can revisit this lesson anytime.'
                          : 'Open this lesson to keep your streak going.'}
                      </p>
                      <Link
                        href={`/dashboard/student/lessons/${lesson.id}?classId=${classId}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--student-text-strong)] px-4 py-2 text-sm font-black text-[var(--student-accent-contrast)] shadow-[var(--student-shadow)] transition hover:bg-[var(--student-accent)] hover:text-[var(--student-accent-contrast)]"
                      >
                        {completions[lesson.id] ? 'Review Lesson' : 'Open Lesson'}
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </StudentActionCard>
              ))}
            </div>
          )}

          <Pagination page={lessonPage} totalPages={lessonTotalPages} onPageChange={setLessonPage} align="start" />
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <StudentSectionHeader
            title="Assessments"
            subtitle={`${assessmentCards.length} assessment${assessmentCards.length === 1 ? '' : 's'} in this bucket`}
            action={(
              <div className="flex flex-wrap gap-2">
                {(['all', 'upcoming', 'past_due', 'completed'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={assessmentBucket === value ? 'default' : 'outline'}
                    className={assessmentBucket === value ? 'student-button-solid' : 'student-button-outline'}
                    onClick={() => setAssessmentBucket(value)}
                  >
                    {value === 'all'
                      ? 'All'
                      : value === 'upcoming'
                        ? 'Upcoming'
                        : value === 'past_due'
                          ? 'Past Due'
                          : 'Completed'}
                  </Button>
                ))}
              </div>
            )}
          />
          {assessmentPageItems.length === 0 ? (
            <StudentEmptyState
              title="No assessments in this view"
              description="Try another bucket or wait for your teacher to publish more work."
              icon={<FileText className="h-5 w-5" />}
            />
          ) : (
            <motion.div {...motionProps.container} className="space-y-3">
              {assessmentPageItems.map(({ assessment, latestAttempt, bucket }) => {
                const isCompleted = bucket === 'completed';
                const isPastDue = bucket === 'past_due';
                const statusTone = isCompleted
                  ? latestAttempt?.passed ? 'success' : 'danger'
                  : isPastDue
                    ? 'danger'
                    : 'warning';

                return (
                  <motion.div key={assessment.id} {...motionProps.item}>
                    <Link href={`/dashboard/student/assessments/${assessment.id}?classId=${classId}`}>
                      <StudentActionCard>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{assessment.title}</p>
                            <p className="line-clamp-1 text-sm student-muted-text">{getDescription(assessment.description)}</p>
                          </div>
                          <StudentStatusChip tone={statusTone}>
                            {isCompleted
                              ? latestAttempt?.passed
                                ? `Passed • ${latestAttempt.score}/${latestAttempt.totalPoints}`
                                : `Needs Improvement • ${latestAttempt?.score ?? 0}/${latestAttempt?.totalPoints ?? assessment.totalPoints}`
                              : isPastDue
                                ? 'Past Due'
                                : 'Upcoming'}
                          </StudentStatusChip>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <span className="rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-1 student-muted-text">
                            {assessment.type.replace(/_/g, ' ')}
                          </span>
                          <span className="rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-1 student-muted-text">
                            {assessment.totalPoints} points
                          </span>
                          <span className="rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-1 student-muted-text">
                            Due {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'anytime'}
                          </span>
                        </div>
                      </StudentActionCard>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
          <Pagination
            page={assessmentPage}
            totalPages={assessmentTotalPages}
            onPageChange={setAssessmentPage}
            align="start"
          />
        </div>
      )}
 
      {activeTab === 'announcements' && (
        <div className="mt-4 space-y-3">
          <StudentSectionHeader title="Announcements" subtitle={`${announcements.length} update(s)`} />
          {announcements.length === 0 ? (
            <StudentEmptyState title="No announcements" description="Class updates from your teacher will appear here." icon={<Megaphone className="h-5 w-5" />} />
          ) : (
            <motion.div {...motionProps.container} className="space-y-3">
              {announcements.map((ann) => (
                <motion.div key={ann.id} {...motionProps.item}>
                  <StudentActionCard>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{ann.title}</p>
                      {ann.isPinned && <StudentStatusChip tone="warning">Pinned</StudentStatusChip>}
                    </div>
                    <p className="mt-2 text-sm student-muted-text">{ann.content}</p>
                    <p className="mt-2 text-xs student-muted-text">
                      {ann.author?.firstName} {ann.author?.lastName} • {new Date(ann.createdAt!).toLocaleDateString()}
                    </p>
                  </StudentActionCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="space-y-4">
          <StudentSectionHeader
            title="Modules"
            subtitle="Class-scoped uploaded files from your teacher"
            action={(
              <div className="w-full max-w-sm">
                <Input
                  value={moduleSearch}
                  onChange={(event) => setModuleSearch(event.target.value)}
                  placeholder="Search modules"
                />
              </div>
            )}
          />

          {modulesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="h-24 rounded-3xl" />
            </div>
          ) : modules.length === 0 ? (
            <StudentEmptyState
              title="No modules found"
              description="Your teacher has not uploaded class files for this module view yet."
              icon={<FolderOpen className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-3">
              {modules.map((moduleFile) => (
                <StudentActionCard key={moduleFile.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--student-text-strong)]">{moduleFile.originalName}</p>
                      <p className="text-xs student-muted-text">
                        {(moduleFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB â€¢ {moduleFile.mimeType}
                      </p>
                    </div>
                    <Button type="button" className="student-button-outline" onClick={async () => {
                      const blob = await fileService.download(moduleFile.id);
                      const objectUrl = window.URL.createObjectURL(blob);
                      window.open(objectUrl, '_blank', 'noopener,noreferrer');
                      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
                    }}>
                      Open File
                    </Button>
                  </div>
                </StudentActionCard>
              ))}
            </div>
          )}

          <Pagination page={modulePage} totalPages={modulesTotalPages} onPageChange={setModulePage} />
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  align = 'end',
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  align?: 'start' | 'end';
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={align === 'start' ? 'flex items-center justify-start gap-2' : 'flex items-center justify-end gap-2'}>
      <Button type="button" size="sm" variant="outline" className="student-button-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm student-muted-text">
        Page {page} of {totalPages}
      </span>
      <Button type="button" size="sm" variant="outline" className="student-button-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
 
    </div>
  );
}

