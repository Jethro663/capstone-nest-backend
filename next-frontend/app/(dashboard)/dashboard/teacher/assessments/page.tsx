'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Clock3, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { academicStateService } from '@/services/academic-state-service';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { AcademicPeriod, AcademicPeriodKey } from '@/types/academic-grading';

type AssessmentWithClass = Assessment & {
  classLabel: string;
};

type TeacherCollectionState = 'loading' | 'ready' | 'error' | 'partial';

function formatDate(value?: string) {
  if (!value) return 'No due date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatAssessmentType(type: string) {
  return type.replace(/_/g, ' ');
}

export default function TeacherAssessmentsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const hasSuccessfulCollectionRef = useRef(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentWithClass[]>([]);
  const [collectionState, setCollectionState] =
    useState<TeacherCollectionState>('loading');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | AcademicPeriodKey>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodLoadError, setPeriodLoadError] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(() => {
    if (!userId) return;

    const request = classService.getByTeacher(userId, 'active');
    if (!hasSuccessfulCollectionRef.current) {
      void Promise.resolve().then(() => setCollectionState('loading'));
    }

    void request
      .then(async (classesRes) => {
        const activeClasses = classesRes.data || [];
        setClasses(activeClasses);

        if (activeClasses.length === 0) {
          setAssessments([]);
          hasSuccessfulCollectionRef.current = true;
          setCollectionState('ready');
          return;
        }

        const assessmentResponses = await Promise.allSettled(
          activeClasses.map(async (course) => {
            const response = await assessmentService.getByClass(course.id, {
              page: 1,
              limit: 100,
              status: 'all',
            });

            const classLabel = `${course.subjectCode} - ${course.subjectName}`;
            return (response.data || []).map((assessment) => ({
              ...assessment,
              classLabel,
            }));
          }),
        );

        const fulfilledResponses = assessmentResponses.filter(
          (
            result,
          ): result is PromiseFulfilledResult<AssessmentWithClass[]> =>
            result.status === 'fulfilled',
        );
        const hasRejectedResponse = assessmentResponses.some(
          (result) => result.status === 'rejected',
        );

        if (fulfilledResponses.length === 0) {
          setCollectionState(
            hasSuccessfulCollectionRef.current ? 'partial' : 'error',
          );
          return;
        }

        const merged = fulfilledResponses
          .flatMap((result) => result.value)
          .sort((left, right) => {
            const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
            const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
            return rightTime - leftTime;
          });

        setAssessments(merged);
        hasSuccessfulCollectionRef.current = true;
        setCollectionState(hasRejectedResponse ? 'partial' : 'ready');
      })
      .catch(() => {
        setCollectionState(
          hasSuccessfulCollectionRef.current ? 'partial' : 'error',
        );
      });
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    void academicStateService
      .getCurrent()
      .then((response) => {
        if (!cancelled) {
          setPeriods(response.data.policy.periods);
          setPeriodLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeriods([]);
          setPeriodLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      const matchesClass = selectedClassId === 'all' || assessment.classId === selectedClassId;
      const matchesPeriod =
        selectedPeriod === 'all' || assessment.quarter === selectedPeriod;
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'published'
          ? assessment.isPublished
          : !assessment.isPublished);
      const needle = search.trim().toLowerCase();
      const matchesSearch =
        needle.length === 0 ||
        assessment.title.toLowerCase().includes(needle) ||
        assessment.classLabel.toLowerCase().includes(needle) ||
        formatAssessmentType(assessment.type).toLowerCase().includes(needle);

      return matchesClass && matchesPeriod && matchesStatus && matchesSearch;
    });
  }, [assessments, search, selectedClassId, selectedPeriod, selectedStatus]);

  if (collectionState === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
        <Skeleton className="h-[24rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      title="Assessments Across Your Active Classes"
      description="Review published and draft assessments from one teacher index, then jump into review or editing without relying on broken dashboard shortcuts."
      actions={(
        <>
          <Link href="/dashboard/teacher">
            <Button variant="outline" className="teacher-button-outline rounded-xl px-4 font-black">
              Back to Dashboard
            </Button>
          </Link>
          <Button className="teacher-button-solid rounded-xl px-4 font-black" onClick={fetchData}>
            Refresh Assessments
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Active Classes"
            value={classes.length}
            caption="Available for assessment browsing"
            icon={ClipboardCheck}
            accent="sky"
          />
          <TeacherStatCard
            label="Visible Assessments"
            value={filteredAssessments.length}
            caption={selectedClassId === 'all' ? 'Across all active classes' : 'In the selected class'}
            icon={Sparkles}
            accent="teal"
          />
          <TeacherStatCard
            label="Published"
            value={filteredAssessments.filter((assessment) => assessment.isPublished).length}
            caption="Accessible to students"
            icon={Clock3}
            accent="amber"
          />
          <TeacherStatCard
            label="Draft"
            value={filteredAssessments.filter((assessment) => !assessment.isPublished).length}
            caption="Still being prepared"
            icon={Search}
            accent="rose"
          />
        </>
      )}
    >
      <TeacherSectionCard
        title="Assessment Filters"
        description="Quarter, status, class, and search filters are combined. Unassigned assessments appear only under All Quarters."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(12rem,16rem)_minmax(10rem,14rem)_minmax(10rem,14rem)_1fr]">
          <select
            aria-label="Quarter filter"
            value={selectedPeriod}
            onChange={(event) =>
              setSelectedPeriod(event.target.value as 'all' | AcademicPeriodKey)
            }
            disabled={periods.length === 0}
            className="teacher-select text-sm font-semibold"
          >
            <option value="all">All Quarters</option>
            {periods.map((period) => (
              <option key={period.key} value={period.key}>
                {period.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Status filter"
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(
                event.target.value as 'all' | 'published' | 'draft',
              )
            }
            className="teacher-select text-sm font-semibold"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select
            aria-label="Class filter"
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select text-sm font-semibold"
          >
            <option value="all">All active classes</option>
            {classes.map((course) => (
              <option key={course.id} value={course.id}>
                {course.subjectCode} - {course.subjectName}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--teacher-text-muted)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assessments by title, class, or type"
              className="teacher-input pl-10"
            />
          </div>
        </div>
        {periodLoadError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Quarter policy could not be loaded. Refresh before filtering by
            quarter.
          </p>
        )}
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Assessment Index"
        description="Open an assessment for review or jump straight into editing."
      >
        {collectionState === 'error' ? (
          <DashboardStatePanel
            kind="error"
            title="Assessments couldn't be loaded"
            description="Try again to load your active classes and their assessments."
            primaryAction={{ label: 'Try again', onClick: () => void fetchData() }}
          />
        ) : (
          <>
        {collectionState === 'partial' ? (
          <DashboardStatePanel
            kind="unavailable"
            title="Some assessments are temporarily unavailable"
            description="Available class assessments are still shown below."
            primaryAction={{ label: 'Try again', onClick: () => void fetchData() }}
            className="mb-4"
          />
        ) : null}
        {classes.length === 0 && collectionState === 'ready' ? (
          <TeacherEmptyState
            title="No classes assigned yet"
            description="Assessments are class-scoped, so they will appear here once at least one active class is assigned to your teacher account."
          />
        ) : assessments.length === 0 && collectionState === 'ready' ? (
          <TeacherEmptyState
            title="No assessments yet"
            description="Create an assessment from a class workspace and it will appear here."
          />
        ) : assessments.length > 0 && filteredAssessments.length === 0 ? (
          <TeacherEmptyState
            title="No assessments match this view"
            description="Try a different class filter or search term, or create assessments from a class workspace first."
          />
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment) => (
              <div
                key={assessment.id}
                className="teacher-soft-panel flex flex-col gap-4 rounded-[1.4rem] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-black text-[var(--teacher-text-strong)]">{assessment.title}</p>
                    <Badge variant="outline" className="teacher-button-outline rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase">
                      {assessment.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant="outline" className="teacher-button-outline rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase">
                      {periods.find((period) => period.key === assessment.quarter)?.label ?? 'Unassigned'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--teacher-text-muted)]">{assessment.classLabel}</p>
                  <p className="text-xs uppercase text-[var(--teacher-text-muted)]">
                    {formatAssessmentType(assessment.type)} • {formatDate(assessment.dueDate)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/teacher/assessments/${assessment.id}`}>
                    <Button variant="outline" className="teacher-button-outline rounded-xl px-4 font-black">
                      Review
                    </Button>
                  </Link>
                  <Link href={`/dashboard/teacher/assessments/${assessment.id}/edit`}>
                    <Button variant="outline" className="teacher-button-outline rounded-xl px-4 font-black">
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
