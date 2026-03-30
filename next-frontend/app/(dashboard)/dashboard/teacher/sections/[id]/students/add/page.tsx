'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { sectionService, type SectionCandidate } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Section } from '@/types/section';
import './add-students-workspace.css';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const RATE_LIMIT_RETRY_DELAYS_MS = [300, 900] as const;

type CandidateStatus = 'available' | 'has-section' | 'grade-mismatch';
type Segment = 'available' | 'unavailable';

interface CandidateViewModel extends SectionCandidate {
  status: CandidateStatus;
  disabledReason: string | null;
}

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim()?.charAt(0) || '';
  const lastInitial = lastName?.trim()?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'ST';
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function getCandidateFullName(candidate: Pick<SectionCandidate, 'firstName' | 'lastName'>) {
  return `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unnamed Student';
}

function buildCandidateSortKey(candidate: SectionCandidate) {
  return [
    normalizeText(candidate.lastName),
    normalizeText(candidate.firstName),
    normalizeText(candidate.email),
    normalizeText(candidate.id),
  ] as const;
}

function compareCandidates(a: SectionCandidate, b: SectionCandidate) {
  const aKey = buildCandidateSortKey(a);
  const bKey = buildCandidateSortKey(b);

  for (let index = 0; index < aKey.length; index += 1) {
    const left = aKey[index];
    const right = bKey[index];

    if (left < right) return -1;
    if (left > right) return 1;
  }

  return 0;
}

function isRateLimitError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
    (error as { response: { status: number } }).response.status === 429
  );
}

async function delay(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const canRetry = isRateLimitError(error) && attempt < RATE_LIMIT_RETRY_DELAYS_MS.length;
      if (!canRetry) throw error;

      const waitMs = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
      attempt += 1;
      await delay(waitMs);
    }
  }
}

function resolveCandidateStatus(
  candidate: SectionCandidate,
  section: Section | null,
): Pick<CandidateViewModel, 'status' | 'disabledReason'> {
  if (!section) {
    return {
      status: 'grade-mismatch',
      disabledReason: 'Section details are unavailable',
    };
  }

  if (candidate.hasActiveSectionEnrollment) {
    return {
      status: 'has-section',
      disabledReason: candidate.enrolledSectionName
        ? `Already in section ${candidate.enrolledSectionName}`
        : 'Already assigned to another section',
    };
  }

  if (candidate.gradeLevel && candidate.gradeLevel !== section.gradeLevel) {
    return {
      status: 'grade-mismatch',
      disabledReason: `Grade mismatch (${candidate.gradeLevel} vs ${section.gradeLevel})`,
    };
  }

  return {
    status: 'available',
    disabledReason: null,
  };
}

function getEnterStyle(delayMs: number): CSSProperties {
  const enterDelayVar = '--enter-delay' as const;
  return { [enterDelayVar]: `${delayMs}ms` } as CSSProperties;
}

export default function TeacherAddSectionStudentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sectionId = params?.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [candidates, setCandidates] = useState<SectionCandidate[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<Segment>('available');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [profileCandidate, setProfileCandidate] = useState<CandidateViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [saving, setSaving] = useState(false);

  const inFlightFetchRef = useRef<Promise<void> | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!sectionId) return;

    if (inFlightFetchRef.current) {
      await inFlightFetchRef.current;
      return;
    }

    const request = (async () => {
      try {
        if (isMountedRef.current) {
          setLoading(true);
        }

        const [sectionRes, candidatesRes] = await Promise.all([
          withRateLimitRetry(() => sectionService.getById(sectionId)),
          withRateLimitRetry(() => sectionService.getCandidates(sectionId)),
        ]);

        if (!isMountedRef.current) return;
        setSection(sectionRes.data);
        setCandidates(candidatesRes.data || []);
        setHasLoadedOnce(true);
      } catch (error) {
        if (!isMountedRef.current) return;

        if (isRateLimitError(error)) {
          toast.error('Too many requests right now. Please wait a moment and try again.');
          return;
        }

        toast.error(getApiErrorMessage(error, 'Failed to load candidate students'));
        router.push('/dashboard/teacher/sections');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
        inFlightFetchRef.current = null;
      }
    })();

    inFlightFetchRef.current = request;
    await request;
  }, [router, sectionId]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [segment]);

  const viewModels = useMemo<CandidateViewModel[]>(() => {
    return candidates.map((candidate) => {
      const statusInfo = resolveCandidateStatus(candidate, section);
      return {
        ...candidate,
        status: statusInfo.status,
        disabledReason: statusInfo.disabledReason,
      };
    });
  }, [candidates, section]);

  const eligibleIds = useMemo(
    () => new Set(viewModels.filter((candidate) => candidate.status === 'available').map((candidate) => candidate.id)),
    [viewModels],
  );

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => eligibleIds.has(id)));
  }, [eligibleIds]);

  const filteredCandidates = useMemo(() => {
    const query = search.toLowerCase();

    const matchesQuery = (candidate: CandidateViewModel) => {
      if (!query) return true;
      const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.toLowerCase();
      return fullName.includes(query) || candidate.email?.toLowerCase().includes(query);
    };

    return viewModels.filter(matchesQuery);
  }, [search, viewModels]);

  const availableCandidates = useMemo(
    () => filteredCandidates.filter((candidate) => candidate.status === 'available').sort(compareCandidates),
    [filteredCandidates],
  );

  const unavailableCandidates = useMemo(
    () => filteredCandidates.filter((candidate) => candidate.status !== 'available').sort(compareCandidates),
    [filteredCandidates],
  );

  const segmentedCandidates = segment === 'available' ? availableCandidates : unavailableCandidates;
  const totalRows = segmentedCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const currentPageItems = segmentedCandidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleEligibleIds = currentPageItems
    .filter((candidate) => candidate.status === 'available')
    .map((candidate) => candidate.id);

  const allVisibleEligibleSelected =
    visibleEligibleIds.length > 0 && visibleEligibleIds.every((id) => selectedIds.includes(id));

  const someVisibleEligibleSelected =
    visibleEligibleIds.some((id) => selectedIds.includes(id)) && !allVisibleEligibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleEligibleSelected;
    }
  }, [someVisibleEligibleSelected]);

  const selectedCount = selectedIds.length;
  const profileCandidateName = profileCandidate ? getCandidateFullName(profileCandidate) : '';

  const handleToggleCandidate = (candidate: CandidateViewModel) => {
    if (candidate.status !== 'available') return;

    setSelectedIds((current) =>
      current.includes(candidate.id)
        ? current.filter((id) => id !== candidate.id)
        : [...current, candidate.id],
    );
  };

  const handleToggleSelectAllVisible = () => {
    if (visibleEligibleIds.length === 0) return;

    setSelectedIds((current) => {
      if (allVisibleEligibleSelected) {
        return current.filter((id) => !visibleEligibleIds.includes(id));
      }

      const next = new Set(current);
      visibleEligibleIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleAddSelected = async () => {
    const payload = selectedIds.filter((id) => eligibleIds.has(id));

    if (payload.length === 0) {
      toast.error('Select at least one available student');
      return;
    }

    try {
      setSaving(true);
      await withRateLimitRetry(() => sectionService.addStudents(sectionId, payload));
      toast.success(`Added ${payload.length} student(s)`);
      router.push(`/dashboard/teacher/sections/${sectionId}/roster`);
    } catch (error) {
      if (isRateLimitError(error)) {
        toast.error('Too many requests while adding students. Please try again shortly.');
        return;
      }

      toast.error(getApiErrorMessage(error, 'Failed to add selected students'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !hasLoadedOnce) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-[460px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="teacher-add-students">
      <section className="teacher-add-students__workspace">
        <header
          className="teacher-add-students__hero teacher-add-students__soft-enter"
          style={getEnterStyle(0)}
        >
          <button
            type="button"
            className="teacher-add-students__back"
            onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/roster`)}
          >
            Back to Roster
          </button>

          <div className="teacher-add-students__hero-row">
            <div className="teacher-add-students__hero-icon" aria-hidden="true">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="teacher-add-students__hero-copy">
              <h1>Add Students</h1>
              <p>Select students to add to this section</p>
            </div>
          </div>
        </header>

        <section
          className="teacher-add-students__panel teacher-add-students__soft-enter"
          style={getEnterStyle(60)}
        >
          <div className="teacher-add-students__toolbar">
            <label className="teacher-add-students__search" htmlFor="student-search">
              <Search className="h-4 w-4" />
              <input
                id="student-search"
                type="text"
                placeholder="Search by name, email, or LRN..."
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                }}
              />
            </label>

            <label className="teacher-add-students__select-all">
              <input
                ref={selectAllRef}
                type="checkbox"
                aria-label="Select all visible students"
                checked={allVisibleEligibleSelected}
                disabled={visibleEligibleIds.length === 0}
                onChange={handleToggleSelectAllVisible}
              />
              <span>Select All</span>
            </label>
          </div>

          <div className="teacher-add-students__segments" role="tablist" aria-label="Student availability">
            <button
              type="button"
              role="tab"
              aria-selected={segment === 'available'}
              className="teacher-add-students__segment-btn"
              data-active={segment === 'available'}
              onClick={() => setSegment('available')}
            >
              Available
              <span>{availableCandidates.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={segment === 'unavailable'}
              className="teacher-add-students__segment-btn"
              data-active={segment === 'unavailable'}
              onClick={() => setSegment('unavailable')}
            >
              Unavailable
              <span>{unavailableCandidates.length}</span>
            </button>
          </div>

          <div className="teacher-add-students__table-wrap">
            {currentPageItems.length === 0 ? (
              <div className="teacher-add-students__empty">No students found for the current view.</div>
            ) : (
              <table className="teacher-add-students__table">
                <thead>
                  <tr>
                    <th className="teacher-add-students__check-col"> </th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Section</th>
                    <th className="teacher-add-students__action-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.map((candidate) => {
                    const fullName = getCandidateFullName(candidate);
                    const isSelected = selectedIds.includes(candidate.id);

                    return (
                      <tr key={candidate.id} data-status={candidate.status} data-selected={isSelected}>
                        <td className="teacher-add-students__check-col">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={candidate.status !== 'available'}
                            aria-label={`Select ${fullName}`}
                            onChange={() => handleToggleCandidate(candidate)}
                          />
                        </td>
                        <td>
                          <div className="teacher-add-students__student-cell">
                            <Avatar className="h-9 w-9 border border-[#dce5f2]">
                              {candidate.profilePicture ? (
                                <AvatarImage src={candidate.profilePicture} alt={fullName} />
                              ) : null}
                              <AvatarFallback>{getInitials(candidate.firstName, candidate.lastName)}</AvatarFallback>
                            </Avatar>

                            <button
                              type="button"
                              className="teacher-add-students__student-link"
                              aria-label={`Open ${fullName} profile`}
                              onClick={() =>
                                router.push(`/dashboard/teacher/sections/${sectionId}/students/${candidate.id}`)
                              }
                            >
                              {fullName}
                            </button>
                          </div>
                        </td>
                        <td>{candidate.email || 'No email'}</td>
                        <td>
                          {candidate.status === 'available' ? (
                            <span className="teacher-add-students__badge teacher-add-students__badge--ok">Available</span>
                          ) : (
                            <span className="teacher-add-students__badge teacher-add-students__badge--warn">
                              {candidate.disabledReason}
                            </span>
                          )}
                        </td>
                        <td className="teacher-add-students__action-col">
                          <button
                            type="button"
                            className="teacher-add-students__view-profile-btn"
                            aria-label={`View profile for ${fullName}`}
                            onClick={() => setProfileCandidate(candidate)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="teacher-add-students__footer-row">
            <p>
              Page {page} of {totalPages}
            </p>
            <div className="teacher-add-students__pager">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      </section>

      <Dialog
        open={Boolean(profileCandidate)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setProfileCandidate(null);
        }}
      >
        <DialogContent className="teacher-add-students__profile-modal">
          {profileCandidate ? (
            <>
              <DialogHeader>
                <DialogTitle>Student Profile</DialogTitle>
                <DialogDescription>Basic profile details for this section candidate.</DialogDescription>
              </DialogHeader>

              <div className="teacher-add-students__profile-card">
                <div className="teacher-add-students__profile-main">
                  <Avatar className="teacher-add-students__profile-avatar">
                    {profileCandidate.profilePicture ? (
                      <AvatarImage src={profileCandidate.profilePicture} alt={profileCandidateName} />
                    ) : null}
                    <AvatarFallback>
                      {getInitials(profileCandidate.firstName, profileCandidate.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="teacher-add-students__profile-name">{profileCandidateName}</p>
                    <p className="teacher-add-students__profile-email">
                      {profileCandidate.email || 'No email address on file'}
                    </p>
                  </div>
                </div>

                <dl className="teacher-add-students__profile-grid">
                  <div>
                    <dt>Grade Level</dt>
                    <dd>{profileCandidate.gradeLevel || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt>Student ID</dt>
                    <dd>{profileCandidate.id}</dd>
                  </div>
                  <div>
                    <dt>Availability</dt>
                    <dd>{profileCandidate.status === 'available' ? 'Available for this section' : 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Section Status</dt>
                    <dd>
                      {profileCandidate.status === 'available'
                        ? 'No active section enrollment'
                        : profileCandidate.disabledReason || 'Unavailable for this section'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="teacher-add-students__profile-actions">
                <Button type="button" variant="outline" onClick={() => setProfileCandidate(null)}>
                  Close Profile
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="teacher-add-students__sticky-actions">
        <div className="teacher-add-students__sticky-inner">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/roster`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || selectedCount === 0}
            onClick={() => {
              void handleAddSelected();
            }}
          >
            {saving ? 'Adding...' : `Add Selected (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
