"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, School, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { TableFilterSelect } from "@/components/ui/table-filter-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SectionForm, {
  type SectionFormValues,
} from "@/components/admin/SectionForm";
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
} from "@/components/admin/AdminPageShell";
import { AdminLifecycleDialog } from "@/components/admin/AdminLifecycleDialog";
import { academicStateService } from "@/services/academic-state-service";
import { adminLifecycleService } from "@/services/admin-lifecycle-service";
import { sectionService, type RosterStudent } from "@/services/section-service";
import { userService } from "@/services/user-service";
import { getCurrentToFutureSchoolYears } from "@/lib/school-year";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";
import type { Section } from "@/types/section";
import type { User } from "@/types/user";
import type { AcademicPeriodKey } from "@/types/admin-lifecycle";
import { useAdminMaintenance } from "@/providers/AdminMaintenanceProvider";

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim()?.charAt(0) || "";
  const lastInitial = lastName?.trim()?.charAt(0) || "";
  return `${firstInitial}${lastInitial}`.toUpperCase() || "ST";
}

export default function EditSectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sectionId = params?.id;
  const { refresh: refreshMaintenance } = useAdminMaintenance();

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lifecycleStudent, setLifecycleStudent] =
    useState<RosterStudent | null>(null);
  const [destinationSectionId, setDestinationSectionId] = useState("");
  const [activePeriod, setActivePeriod] = useState<AcademicPeriodKey>("Q1");
  const [rosterQuery, setRosterQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const schoolYears = useMemo(() => getCurrentToFutureSchoolYears(4), []);
  const availableSchoolYears = useMemo(() => {
    if (!section?.schoolYear || schoolYears.includes(section.schoolYear)) {
      return schoolYears;
    }

    return [section.schoolYear, ...schoolYears];
  }, [schoolYears, section?.schoolYear]);

  const initialValues = useMemo<SectionFormValues>(() => {
    return {
      name: section?.name || "",
      gradeLevel: (section?.gradeLevel as "7" | "8" | "9" | "10") || "7",
      schoolYear: section?.schoolYear || schoolYears[0] || "",
      capacity: section?.capacity || 40,
      roomNumber: section?.roomNumber || "",
      adviserId: section?.adviserId || "",
    };
  }, [schoolYears, section]);

  const fetchData = useCallback(async () => {
    if (!sectionId) return;

    try {
      setLoading(true);
      const [
        sectionRes,
        rosterRes,
        teachersRes,
        sectionsRes,
        academicStateRes,
      ] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getRoster(sectionId),
        userService.getAll({ role: "teacher", limit: 200 }),
        sectionService.getAll({ limit: 100 }),
        academicStateService.getCurrent(),
      ]);

      setSection(sectionRes.data);
      setRoster(rosterRes.data || []);
      setTeachers(teachersRes.users || []);
      setAllSections(sectionsRes.data || []);
      setActivePeriod(academicStateRes.data.quarter as AcademicPeriodKey);
      setSelectedStudentIds([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load section details"));
      router.push("/dashboard/admin/sections");
    } finally {
      setLoading(false);
    }
  }, [router, sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const adviserDisabledReasonById = useMemo(() => {
    const byTeacher: Record<string, string> = {};

    for (const entry of allSections) {
      if (!entry.adviserId || !entry.isActive) continue;
      if (entry.id === sectionId) continue;
      if (byTeacher[entry.adviserId]) continue;
      byTeacher[entry.adviserId] =
        `Already assigned to Grade ${entry.gradeLevel} - ${entry.name}`;
    }

    return byTeacher;
  }, [allSections, sectionId]);
  const roomDisabledReasonByNumber = useMemo(() => {
    const byRoom: Record<string, string> = {};

    for (const entry of allSections) {
      const room = entry.roomNumber?.trim();
      if (!entry.isActive || !room) continue;
      if (entry.id === sectionId) continue;
      if (byRoom[room]) continue;
      byRoom[room] = `Assigned to Grade ${entry.gradeLevel} - ${entry.name}`;
    }

    return byRoom;
  }, [allSections, sectionId]);
  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          roster
            .map((student) => String(student.gradeLevel || ""))
            .filter(Boolean),
        ),
      ).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true }),
      ),
    [roster],
  );
  const visibleRoster = useMemo(() => {
    const query = rosterQuery.trim().toLocaleLowerCase();
    return roster.filter((student) => {
      const matchesQuery =
        !query ||
        [
          `${student.firstName || ""} ${student.lastName || ""}`,
          student.email || "",
          student.lrn || "",
        ].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesGrade =
        gradeFilter === "all" ||
        String(student.gradeLevel || "") === gradeFilter;
      return matchesQuery && matchesGrade;
    });
  }, [gradeFilter, roster, rosterQuery]);

  const handleSave = async (values: SectionFormValues) => {
    if (!sectionId) return;

    try {
      setSaving(true);
      await sectionService.update(sectionId, {
        name: values.name,
        gradeLevel: values.gradeLevel,
        schoolYear: values.schoolYear,
        capacity: values.capacity,
        roomNumber: values.roomNumber || undefined,
        adviserId: values.adviserId || undefined,
      });
      toast.success("Section updated");
      fetchData();
    } catch (error) {
      await refreshMaintenance();
      toast.error(getApiErrorMessage(error, "Failed to update section"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAll = () => {
    const visibleIds = visibleRoster.map((student) => student.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedStudentIds.includes(id));
    if (allVisibleSelected) {
      setSelectedStudentIds((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );
      return;
    }

    setSelectedStudentIds((current) =>
      Array.from(new Set([...current, ...visibleIds])),
    );
  };

  const handleToggleOne = (studentId: string) => {
    setSelectedStudentIds((previous) =>
      previous.includes(studentId)
        ? previous.filter((id) => id !== studentId)
        : [...previous, studentId],
    );
  };

  const handleRemoveSelected = () => {
    if (!sectionId || selectedStudentIds.length === 0) return;
    const next = roster.find((student) => student.id === selectedStudentIds[0]);
    if (!next) return;
    setDestinationSectionId("");
    setLifecycleStudent(next);
    toast.info(
      `${selectedStudentIds.length} selected. Review begins with ${next.firstName} ${next.lastName}; failed or unreviewed learners stay selected.`,
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-[1.25rem]" />
        <Skeleton className="h-[24rem] rounded-[1.35rem]" />
        <Skeleton className="h-[24rem] rounded-[1.35rem]" />
      </div>
    );
  }

  if (!section) {
    return null;
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title={`Edit ${section.name}`}
      description="Update section settings and manage the roster from a tighter admin workspace."
      icon={School}
      variant="compact-form"
      actions={
        <>
          <Button
            variant="outline"
            className="admin-button-outline rounded-xl font-black"
            onClick={() => router.push("/dashboard/admin/sections")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sections
          </Button>
          <Button
            className="admin-button-solid rounded-xl font-black"
            onClick={() =>
              router.push(`/dashboard/admin/sections/${sectionId}/students/add`)
            }
          >
            <UserPlus className="h-4 w-4" />
            Add Students
          </Button>
        </>
      }
      meta={
        <>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Grade Level</span>
            Grade {section.gradeLevel}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Enrolled</span>
            {roster.length} / {section.capacity || "-"}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Selected</span>
            {selectedStudentIds.length}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">School Year</span>
            {section.schoolYear || "-"}
          </div>
        </>
      }
    >
      <AdminSectionCard
        title="Section Information"
        description="Adjust the section basics without the extra visual weight."
        density="compact"
      >
        <SectionForm
          initialValues={initialValues}
          teachers={teachers}
          adviserDisabledReasonById={adviserDisabledReasonById}
          roomDisabledReasonByNumber={roomDisabledReasonByNumber}
          schoolYears={availableSchoolYears}
          saving={saving}
          submitLabel="Save Changes"
          onSubmit={handleSave}
          onCancel={() => router.push("/dashboard/admin/sections")}
        />
      </AdminSectionCard>

      <AdminSectionCard
        title={`Students (${roster.length})`}
        description="Resolve selected learner memberships one at a time so failures remain selected and completed work cannot be duplicated."
        density="compact"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="admin-button-outline rounded-xl font-black"
              onClick={handleToggleAll}
            >
              {visibleRoster.length > 0 &&
              visibleRoster.every((student) =>
                selectedStudentIds.includes(student.id),
              )
                ? "Clear Selection"
                : "Select All"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50"
              disabled={selectedStudentIds.length === 0}
              onClick={handleRemoveSelected}
            >
              Resolve Selected ({selectedStudentIds.length})
            </Button>
          </div>
        }
      >
        {roster.length === 0 ? (
          <AdminEmptyState
            title="No students enrolled yet"
            description="This section is ready, but no roster entries have been assigned yet. Add students when you are ready to populate the class."
            action={
              <Button
                className="admin-button-solid rounded-xl font-black"
                onClick={() =>
                  router.push(
                    `/dashboard/admin/sections/${sectionId}/students/add`,
                  )
                }
              >
                <UserPlus className="h-4 w-4" />
                Add Students
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <Input
                type="search"
                aria-label="Search section roster"
                placeholder="Search name, email, or LRN"
                value={rosterQuery}
                onChange={(event) => setRosterQuery(event.target.value)}
                className="admin-input"
              />
              <TableFilterSelect
                ariaLabel="Filter roster by grade"
                value={gradeFilter}
                onValueChange={setGradeFilter}
                options={[
                  { value: "all", label: "All grade levels" },
                  ...gradeOptions.map((grade) => ({
                    value: String(grade),
                    label: `Grade ${grade}`,
                  })),
                ]}
                role="admin"
                className="w-full md:w-[13rem]"
              />
            </div>
            <p
              className="text-sm text-[var(--admin-text-muted)]"
              aria-live="polite"
            >
              Showing {visibleRoster.length} of {roster.length} students
            </p>
            {visibleRoster.length === 0 ? (
              <AdminEmptyState
                title="No students match these controls"
                description="Clear the search or choose another grade level."
              />
            ) : (
              <div className="admin-table-shell">
                <Table>
                  <TableHeader className="admin-table-head">
                    <TableRow>
                      <TableHead className="w-14">Select</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>LRN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRoster.map((student) => (
                      <TableRow
                        key={student.id}
                        className="transition-colors duration-200 hover:bg-emerald-50/45"
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => handleToggleOne(student.id)}
                            className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/admin/users/${student.id}`,
                              )
                            }
                            className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-emerald-50/70"
                          >
                            <Avatar className="h-9 w-9 border border-white/70 shadow-sm">
                              <AvatarImage
                                src={
                                  (student as User).profilePicture as
                                    | string
                                    | undefined
                                }
                                alt={`${student.firstName || ""} ${student.lastName || ""}`.trim()}
                              />
                              <AvatarFallback>
                                {getInitials(
                                  student.firstName,
                                  student.lastName,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-[var(--admin-text-strong)]">
                              {student.firstName} {student.lastName}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.email || "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.gradeLevel || "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.lrn || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </AdminSectionCard>

      {lifecycleStudent ? (
        <AdminLifecycleDialog
          open
          onOpenChange={(open) => !open && setLifecycleStudent(null)}
          title="Resolve selected membership"
          description="Choose the outcome for this learner. Each completed learner is removed from the selection; failures and unreviewed learners remain selected."
          targetLabel={`${lifecycleStudent.firstName} ${lifecycleStudent.lastName}`}
          intents={[
            {
              value: "CORRECT_ENROLLMENT",
              label: "Correct erroneous enrollment",
              description:
                "Close a mistaken membership and retain the correction event.",
            },
            {
              value: "WITHDRAW",
              label: "Withdraw from school",
              description:
                "Close current memberships while preserving submitted academic work.",
            },
            {
              value: "TRANSFER_SECTION",
              label: "Transfer to another section",
              description:
                "Create compatible destination memberships before closing the source.",
            },
          ]}
          renderIntentFields={(intent) =>
            intent === "TRANSFER_SECTION" ? (
              <select
                aria-label="Destination section"
                value={destinationSectionId}
                onChange={(event) =>
                  setDestinationSectionId(event.target.value)
                }
                className="admin-select mt-3 w-full"
              >
                <option value="">Choose destination section</option>
                {allSections
                  .filter(
                    (entry) =>
                      entry.id !== sectionId &&
                      entry.isActive &&
                      entry.schoolYear === section.schoolYear &&
                      entry.gradeLevel === section.gradeLevel,
                  )
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
              </select>
            ) : null
          }
          canPreview={(intent) =>
            intent !== "TRANSFER_SECTION" || Boolean(destinationSectionId)
          }
          preview={async (intent) =>
            (
              await adminLifecycleService.previewStudent({
                studentId: lifecycleStudent.id,
                sectionId,
                resolution: intent as
                  | "CORRECT_ENROLLMENT"
                  | "WITHDRAW"
                  | "TRANSFER_SECTION",
                destinationSectionId:
                  intent === "TRANSFER_SECTION"
                    ? destinationSectionId
                    : undefined,
                effectivePeriod: activePeriod,
              })
            ).data
          }
          execute={async (intent, evidence) =>
            (
              await adminLifecycleService.executeStudent({
                studentId: lifecycleStudent.id,
                sectionId,
                resolution: intent as
                  | "CORRECT_ENROLLMENT"
                  | "WITHDRAW"
                  | "TRANSFER_SECTION",
                destinationSectionId:
                  intent === "TRANSFER_SECTION"
                    ? destinationSectionId
                    : undefined,
                effectivePeriod: activePeriod,
                ...evidence,
              })
            ).data
          }
          onCompleted={() => {
            setSelectedStudentIds((current) =>
              current.filter((id) => id !== lifecycleStudent.id),
            );
            setRoster((current) =>
              current.filter((student) => student.id !== lifecycleStudent.id),
            );
          }}
        />
      ) : null}
    </AdminPageShell>
  );
}
