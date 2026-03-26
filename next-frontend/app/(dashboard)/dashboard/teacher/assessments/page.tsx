'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Clock3, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
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
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';

type AssessmentWithClass = Assessment & {
  classLabel: string;
};

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
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const classesRes = await classService.getByTeacher(user.id, 'active');
      const activeClasses = classesRes.data || [];
      setClasses(activeClasses);

      if (activeClasses.length === 0) {
        setAssessments([]);
        return;
      }

      const assessmentResponses = await Promise.all(
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

      const merged = assessmentResponses
        .flat()
        .sort((left, right) => {
          const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
          const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
          return rightTime - leftTime;
        });

      setAssessments(merged);
    } catch {
      setClasses([]);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      const matchesClass = selectedClassId === 'all' || assessment.classId === selectedClassId;
      const needle = search.trim().toLowerCase();
      const matchesSearch =
        needle.length === 0 ||
        assessment.title.toLowerCase().includes(needle) ||
        assessment.classLabel.toLowerCase().includes(needle) ||
        formatAssessmentType(assessment.type).toLowerCase().includes(needle);

      return matchesClass && matchesSearch;
    });
  }, [assessments, search, selectedClassId]);

  if (loading) {
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
      badge="Teacher Assessments"
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
        description="Filter by class or search by title and assessment type."
      >
        <div className="grid gap-4 md:grid-cols-[minmax(14rem,18rem)_1fr]">
          <select
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
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Assessment Index"
        description="Open an assessment for review or jump straight into editing."
      >
        {classes.length === 0 ? (
          <TeacherEmptyState
            title="No classes assigned yet"
            description="Assessments are class-scoped, so they will appear here once at least one active class is assigned to your teacher account."
          />
        ) : filteredAssessments.length === 0 ? (
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
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
