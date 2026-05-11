'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sectionService, type SectionCandidate } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentMasterlistTable,
  type MasterlistEligibilityFilter,
  type MasterlistSortDirection,
  type MasterlistSortField,
} from '@/components/shared/StudentMasterlistTable';
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

function isRateLimitError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 429
  );
}

async function addStudentsWithRetry(sectionId: string, studentIds: string[]) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sectionService.addStudents(sectionId, studentIds);
      return;
    } catch (error) {
      if (!isRateLimitError(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }
}

export default function TeacherAddSectionStudentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = params?.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [candidates, setCandidates] = useState<SectionCandidate[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const gradeLevel = searchParams.get('gradeLevel') || '';
  const assignedSectionId = searchParams.get('assignedSectionId') || '';
  const search = searchParams.get('search') || '';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const eligibility = toEligibility(searchParams.get('eligibility'));
  const sortBy = toSortField(searchParams.get('sortBy'));
  const sortDirection = toSortDirection(searchParams.get('sortDirection'));

  const selectedEligibleCount = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          selectedIds.includes(candidate.id) &&
          (candidate.isEligible ?? !candidate.eligibilityReason),
      ).length,
    [selectedIds, candidates],
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
          ? `/dashboard/teacher/sections/${sectionId}/students/add?${query}`
          : `/dashboard/teacher/sections/${sectionId}/students/add`,
        { scroll: false },
      );
    },
    [router, searchParams, sectionId],
  );

  const fetchSection = useCallback(async () => {
    const sectionRes = await sectionService.getById(sectionId);
    const currentSection = sectionRes.data;
    setSection(currentSection);

    if (!gradeLevel && currentSection.gradeLevel) {
      updateQuery({ gradeLevel: currentSection.gradeLevel, page: 1 });
    }
  }, [sectionId, gradeLevel, updateQuery]);

  const fetchSections = useCallback(async () => {
    if (!gradeLevel) {
      setSections([]);
      return;
    }

    const sectionRes = await sectionService.getAll({ gradeLevel, page: 1, limit: 100 });
    setSections(sectionRes.data || []);
  }, [gradeLevel]);

  const fetchCandidates = useCallback(async () => {
    if (!gradeLevel) return;

    try {
      setLoading(true);
      const candidatesRes = await sectionService.getCandidates(sectionId, {
        gradeLevel,
        search: search || undefined,
        assignedSectionId: assignedSectionId || undefined,
        eligibility,
        sortBy,
        sortDirection,
        prioritizeEligible: true,
        page,
        limit: PAGE_SIZE,
      });

      setCandidates(candidatesRes.data || []);
      setTotalPages(candidatesRes.totalPages || 1);
      setTotal(candidatesRes.total || 0);
      setSelectedIds([]);
    } catch {
      toast.error('Failed to load candidate students');
    } finally {
      setLoading(false);
    }
  }, [assignedSectionId, eligibility, gradeLevel, page, search, sectionId, sortBy, sortDirection]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchSection();
      } catch {
        toast.error('Failed to load section');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchSection]);

  useEffect(() => {
    void fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (!gradeLevel) return;
    void fetchCandidates();
  }, [fetchCandidates, gradeLevel]);

  const handleToggleCandidate = (candidateId: string) => {
    const candidate = candidates.find((row) => row.id === candidateId);
    const isEligible = candidate ? (candidate.isEligible ?? !candidate.eligibilityReason) : false;
    if (!isEligible) return;

    setSelectedIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId],
    );
  };

  const handleAddSelected = async () => {
    const eligibleIds = selectedIds.filter((id) => {
      const candidate = candidates.find((row) => row.id === id);
      return candidate ? (candidate.isEligible ?? !candidate.eligibilityReason) : false;
    });

    if (eligibleIds.length === 0) {
      toast.error('Select at least one eligible student');
      return;
    }

    try {
      setSaving(true);
      await addStudentsWithRetry(sectionId, eligibleIds);
      toast.success(`Added ${eligibleIds.length} student(s)`);
      router.push(`/dashboard/teacher/sections/${sectionId}/roster`);
    } catch {
      toast.error('Failed to add one or more students');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/roster`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Roster
          </Button>
          <h1 className="text-2xl font-bold">Add Students</h1>
          <p className="text-muted-foreground">
            {section?.name || 'Section'} • Grade {section?.gradeLevel || '--'}
          </p>
        </div>
        <Button onClick={handleAddSelected} disabled={saving || selectedEligibleCount === 0}>
          <UserPlus className="mr-1 h-4 w-4" />
          {saving ? 'Adding...' : `Add ${selectedEligibleCount} Student(s)`}
        </Button>
      </div>

      {!gradeLevel ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading section grade context</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : (
        <StudentMasterlistTable
          title="Modern Masterlist"
          description="Multi-filter student discovery with eligibility-first ordering, quick select, and paginated matching."
          rows={candidates.map((candidate) => ({
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            lrn: candidate.lrn,
            gradeLevel: candidate.gradeLevel ?? null,
            sectionName: candidate.enrolledSectionName,
            profilePicture: candidate.profilePicture,
            isEligible: candidate.isEligible ?? !candidate.eligibilityReason,
            disabledReason: candidate.eligibilityReason,
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
          onGradeFilterChange={(value) =>
            updateQuery({ gradeLevel: value || null, assignedSectionId: null, page: 1 })
          }
          gradeOptions={GRADE_LEVELS.map((grade) => ({ value: grade, label: `Grade ${grade}` }))}
          sectionFilter={assignedSectionId}
          onSectionFilterChange={(value) => updateQuery({ assignedSectionId: value || null, page: 1 })}
          sectionOptions={sections.map((item) => ({ value: item.id, label: item.name }))}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortByChange={(field) => updateQuery({ sortBy: field, page: 1 })}
          onSortDirectionChange={(direction) => updateQuery({ sortDirection: direction, page: 1 })}
          onToggleRow={handleToggleCandidate}
          onSelectAllEligible={() => {
            const ids = candidates
              .filter((candidate) => candidate.isEligible ?? !candidate.eligibilityReason)
              .map((candidate) => candidate.id);
            setSelectedIds(Array.from(new Set([...selectedIds, ...ids])));
          }}
          onClearSelection={() => setSelectedIds([])}
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          onOpenProfile={(studentId) =>
            router.push(`/dashboard/teacher/sections/${sectionId}/students/${studentId}`)
          }
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" />
            Selected eligible: {selectedEligibleCount}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/roster`)}>
              Cancel
            </Button>
            <Button onClick={handleAddSelected} disabled={saving || selectedEligibleCount === 0}>
              {saving ? 'Adding...' : `Add ${selectedEligibleCount} Student(s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
