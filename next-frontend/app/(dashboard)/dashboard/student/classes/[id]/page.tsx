'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, FileText, FolderOpen, Megaphone } from 'lucide-react';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { fileService } from '@/services/file-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentActionCard,
  StudentEmptyState,
  StudentSectionHeader,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { getDescription } from '@/utils/helpers';
import type { ClassItem } from '@/types/class';
import type { Lesson, LessonCompletion } from '@/types/lesson';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';
import type { UploadedFile } from '@/types/file';

type TabKey = 'lessons' | 'assessments' | 'announcements' | 'modules';
type LessonViewFilter = 'all' | 'completed' | 'pending';
type AssessmentBucket = 'all' | 'upcoming' | 'past_due' | 'completed';

const LESSONS_PAGE_SIZE = 6;
const ASSESSMENTS_PAGE_SIZE = 6;
const MODULES_PAGE_SIZE = 8;

export default function StudentClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabKey>('lessons');
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AssessmentAttempt[]>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [modules, setModules] = useState<UploadedFile[]>([]);
  const [modulesTotalPages, setModulesTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [lessonFilter, setLessonFilter] = useState<LessonViewFilter>('all');
  const [lessonSort, setLessonSort] = useState<'asc' | 'desc'>('asc');
  const [lessonPage, setLessonPage] = useState(1);
  const [assessmentBucket, setAssessmentBucket] = useState<AssessmentBucket>('all');
  const [assessmentPage, setAssessmentPage] = useState(1);
  const [moduleSearch, setModuleSearch] = useState('');
  const [modulePage, setModulePage] = useState(1);

  const fetchBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, lessonsRes, completedRes, assessmentsRes, announcementsRes] = await Promise.all([
        classService.getById(classId),
        lessonService.getByClass(classId),
        lessonService.getCompletedByClass(classId).catch(() => ({ data: [] as LessonCompletion[] })),
        assessmentService.getByClass(classId, { page: 1, limit: 100 }),
        announcementService.getByClass(classId).catch(() => ({ data: [] as Announcement[] })),
      ]);

      setClassItem(classRes.data);
      setLessons((lessonsRes.data || []).filter((lesson) => !lesson.isDraft));
      setAssessments((assessmentsRes.data || []).filter((assessment) => assessment.isPublished));
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);

      const completionMap: Record<string, boolean> = {};
      (completedRes.data || []).forEach((entry) => {
        completionMap[entry.lessonId] = entry.completed;
      });
      setCompletions(completionMap);

      const published = (assessmentsRes.data || []).filter((assessment) => assessment.isPublished);
      const attemptResults = await Promise.all(
        published.map((assessment) =>
          assessmentService.getStudentAttempts(assessment.id).catch(() => ({ data: [] as AssessmentAttempt[] })),
        ),
      );
      const attemptsMap: Record<string, AssessmentAttempt[]> = {};
      published.forEach((assessment, index) => {
        attemptsMap[assessment.id] = attemptResults[index].data || [];
      });
      setAttempts(attemptsMap);
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
      setModulesTotalPages(response.totalPages ?? 1);
    } finally {
      setModulesLoading(false);
    }
  }, [classId, modulePage, moduleSearch]);

  useEffect(() => {
    void fetchBaseData();
  }, [fetchBaseData]);

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
          title={classItem.subjectName || classItem.className || 'Class'}
          subtitle={`${classItem.section?.name || 'Section'} • Grade ${classItem.section?.gradeLevel || classItem.subjectGradeLevel || 'TBA'}`}
          className="[&_h2]:text-[var(--student-accent-contrast)] [&_p]:text-[var(--student-accent-contrast)]/75"
          action={(
            <div className="grid grid-cols-3 gap-2 text-right text-xs font-semibold">
              <div>
                <p>{lessons.length}</p>
                <p className="opacity-70">Lessons</p>
              </div>
              <div>
                <p>{Object.values(completions).filter(Boolean).length}</p>
                <p className="opacity-70">Done</p>
              </div>
              <div>
                <p>{assessments.length}</p>
                <p className="opacity-70">Assessments</p>
              </div>
            </div>
          )}
        />
      </StudentActionCard>

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
            className={activeTab === value ? 'student-button-solid' : 'student-button-outline'}
            onClick={() => setActiveTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <StudentSectionHeader
            title="Lessons"
            subtitle={`${filteredLessons.length} lesson${filteredLessons.length === 1 ? '' : 's'} in view`}
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

          {lessonPageItems.length === 0 ? (
            <StudentEmptyState
              title="No lessons in this view"
              description="Try a different lesson filter or come back after your teacher publishes more content."
              icon={<BookOpen className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-3">
              {lessonPageItems.map((lesson, index) => (
                <Link key={lesson.id} href={`/dashboard/student/lessons/${lesson.id}?classId=${classId}`}>
                  <StudentActionCard>
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--student-accent)]">
                          Lesson {((lessonPage - 1) * LESSONS_PAGE_SIZE) + index + 1}
                        </p>
                        <p className="font-semibold text-[var(--student-text-strong)]">{lesson.title}</p>
                        <p className="line-clamp-2 text-sm student-muted-text">{getDescription(lesson.description)}</p>
                      </div>
                      <StudentStatusChip tone={completions[lesson.id] ? 'success' : 'warning'}>
                        {completions[lesson.id] ? 'Completed' : 'Pending'}
                      </StudentStatusChip>
                    </div>
                  </StudentActionCard>
                </Link>
              ))}
            </div>
          )}

          <Pagination page={lessonPage} totalPages={lessonTotalPages} onPageChange={setLessonPage} />
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
              title="No assessments here"
              description="Published assessments will appear in the matching bucket once they are available."
              icon={<FileText className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-3">
              {assessmentPageItems.map(({ assessment, latestAttempt, bucket }) => (
                <Link
                  key={assessment.id}
                  href={assessment.type === 'file_upload'
                    ? `/dashboard/student/assessments/${assessment.id}/take?classId=${classId}`
                    : `/dashboard/student/assessments/${assessment.id}?classId=${classId}`}
                >
                  <StudentActionCard>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-[var(--student-text-strong)]">{assessment.title}</p>
                        <p className="line-clamp-2 text-sm student-muted-text">{getDescription(assessment.description)}</p>
                        <p className="text-xs student-muted-text">
                          {assessment.dueDate
                            ? `Due ${new Date(assessment.dueDate).toLocaleString()}`
                            : 'No due date set'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StudentStatusChip tone={bucket === 'completed' ? 'success' : bucket === 'past_due' ? 'danger' : 'warning'}>
                          {bucket === 'completed' ? 'Completed' : bucket === 'past_due' ? 'Past Due' : 'Upcoming'}
                        </StudentStatusChip>
                        {latestAttempt?.score !== undefined && latestAttempt?.score !== null ? (
                          <StudentStatusChip tone={latestAttempt.passed ? 'success' : 'danger'}>
                            {latestAttempt.score}%
                          </StudentStatusChip>
                        ) : null}
                      </div>
                    </div>
                  </StudentActionCard>
                </Link>
              ))}
            </div>
          )}

          <Pagination page={assessmentPage} totalPages={assessmentTotalPages} onPageChange={setAssessmentPage} />
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <StudentSectionHeader title="Announcements" subtitle={`${announcements.length} update${announcements.length === 1 ? '' : 's'}`} />
          {announcements.length === 0 ? (
            <StudentEmptyState
              title="No announcements yet"
              description="Class updates from your teacher will appear here."
              icon={<Megaphone className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <StudentActionCard key={announcement.id}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--student-text-strong)]">{announcement.title}</p>
                      {announcement.isPinned && <StudentStatusChip tone="warning">Pinned</StudentStatusChip>}
                    </div>
                    <p className="text-sm student-muted-text">{announcement.content}</p>
                    <p className="text-xs student-muted-text">
                      {announcement.author?.firstName} {announcement.author?.lastName} •{' '}
                      {announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </StudentActionCard>
              ))}
            </div>
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
                        {(moduleFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {moduleFile.mimeType}
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
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2">
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
