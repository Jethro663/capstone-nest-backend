'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarRange, GraduationCap, UserPlus, Users } from 'lucide-react';
import { sectionService, type RosterStudent } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { SectionScheduleViewer } from '@/components/shared/SectionScheduleViewer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeacherEmptyState, TeacherPageShell, TeacherSectionCard, TeacherStatCard } from '@/components/teacher/TeacherPageShell';
 
import type { Section } from '@/types/section';

export default function SectionRosterPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sectionRes, rosterRes] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getRoster(sectionId),
      ]);
      setSection(sectionRes.data);
      setRoster(rosterRes.data || []);
    } catch {
      // fail
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dedupedRoster = useMemo(() => {
    const seen = new Set<string>();
    return roster.filter((student) => {
      if (seen.has(student.id)) {
        return false;
      }
      seen.add(student.id);
      return true;
    });
  }, [roster]);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'ST';
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      await sectionService.removeStudent(sectionId, studentId);
      setRoster((current) => current.filter((student) => student.id !== studentId));
      toast.success('Student removed from section');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove student'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Section Roster"
      title={`${section?.name || 'Section'} Roster`}
      description="Keep your class list, meeting rhythm, and student access in one clearer section workspace."
      actions={(
        <>
          <Button variant="outline" size="sm" onClick={() => router.back()} className="teacher-button-outline rounded-xl font-black">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            size="sm"
            className="teacher-button-solid rounded-xl font-black"
            onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/students/add`)}
          >
            <UserPlus className="h-4 w-4" />
            Add Students
          </Button>
        </>
 
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Learners"
            value={dedupedRoster.length}
            caption="Students currently on the roster"
            icon={Users}
            accent="sky"
          />
          <TeacherStatCard
            label="Grade Level"
            value={section?.gradeLevel || 'â€”'}
            caption={section?.name || 'Section not set'}
            icon={GraduationCap}
            accent="teal"
          />
          <TeacherStatCard
            label="School Year"
            value={section?.schoolYear || 'â€”'}
            caption="Active section cycle"
            icon={CalendarRange}
            accent="amber"
          />
          <TeacherStatCard
            label="Roster Status"
            value={dedupedRoster.length > 0 ? 'Active' : 'Empty'}
            caption={dedupedRoster.length > 0 ? 'Students are ready to manage' : 'Add students to begin'}
            icon={Users}
            accent="rose"
          />
        </>
      )}
    >
      <TeacherSectionCard
        title="Roster Snapshot"
        description="A friendlier section overview so you can scan the schedule and roster without bouncing between plain tables."
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="teacher-dashboard-spotlight">
            <div className="space-y-3">
              <div className="teacher-dashboard-chip">Section Overview</div>
              <div className="space-y-2">
                <p className="text-3xl font-black tracking-tight text-[var(--teacher-text-strong)]">
                  {section?.name || 'Section'}
                </p>
                <p className="max-w-2xl text-sm leading-6 text-[var(--teacher-text-muted)]">
                  Grade {section?.gradeLevel || 'â€”'} â€¢ {section?.schoolYear || 'School year not set'}
                </p>
                <p className="max-w-2xl text-sm leading-6 text-[var(--teacher-text-muted)]">
                  Use this roster hub to keep student movement, section timing, and profile access easy to scan from one place.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="teacher-dashboard-mini-panel">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">Roster Count</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">{dedupedRoster.length}</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Unique learners enrolled in this section</p>
              </div>
            </div>
            <div className="teacher-dashboard-mini-panel">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">Student Profiles</p>
                <p className="mt-2 text-2xl font-black text-[var(--teacher-text-strong)]">Open</p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">Tap any row to open the student detail view</p>
              </div>
            </div>
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Section Schedule"
        description="The schedule grid below now uses the same timing math as the hour labels, so each class block lines up with the correct time row."
      >
        <SectionScheduleViewer sectionId={sectionId} theme="teacher" />
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Student Roster"
        description={`${dedupedRoster.length} learner${dedupedRoster.length === 1 ? '' : 's'} in this section`}
        action={(
          <Button
            size="sm"
            className="teacher-button-solid rounded-xl font-black"
            onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/students/add`)}
          >
            <UserPlus className="h-4 w-4" />
            Add Students
          </Button>
        )}
      >
        {dedupedRoster.length === 0 ? (
          <TeacherEmptyState
            title="No students in this section yet"
            description="Add students to start building the roster and unlock the section flow for this class group."
            action={(
              <Button
                size="sm"
                className="teacher-button-solid rounded-xl font-black"
                onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/students/add`)}
              >
                <UserPlus className="h-4 w-4" />
                Add Students
              </Button>
            )}
          />
        ) : (
          <div className="teacher-table-shell">
            <Table>
              <TableHeader>
                <TableRow className="teacher-table-head hover:bg-transparent">
                  <TableHead className="text-[var(--teacher-text-muted)]">#</TableHead>
                  <TableHead className="text-[var(--teacher-text-muted)]">Student</TableHead>
                  <TableHead className="text-[var(--teacher-text-muted)]">Email</TableHead>
                  <TableHead className="text-[var(--teacher-text-muted)]">LRN</TableHead>
                  <TableHead className="text-[var(--teacher-text-muted)]">Grade</TableHead>
                  <TableHead className="text-right text-[var(--teacher-text-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dedupedRoster.map((student, index) => (
                  <TableRow
                    key={student.id}
                    className="teacher-table-row cursor-pointer border-[var(--teacher-outline)] transition"
                    onClick={() =>
                      router.push(`/dashboard/teacher/sections/${sectionId}/students/${student.id}`)
                    }
                  >
                    <TableCell className="font-medium text-[var(--teacher-text-strong)]">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-left">
                        <Avatar className="h-9 w-9 border border-[var(--teacher-outline)]">
                          {student.profilePicture ? (
                            <AvatarImage
                              src={student.profilePicture}
                              alt={`${student.firstName || ''} ${student.lastName || ''}`.trim()}
                            />
                          ) : null}
                          <AvatarFallback className="bg-[var(--teacher-surface-soft)] text-[var(--teacher-text-strong)]">
                            {getInitials(student.firstName, student.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[var(--teacher-text-strong)]">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-[var(--teacher-text-muted)]">Open student profile</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--teacher-text-muted)]">{student.email || 'N/A'}</TableCell>
                    <TableCell className="text-[var(--teacher-text-muted)]">{student.lrn || 'â€”'}</TableCell>
                    <TableCell className="text-[var(--teacher-text-muted)]">{student.gradeLevel || 'â€”'}</TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="teacher-button-outline rounded-xl font-black"
                          onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/students/${student.id}`)}
                        >
                          View Profile
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="teacher-button-danger rounded-xl font-black"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}

