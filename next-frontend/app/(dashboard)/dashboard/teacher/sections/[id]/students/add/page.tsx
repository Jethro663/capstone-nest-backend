'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { sectionService, type SectionCandidate } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Section } from '@/types/section';

const PAGE_SIZE = 20;

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim()?.charAt(0) || '';
  const lastInitial = lastName?.trim()?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'ST';
}

export default function TeacherAddSectionStudentsPage() {
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
      router.push('/dashboard/teacher/sections');
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
      router.push(`/dashboard/teacher/sections/${sectionId}/roster`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to add selected students'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-[520px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/roster`)}
          className="mb-2"
        >
          ← Back to Roster
        </Button>
        <h1 className="text-2xl font-bold">Add Students</h1>
        <p className="text-muted-foreground">
          {section?.name} • Grade {section?.gradeLevel}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Students</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Section Grade Level</p>
            <Input value={`Grade ${section?.gradeLevel || ''}`} disabled />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Search (Name, Email, Grade)</p>
            <Input
              placeholder="Search students"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Masterlist</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{total} total</Badge>
            <Badge>{selectedEligibleCount} selected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Students with grade mismatch or existing active section enrollment are shown but disabled.
          </p>

          {currentPageItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found for current filters.</p>
          ) : (
            currentPageItems.map((candidate) => {
              const isSelected = selectedIds.includes(candidate.id);
              const disabledReason = getDisabledReason(candidate);

              return (
                <label
                  key={candidate.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    disabledReason ? 'opacity-60 bg-muted/20' : 'cursor-pointer hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={Boolean(disabledReason)}
                    onChange={() => handleToggleCandidate(candidate)}
                    className="mt-3"
                  />

                  <Avatar className="h-10 w-10 border">
                    {candidate.profilePicture ? (
                      <AvatarImage
                        src={candidate.profilePicture}
                        alt={`${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()}
                      />
                    ) : null}
                    <AvatarFallback>{getInitials(candidate.firstName, candidate.lastName)}</AvatarFallback>
                  </Avatar>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/teacher/sections/${sectionId}/students/${candidate.id}`)
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium hover:underline">
                        {candidate.firstName} {candidate.lastName}
                      </p>
                      <Badge variant="outline">Grade {candidate.gradeLevel || '—'}</Badge>
                      {candidate.enrolledSectionName ? (
                        <Badge variant="outline">{candidate.enrolledSectionName}</Badge>
                      ) : null}
                      {disabledReason ? (
                        <Badge variant="secondary">{disabledReason}</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{candidate.email || 'No email'}</p>
                  </button>
                </label>
              );
            })
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
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
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/roster`)}
          >
            Cancel
          </Button>
          <Button onClick={handleAddSelected} disabled={saving || selectedEligibleCount === 0}>
            {saving ? 'Adding...' : `Add ${selectedEligibleCount} Student(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
