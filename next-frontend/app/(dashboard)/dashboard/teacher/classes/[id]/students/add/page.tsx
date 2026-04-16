'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { sectionService } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentMasterlistTable,
  type MasterlistEligibilityFilter,
  type MasterlistSortDirection,
  type MasterlistSortField,
} from '@/components/shared/StudentMasterlistTable';
import type { ClassItem, StudentMasterlistItem } from '@/types/class';
import type { Section } from '@/types/section';
import { GRADE_LEVELS } from '@/utils/constants';

const PAGE_SIZE = 20;

function toSortField(value: string | null): MasterlistSortField {
  if (
    value === 'firstName' ||
    value === 'email' ||
    value === 'gradeLevel' ||
    value === 'lrn' ||
    value === 'eligibility'
  ) {
    return value;
  }
  return 'lastName';
}

function toSortDirection(value: string | null): MasterlistSortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}

function toEligibility(value: string | null): MasterlistEligibilityFilter {
  if (value === 'eligible' || value === 'mismatch') return value;
  return 'all';
}

export default function TeacherAddStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = params.id as string;

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<StudentMasterlistItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const gradeLevel = searchParams.get('gradeLevel') || '';
  const sectionId = searchParams.get('sectionId') || '';
  const search = searchParams.get('search') || '';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const eligibility = toEligibility(searchParams.get('eligibility'));
  const sortBy = toSortField(searchParams.get('sortBy'));
  const sortDirection = toSortDirection(searchParams.get('sortDirection'));

  const selectedEligibleCount = useMemo(
    () => students.filter((student) => selectedIds.includes(student.id) && student.isEligible).length,
    [selectedIds, students],
  );

  const updateQuery = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || Number.isNaN(value)) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }

      const query = next.toString();
      router.replace(
        query
          ? `/dashboard/teacher/classes/${classId}/students/add?${query}`
          : `/dashboard/teacher/classes/${classId}/students/add`,
        { scroll: false },
      );
    },
    [classId, router, searchParams],
  );

  const fetchClass = useCallback(async () => {
    const classRes = await classService.getById(classId);
    const resolvedClass = classRes.data;
    setClassItem(resolvedClass);

    const defaultGrade = resolvedClass.section?.gradeLevel || resolvedClass.subjectGradeLevel || '';
    if (!gradeLevel && defaultGrade) {
      updateQuery({ gradeLevel: defaultGrade, page: 1 });
    }
  }, [classId, gradeLevel, updateQuery]);

  const fetchSections = useCallback(async () => {
    if (!gradeLevel) {
      setSections([]);
      return;
    }
    const res = await sectionService.getAll({ gradeLevel, page: 1, limit: 100 });
    setSections(res.data || []);
  }, [gradeLevel]);

  const fetchStudents = useCallback(async () => {
    if (!gradeLevel) return;

    try {
      setLoading(true);
      const res = await classService.getStudentsMasterlist(classId, {
        gradeLevel,
        sectionId: sectionId || undefined,
        search: search || undefined,
        eligibility,
        sortBy,
        sortDirection,
        prioritizeEligible: true,
        page,
        limit: PAGE_SIZE,
      });

      setStudents(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
      setSelectedIds([]);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [classId, eligibility, gradeLevel, page, search, sectionId, sortBy, sortDirection]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchClass();
      } catch {
        toast.error('Failed to load class');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchClass]);

  useEffect(() => {
    void fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (!gradeLevel) return;
    void fetchStudents();
  }, [fetchStudents, gradeLevel]);

  const handleToggleStudent = (studentId: string) => {
    const student = students.find((row) => row.id === studentId);
    if (!student?.isEligible) return;

    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleAddSelected = async () => {
    const eligibleIds = selectedIds.filter((id) => students.some((student) => student.id === id && student.isEligible));
    if (eligibleIds.length === 0) {
      toast.error('Select at least one eligible student');
      return;
    }

    try {
      setSubmitting(true);
      await Promise.all(
        eligibleIds.map((studentId) => classService.enrollStudent(classId, { studentId })),
      );
      toast.success(`Added ${eligibleIds.length} student(s)`);
      router.push(`/dashboard/teacher/classes/${classId}`);
    } catch {
      toast.error('Failed to add one or more students');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/teacher/classes/${classId}`)} className="mb-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Class
          </Button>
          <h1 className="text-2xl font-bold">Add Students</h1>
          <p className="text-muted-foreground">
            {classItem?.subjectName} ({classItem?.subjectCode}) • {classItem?.section?.name}
          </p>
        </div>
        <Button onClick={handleAddSelected} disabled={submitting || selectedEligibleCount === 0}>
          <UserPlus className="mr-1 h-4 w-4" />
          {submitting ? 'Adding...' : `Add ${selectedEligibleCount} Student(s)`}
        </Button>
      </div>

      {!gradeLevel ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading class grade context</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : (
        <StudentMasterlistTable
          title="Modern Masterlist"
          description="Multi-filter student discovery with eligibility-first ordering, quick select, and paginated matching."
          rows={students.map((student) => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            lrn: student.lrn,
            gradeLevel: student.gradeLevel,
            sectionName: student.section?.name,
            profilePicture: student.profilePicture,
            isEligible: student.isEligible,
            disabledReason: student.disabledReason,
          }))}
          loading={loading}
          total={total}
          page={page}
          totalPages={totalPages}
          selectedIds={selectedIds}
          searchValue={search}
          onSearchChange={(value) => updateQuery({ search: value || null, page: 1 })}
          eligibility={eligibility}
          onEligibilityChange={(value) => updateQuery({ eligibility: value, page: 1 })}
          gradeFilter={gradeLevel}
          onGradeFilterChange={(value) => {
            updateQuery({
              gradeLevel: value || null,
              sectionId: null,
              page: 1,
            });
          }}
          gradeOptions={GRADE_LEVELS.map((grade) => ({ value: grade, label: `Grade ${grade}` }))}
          sectionFilter={sectionId}
          onSectionFilterChange={(value) => updateQuery({ sectionId: value || null, page: 1 })}
          sectionOptions={sections.map((section) => ({ value: section.id, label: section.name }))}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortByChange={(field) => updateQuery({ sortBy: field, page: 1 })}
          onSortDirectionChange={(direction) => updateQuery({ sortDirection: direction, page: 1 })}
          onToggleRow={handleToggleStudent}
          onSelectAllEligible={() => {
            const eligibleIds = students.filter((student) => student.isEligible).map((student) => student.id);
            setSelectedIds(Array.from(new Set([...selectedIds, ...eligibleIds])));
          }}
          onClearSelection={() => setSelectedIds([])}
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          onOpenProfile={(studentId) => router.push(`/dashboard/teacher/classes/${classId}/students/${studentId}`)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" />
            Selected eligible: {selectedEligibleCount}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/classes/${classId}`)}>
              Cancel
            </Button>
            <Button onClick={handleAddSelected} disabled={submitting || selectedEligibleCount === 0}>
              {submitting ? 'Adding...' : `Add ${selectedEligibleCount} Student(s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

