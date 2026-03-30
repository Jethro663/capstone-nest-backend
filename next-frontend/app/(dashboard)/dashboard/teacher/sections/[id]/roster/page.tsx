'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  sectionService,
  type RosterStudent,
} from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SectionScheduleViewer } from '@/components/shared/SectionScheduleViewer';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Section } from '@/types/section';
import './roster-workspace.css';

function getEnterStyle(delayMs: number): CSSProperties {
  const enterDelayVar = '--enter-delay' as const;
  return { [enterDelayVar]: `${delayMs}ms` } as CSSProperties;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return initials || 'ST';
}

function formatAdviserName(section: Section | null) {
  if (!section?.adviser) return 'Unassigned';
  const name = `${section.adviser.firstName ?? ''} ${section.adviser.lastName ?? ''}`.trim();
  return name || 'Unassigned';
}

export default function SectionRosterPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyStudentIds, setBusyStudentIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [removingSelected, setRemovingSelected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sectionRes, rosterRes] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getRoster(sectionId),
      ]);

      setSection(sectionRes.data);
      setRoster(rosterRes.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to load section roster.'));
      setSection(null);
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const dedupedRoster = useMemo(() => {
    const seen = new Set<string>();
    return roster.filter((student) => {
      if (seen.has(student.id)) return false;
      seen.add(student.id);
      return true;
    });
  }, [roster]);

  useEffect(() => {
    const visibleIds = new Set(dedupedRoster.map((student) => student.id));
    setSelectedStudentIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [dedupedRoster]);

  const allVisibleSelected =
    dedupedRoster.length > 0 &&
    dedupedRoster.every((student) => selectedStudentIds.includes(student.id));

  const adviserName = formatAdviserName(section);

  const handleRowOpen = (studentId: string) => {
    router.push(`/dashboard/teacher/sections/${sectionId}/students/${studentId}`);
  };

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedStudentIds([]);
      return;
    }
    setSelectedStudentIds(dedupedRoster.map((student) => student.id));
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const handleRemoveStudent = async (studentId: string) => {
    setBusyStudentIds((current) => [...current, studentId]);
    try {
      await sectionService.removeStudent(sectionId, studentId);
      setRoster((current) => current.filter((student) => student.id !== studentId));
      setSelectedStudentIds((current) => current.filter((id) => id !== studentId));
      toast.success('Student removed from section.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove student.'));
    } finally {
      setBusyStudentIds((current) => current.filter((id) => id !== studentId));
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedStudentIds.length === 0) return;
    const selectedRows = dedupedRoster.filter((student) =>
      selectedStudentIds.includes(student.id),
    );
    if (selectedRows.length === 0) return;

    setRemovingSelected(true);
    try {
      const results = await Promise.allSettled(
        selectedRows.map((student) =>
          sectionService.removeStudent(sectionId, student.id),
        ),
      );

      const successfulIds: string[] = [];
      const failedIds: string[] = [];

      results.forEach((result, index) => {
        const id = selectedRows[index]?.id;
        if (!id) return;
        if (result.status === 'fulfilled') successfulIds.push(id);
        else failedIds.push(id);
      });

      if (successfulIds.length > 0) {
        setRoster((current) =>
          current.filter((student) => !successfulIds.includes(student.id)),
        );
      }

      setSelectedStudentIds(failedIds);

      if (failedIds.length === 0) {
        toast.success(`Removed ${successfulIds.length} student(s).`);
      } else if (successfulIds.length === 0) {
        toast.error(`Unable to remove ${failedIds.length} selected student(s).`);
      } else {
        toast.success(
          `Removed ${successfulIds.length} student(s). ${failedIds.length} could not be removed.`,
        );
      }
    } finally {
      setRemovingSelected(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-[22rem] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="teacher-section-roster">
      <section className="teacher-section-roster__workspace">
        <header
          className="teacher-section-roster__hero teacher-section-roster__soft-enter"
          style={getEnterStyle(0)}
        >
          <button
            type="button"
            className="teacher-section-roster__back"
            onClick={() => router.push('/dashboard/teacher/sections')}
          >
            <ArrowLeft className="h-4 w-4" />
            My Sections
          </button>

          <div className="teacher-section-roster__hero-row">
            <div className="teacher-section-roster__hero-copy">
              <h1>{section?.name || 'Section'}</h1>
              <p>
                Grade {section?.gradeLevel || 'N/A'} - {section?.schoolYear || 'N/A'}
              </p>
            </div>

            <Button
              type="button"
              className="teacher-section-roster__add"
              onClick={() =>
                router.push(`/dashboard/teacher/sections/${sectionId}/students/add`)
              }
            >
              <UserPlus className="h-4 w-4" />
              Add Students
            </Button>
          </div>
        </header>

        <section
          className="teacher-section-roster__stats teacher-section-roster__soft-enter"
          style={getEnterStyle(55)}
        >
          <article className="teacher-section-roster__stat-card">
            <Users className="h-4 w-4" />
            <strong>{dedupedRoster.length}</strong>
            <span>Students</span>
          </article>
          <article className="teacher-section-roster__stat-card">
            <GraduationCap className="h-4 w-4" />
            <strong>Grade {section?.gradeLevel || 'N/A'}</strong>
            <span>Grade Level</span>
          </article>
          <article className="teacher-section-roster__stat-card">
            <CalendarDays className="h-4 w-4" />
            <strong>{section?.schoolYear || 'N/A'}</strong>
            <span>School Year</span>
          </article>
          <article className="teacher-section-roster__stat-card">
            <User className="h-4 w-4" />
            <strong>{adviserName}</strong>
            <span>Adviser</span>
          </article>
        </section>

        <section
          className="teacher-section-roster__panel teacher-section-roster__soft-enter"
          style={getEnterStyle(95)}
        >
          <div className="teacher-section-roster__schedule-compact">
            <SectionScheduleViewer sectionId={sectionId} theme="teacher" chrome="flat" />
          </div>
        </section>

        <section
          className="teacher-section-roster__panel teacher-section-roster__soft-enter"
          style={getEnterStyle(130)}
        >
          <div className="teacher-section-roster__panel-head">
            <h2>
              Student Roster <span>({dedupedRoster.length})</span>
            </h2>
          </div>

          {selectedStudentIds.length > 0 ? (
            <div className="teacher-section-roster__selection-bar">
              <strong>{selectedStudentIds.length} selected</strong>
              <Button
                type="button"
                variant="outline"
                className="teacher-section-roster__remove-selected"
                onClick={() => void handleRemoveSelected()}
                disabled={removingSelected}
              >
                <Trash2 className="h-4 w-4" />
                {removingSelected ? 'Removing...' : 'Remove Selected'}
              </Button>
            </div>
          ) : null}

          {dedupedRoster.length === 0 ? (
            <div className="teacher-section-roster__empty">
              No students enrolled in this section yet.
            </div>
          ) : (
            <div className="teacher-section-roster__table-wrap">
              <table className="teacher-section-roster__table">
                <thead>
                  <tr>
                    <th className="teacher-section-roster__checkbox-cell">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAllVisible}
                        aria-label="Select all students"
                      />
                    </th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>LRN</th>
                    <th>Grade</th>
                    <th className="teacher-section-roster__actions-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dedupedRoster.map((student) => {
                    const studentName =
                      `${student.firstName || ''} ${student.lastName || ''}`.trim() ||
                      'Unnamed Student';
                    const isBusy = busyStudentIds.includes(student.id);
                    const isSelected = selectedStudentIds.includes(student.id);

                    return (
                      <tr
                        key={student.id}
                        className="teacher-section-roster__row"
                        data-selected={isSelected}
                        onClick={() => handleRowOpen(student.id)}
                      >
                        <td
                          className="teacher-section-roster__checkbox-cell"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectStudent(student.id)}
                            aria-label={`Select ${studentName}`}
                          />
                        </td>
                        <td>
                          <div className="teacher-section-roster__student">
                            <Avatar className="h-8 w-8 border border-[var(--teacher-outline)]">
                              {student.profilePicture ? (
                                <AvatarImage src={student.profilePicture} alt={studentName} />
                              ) : null}
                              <AvatarFallback>
                                {getInitials(student.firstName, student.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <strong>{studentName}</strong>
                              <span>Open profile</span>
                            </div>
                          </div>
                        </td>
                        <td>{student.email || 'N/A'}</td>
                        <td>{student.lrn || 'N/A'}</td>
                        <td>{student.gradeLevel || 'N/A'}</td>
                        <td
                          className="teacher-section-roster__actions-cell"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="teacher-section-roster__remove-icon"
                            onClick={() => void handleRemoveStudent(student.id)}
                            disabled={isBusy}
                            aria-label={`Remove ${studentName}`}
                            title="Remove student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
