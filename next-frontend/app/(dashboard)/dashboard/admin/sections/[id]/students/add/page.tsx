'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sectionService, type SectionCandidate } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Section } from '@/types/section';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 20;

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim()?.charAt(0) || '';
  const lastInitial = lastName?.trim()?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'ST';
}

export default function AddSectionStudentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sectionId = params?.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [candidates, setCandidates] = useState<SectionCandidate[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!sectionId) return;

    try {
      setLoading(true);
      const [sectionRes, candidatesRes] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getCandidates(sectionId),
      ]);
      setSection(sectionRes.data);
      setCandidates(candidatesRes.data || []);
      setSelectedIds([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load candidate students'));
      router.push('/dashboard/admin/sections');
    } finally {
      setLoading(false);
    }
  }, [router, sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
      setSelectedIds([]);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const getDisabledReason = useCallback(
    (candidate: SectionCandidate): string | null => {
      if (!section) return 'Section details are unavailable';
      if (candidate.hasActiveSectionEnrollment) {
        return candidate.enrolledSectionName
          ? `Already in section ${candidate.enrolledSectionName}`
          : 'Already assigned to another section';
      }
      if (candidate.gradeLevel && candidate.gradeLevel !== section.gradeLevel) {
        return `Grade mismatch (${candidate.gradeLevel} vs ${section.gradeLevel})`;
      }
      return null;
    },
    [section],
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return candidates.filter((candidate) => {
      if (!query) return true;
      const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(query) ||
        candidate.email?.toLowerCase().includes(query) ||
        candidate.gradeLevel?.toLowerCase().includes(query)
      );
    });
  }, [candidates, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedEligibleCount = useMemo(
    () =>
      currentPageItems.filter(
        (candidate) =>
          selectedIds.includes(candidate.id) && !getDisabledReason(candidate),
      ).length,
    [currentPageItems, getDisabledReason, selectedIds],
  );

  const handleToggleCandidate = (candidate: SectionCandidate) => {
    if (getDisabledReason(candidate)) return;

    setSelectedIds((prev) =>
      prev.includes(candidate.id)
        ? prev.filter((id) => id !== candidate.id)
        : [...prev, candidate.id],
    );
  };

  const handleAddSelected = async () => {
    const eligibleIds = selectedIds.filter((id) => {
      const candidate = filtered.find((item) => item.id === id);
      return candidate ? !getDisabledReason(candidate) : false;
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

  if (loading) {
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
      description={`Assign eligible students to ${section?.name ?? 'this section'} using the same admin list treatment as the main management pages.`}
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
          <AdminStatCard label="Section Grade" value={`Grade ${section?.gradeLevel ?? '—'}`} caption="Students must match this grade" icon={Users} accent="sky" />
          <AdminStatCard label="Candidates" value={total} caption="Available under current filters" icon={Users} accent="emerald" />
          <AdminStatCard label="Selected" value={selectedEligibleCount} caption={`Page ${page} of ${totalPages}`} icon={UserPlus} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard
        title="Filter Students"
        description="Search by name, email, or grade level before assigning students to this section."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[var(--admin-text-strong)]">Section Grade Level</p>
            <Input value={`Grade ${section?.gradeLevel || ''}`} disabled className="admin-input" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[var(--admin-text-strong)]">Search</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
              <Input
                placeholder="Search students"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="admin-input pl-10"
              />
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Masterlist"
        description="Students with grade mismatch or active enrollment stay visible but disabled for assignment."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold">{total} total</Badge>
          <Badge className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-600">{selectedEligibleCount} selected</Badge>
        </div>

        {currentPageItems.length === 0 ? (
          <AdminEmptyState
            title="No students found for current filters"
            description="Try a broader search or clear the current query."
          />
        ) : (
          <div className="space-y-3">
            {currentPageItems.map((candidate) => {
              const isSelected = selectedIds.includes(candidate.id);
              const disabledReason = getDisabledReason(candidate);

              return (
                <label
                  key={candidate.id}
                  className={cn(
                    'admin-list-row rounded-[1.2rem] px-4 py-4',
                    disabledReason ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    isSelected ? 'border-red-200 bg-red-50/70' : '',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={Boolean(disabledReason)}
                    onChange={() => handleToggleCandidate(candidate)}
                    className="mt-3 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />

                  <Avatar className="h-10 w-10 border border-[var(--admin-outline)]">
                    {candidate.profilePicture ? (
                      <AvatarImage src={candidate.profilePicture} alt={`${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()} />
                    ) : null}
                    <AvatarFallback>{getInitials(candidate.firstName, candidate.lastName)}</AvatarFallback>
                  </Avatar>

                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/admin/users/${candidate.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--admin-text-strong)] hover:underline">
                        {candidate.firstName} {candidate.lastName}
                      </p>
                      <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold">
                        Grade {candidate.gradeLevel || '—'}
                      </Badge>
                      {candidate.enrolledSectionName ? (
                        <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold">
                          {candidate.enrolledSectionName}
                        </Badge>
                      ) : null}
                      {disabledReason ? (
                        <Badge variant="secondary" className="rounded-full px-3 py-1 font-semibold">
                          {disabledReason}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{candidate.email || 'No email'}</p>
                  </button>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-[var(--admin-outline)] pt-4">
          <p className="text-xs text-[var(--admin-text-muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="admin-button-outline rounded-xl font-black"
              disabled={page <= 1}
              onClick={() => {
                setPage((current) => Math.max(1, current - 1));
                setSelectedIds([]);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="admin-button-outline rounded-xl font-black"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((current) => Math.min(totalPages, current + 1));
                setSelectedIds([]);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
