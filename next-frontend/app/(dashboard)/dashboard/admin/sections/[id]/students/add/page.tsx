'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sectionService, type SectionCandidate } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Section } from '@/types/section';
import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import {
  StudentMasterlistTable,
  type MasterlistEligibilityFilter,
  type MasterlistSortDirection,
  type MasterlistSortField,
} from '@/components/shared/StudentMasterlistTable';

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

export default function AddSectionStudentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = params?.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [candidates, setCandidates] = useState<SectionCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const search = searchParams.get('search') || '';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const eligibility = toEligibility(searchParams.get('eligibility'));
  const sortBy = toSortField(searchParams.get('sortBy'));
  const sortDirection = toSortDirection(searchParams.get('sortDirection'));
  const assignedSectionId = searchParams.get('assignedSectionId') || '';

  const sectionFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const candidate of candidates) {
      if (candidate.enrolledSectionId && candidate.enrolledSectionName) {
        map.set(candidate.enrolledSectionId, candidate.enrolledSectionName);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [candidates]);

  const selectedEligibleCount = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          selectedIds.includes(candidate.id) &&
          (candidate.isEligible ?? !candidate.eligibilityReason),
      ).length,
    [candidates, selectedIds],
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
          ? `/dashboard/admin/sections/${sectionId}/students/add?${query}`
          : `/dashboard/admin/sections/${sectionId}/students/add`,
        { scroll: false },
      );
    },
    [router, searchParams, sectionId],
  );

  const fetchData = useCallback(async () => {
    if (!sectionId) return;

    try {
      setLoading(true);
      const [sectionRes, candidatesRes] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getCandidates(sectionId, {
          search: search || undefined,
          eligibility,
          sortBy,
          sortDirection,
          assignedSectionId: assignedSectionId || undefined,
          prioritizeEligible: true,
          page,
          limit: PAGE_SIZE,
        }),
      ]);

      setSection(sectionRes.data);
      setCandidates(candidatesRes.data || []);
      setTotal(candidatesRes.total || 0);
      setTotalPages(candidatesRes.totalPages || 1);
      setSelectedIds([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load candidate students'));
      router.push('/dashboard/admin/sections');
    } finally {
      setLoading(false);
    }
  }, [assignedSectionId, eligibility, page, router, search, sectionId, sortBy, sortDirection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleCandidate = (candidateId: string) => {
    const target = candidates.find((candidate) => candidate.id === candidateId);
    if (!target) return;
    if (!(target.isEligible ?? !target.eligibilityReason)) return;

    setSelectedIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId],
    );
  };

  const handleAddSelected = async () => {
    const eligibleIds = selectedIds.filter((id) => {
      const candidate = candidates.find((item) => item.id === id);
      return candidate ? (candidate.isEligible ?? !candidate.eligibilityReason) : false;
    });

    if (eligibleIds.length === 0) {
      toast.error('Select at least one eligible student');
      return;
    }

    try {
      setSaving(true);
      await sectionService.addStudents(sectionId, eligibleIds);
      toast.success(`Added ${eligibleIds.length} student(s)`);
      router.push(`/dashboard/admin/sections/${sectionId}/roster`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to add selected students'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !section) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[36rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title="Add Students"
      description={`Assign eligible students to ${section?.name ?? 'this section'} with advanced filtering and roster validation.`}
      actions={(
        <>
          <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/roster`)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Roster
          </Button>
          <Button className="admin-button-solid rounded-xl font-black" onClick={handleAddSelected} disabled={saving || selectedEligibleCount === 0}>
            <UserPlus className="h-4 w-4" />
            {saving ? 'Adding...' : `Add ${selectedEligibleCount} Student(s)`}
          </Button>
        </>
      )}
      stats={(
        <>
          <AdminStatCard label="Section Grade" value={`Grade ${section?.gradeLevel ?? '--'}`} caption="Students must match this grade" icon={Users} accent="sky" />
          <AdminStatCard label="Candidates" value={total} caption="Server-filtered candidate list" icon={Users} accent="emerald" />
          <AdminStatCard label="Selected" value={selectedEligibleCount} caption={`Page ${page} of ${totalPages}`} icon={UserPlus} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard
        title="Student Masterlist"
        description="Available students are prioritized while mismatches remain visible with explicit reasons."
      >
        <div
          style={{
            ['--teacher-text-strong' as string]: 'var(--admin-text-strong)',
            ['--teacher-text-muted' as string]: 'var(--admin-text-muted)',
            ['--teacher-outline' as string]: 'var(--admin-outline)',
            ['--teacher-surface-soft' as string]: 'var(--admin-surface-soft)',
          }}
        >
          <StudentMasterlistTable
            title="Masterlist"
            description="Search, filter, sort, and bulk-select students before section assignment."
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
            sectionFilter={assignedSectionId}
            onSectionFilterChange={(value) => updateQuery({ assignedSectionId: value || null, page: 1 })}
            sectionOptions={sectionFilterOptions}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortByChange={(field) => updateQuery({ sortBy: field, page: 1 })}
            onSortDirectionChange={(direction) => updateQuery({ sortDirection: direction, page: 1 })}
            onToggleRow={handleToggleCandidate}
            onSelectAllEligible={() => {
              const eligibleIds = candidates
                .filter((candidate) => candidate.isEligible ?? !candidate.eligibilityReason)
                .map((candidate) => candidate.id);
              setSelectedIds(Array.from(new Set([...selectedIds, ...eligibleIds])));
            }}
            onClearSelection={() => setSelectedIds([])}
            onPageChange={(nextPage) => updateQuery({ page: nextPage })}
            onOpenProfile={(studentId) => router.push(`/dashboard/admin/users/${studentId}`)}
          />
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}

