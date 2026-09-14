"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  ChevronDown,
  Eye,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  type BulkClassLifecycleAction,
  classService,
} from "@/services/class-service";
import { academicStateService } from "@/services/academic-state-service";
import { adminLifecycleService } from "@/services/admin-lifecycle-service";
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
} from "@/components/admin/AdminPageShell";
import { AdminLifecycleDialog } from "@/components/admin/AdminLifecycleDialog";
import { AdminErasureBatchDialog } from "@/components/admin/AdminErasureBatchDialog";
import {
  ConfirmationDialog,
  type ConfirmationDialogConfig,
} from "@/components/shared/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { ClassItem } from "@/types/class";
import type {
  AcademicPeriodKey,
  ClassLifecycleResolution,
} from "@/types/admin-lifecycle";
import { useAdminMaintenance } from "@/providers/AdminMaintenanceProvider";
import { hasAdminMaintenanceRule } from "@/types/admin-maintenance";
import { getApiErrorMessage } from "@/lib/api-error";

type StatusTab = "active" | "archived";

interface BulkActionOption {
  action: BulkClassLifecycleAction;
  label: string;
  confirmLabel: string;
  title: string;
  description: string;
  tone: "danger";
}

function formatSchedules(
  schedules?: { days: string[]; startTime: string; endTime: string }[],
) {
  if (!schedules?.length) return "N/A";
  return schedules
    .map(
      (schedule) =>
        `${schedule.days.join("/")} ${schedule.startTime}-${schedule.endTime}`,
    )
    .join(", ");
}

function getBulkActions(tab: StatusTab): BulkActionOption[] {
  if (tab === "archived") {
    return [
      {
        action: "purge",
        label: "Purge selected",
        confirmLabel: "Purge classes",
        title: "Permanently delete selected classes?",
        description:
          "Review each selected archived class before permanent deletion.",
        tone: "danger",
      },
    ];
  }

  return [
    {
      action: "archive",
      label: "Archive selected",
      confirmLabel: "Archive classes",
      title: "Archive selected classes?",
      description:
        "Review each class, choose the learner outcome, and preserve teacher ownership and academic history.",
      tone: "danger",
    },
  ];
}

export default function ClassManagementPage() {
  const router = useRouter();
  const { status: maintenanceStatus, refresh: refreshMaintenance } =
    useAdminMaintenance();
  const canRestoreArchivedClass = hasAdminMaintenanceRule(
    maintenanceStatus,
    "restore_archived_class",
  );
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tab, setTab] = useState<StatusTab>("active");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [schoolYearFilter, setSchoolYearFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [lifecycleTarget, setLifecycleTarget] = useState<ClassItem | null>(
    null,
  );
  const [erasureTargets, setErasureTargets] = useState<ClassItem[]>([]);
  const [replacementClassId, setReplacementClassId] = useState("");
  const [activePeriod, setActivePeriod] = useState<AcademicPeriodKey>("Q1");
  const [currentSchoolYear, setCurrentSchoolYear] = useState("");
  const [lifecyclePeriod, setLifecyclePeriod] = useState<
    AcademicPeriodKey | ""
  >("");
  const [confirmation, setConfirmation] =
    useState<ConfirmationDialogConfig | null>(null);

  const fetchData = useCallback(async (mode: "initial" | "table") => {
    try {
      if (mode === "initial") {
        setInitialLoading(true);
      } else {
        setTableLoading(true);
      }

      const [classesRes, academicStateRes] = await Promise.all([
        classService.getAll({ limit: 100 }),
        academicStateService.getCurrent(),
      ]);
      setClasses(classesRes.data?.data || []);
      setActivePeriod(academicStateRes.data.quarter as AcademicPeriodKey);
      setCurrentSchoolYear(academicStateRes.data.schoolYear);
    } catch {
      toast.error("Failed to load classes");
    } finally {
      if (mode === "initial") {
        setInitialLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData("initial");
  }, [fetchData]);

  const activeCount = useMemo(
    () => classes.filter((classItem) => classItem.isActive).length,
    [classes],
  );
  const archivedCount = useMemo(
    () => classes.filter((classItem) => !classItem.isActive).length,
    [classes],
  );
  const schoolYearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          classes
            .map((classItem) => classItem.schoolYear)
            .filter((schoolYear): schoolYear is string => Boolean(schoolYear)),
        ),
      ).sort((left, right) => right.localeCompare(left)),
    [classes],
  );

  const filtered = useMemo(
    () =>
      classes.filter((classItem) => {
        if (tab === "active" && !classItem.isActive) return false;
        if (tab === "archived" && classItem.isActive) return false;
        if (
          gradeFilter !== "all" &&
          classItem.subjectGradeLevel !== gradeFilter
        ) {
          return false;
        }
        if (
          schoolYearFilter !== "all" &&
          classItem.schoolYear !== schoolYearFilter
        ) {
          return false;
        }
        if (!search) return true;

        const query = search.toLowerCase();
        return (
          classItem.subjectName?.toLowerCase().includes(query) ||
          classItem.subjectCode?.toLowerCase().includes(query) ||
          classItem.section?.name?.toLowerCase().includes(query) ||
          classItem.teacher?.firstName?.toLowerCase().includes(query) ||
          classItem.teacher?.lastName?.toLowerCase().includes(query) ||
          classItem.room?.toLowerCase().includes(query)
        );
      }),
    [classes, gradeFilter, schoolYearFilter, search, tab],
  );

  const selectableVisibleIds = useMemo(
    () => filtered.map((classItem) => classItem.id),
    [filtered],
  );

  useEffect(() => {
    const visibleSet = new Set(selectableVisibleIds);
    setSelectedClassIds((current) =>
      current.filter((id) => visibleSet.has(id)),
    );
  }, [selectableVisibleIds]);

  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedClassIds.includes(id));

  const bulkActions = useMemo(() => getBulkActions(tab), [tab]);
  const selectedClasses = useMemo(
    () =>
      filtered.filter((classItem) => selectedClassIds.includes(classItem.id)),
    [filtered, selectedClassIds],
  );

  const refreshTable = useCallback(async () => {
    await fetchData("table");
  }, [fetchData]);

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((current) => {
      if (current.includes(classId)) {
        return current.filter((id) => id !== classId);
      }
      if (current.length >= 50) {
        toast.error("A permanent-deletion batch can contain up to 50 classes.");
        return current;
      }
      return [...current, classId];
    });
  };

  const handleSelectAllVisible = () => {
    if (!allVisibleSelected && selectableVisibleIds.length > 50) {
      toast.info("Selected the first 50 visible classes, the batch limit.");
    }
    setSelectedClassIds(
      allVisibleSelected ? [] : selectableVisibleIds.slice(0, 50),
    );
  };

  const openSingleActionConfirmation = (classItem: ClassItem) => {
    setReplacementClassId("");
    setLifecyclePeriod("");
    setLifecycleTarget(classItem);
  };

  const openRestoreConfirmation = (classItem: ClassItem) => {
    setConfirmation({
      title: "Restore archived class?",
      description:
        "Maintenance Access permits this reversible lifecycle exception. Permanent evidence safeguards remain active.",
      confirmLabel: "Restore class",
      tone: "default",
      onConfirm: async () => {
        try {
          await classService.toggleStatus(classItem.id);
          toast.success("Class restored");
          await refreshTable();
        } catch (error) {
          await refreshMaintenance();
          toast.error(getApiErrorMessage(error, "Failed to restore class"));
        }
      },
    });
  };

  const openBulkConfirmation = (option: BulkActionOption) => {
    if (selectedClasses.length === 0) return;
    if (option.action === "purge") {
      setErasureTargets(selectedClasses);
      return;
    }
    openSingleActionConfirmation(selectedClasses[0]);
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[34rem] rounded-[1.7rem]" />
      </div>
    );
  }

  const historicalLifecycleTarget = Boolean(
    lifecycleTarget?.isActive &&
    currentSchoolYear &&
    lifecycleTarget.schoolYear !== currentSchoolYear,
  );

  return (
    <AdminPageShell
      title="Classes"
      description="Manage all classes across grades"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="admin-button-outline rounded-[1rem] px-4 font-bold"
            onClick={() => router.push("/dashboard/admin/class-templates")}
          >
            Template Classes
          </Button>
          <Button
            className="admin-button-solid rounded-[1rem] px-4 font-bold"
            onClick={() => router.push("/dashboard/admin/classes/new")}
          >
            <BookOpen className="h-4 w-4" />
            Create Class
          </Button>
        </div>
      }
    >
      <AdminSectionCard title="Class Directory" contentClassName="space-y-5">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as StatusTab);
            setSearch("");
            setGradeFilter("all");
            setSchoolYearFilter("all");
            setSelectedClassIds([]);
          }}
          className="space-y-5"
        >
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="active" className="admin-tab">
              Active <span className="admin-segment-count">{activeCount}</span>
            </TabsTrigger>
            <TabsTrigger value="archived" className="admin-tab">
              Archived{" "}
              <span className="admin-segment-count">{archivedCount}</span>
            </TabsTrigger>
          </TabsList>

          <div className="admin-filter-row">
            <div className="admin-search-shell min-w-[18rem] flex-1 md:max-w-[20rem]">
              <Search className="h-4 w-4 text-[#8ea0bc]" />
              <Input
                placeholder="Search classes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-controls">
              <div className="relative">
                <select
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
                  className="admin-select min-w-[9rem] appearance-none pr-10 text-sm font-semibold text-[#6f83a3]"
                >
                  <option value="all">All Grades</option>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>
              <div className="relative">
                <select
                  value={schoolYearFilter}
                  onChange={(event) => setSchoolYearFilter(event.target.value)}
                  className="admin-select min-w-[10rem] appearance-none pr-10 text-sm font-semibold text-[#6f83a3]"
                >
                  <option value="all">All School Years</option>
                  {schoolYearOptions.map((schoolYear) => (
                    <option key={schoolYear} value={schoolYear}>
                      {schoolYear}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>
              {gradeFilter !== "all" ? (
                <span className="admin-filter-badge">Grade {gradeFilter}</span>
              ) : null}
              {schoolYearFilter !== "all" ? (
                <span className="admin-filter-badge">
                  SY {schoolYearFilter}
                </span>
              ) : null}
            </div>
          </div>
        </Tabs>

        {filtered.length > 0 ? (
          <div className="admin-bulk-bar">
            <div className="admin-controls">
              <span className="admin-pill">
                {selectedClassIds.length} selected
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="admin-button-outline rounded-[1rem] px-4 font-bold"
                onClick={handleSelectAllVisible}
                disabled={selectableVisibleIds.length === 0}
              >
                {allVisibleSelected
                  ? "Clear visible selection"
                  : "Select all visible"}
              </Button>
            </div>
            <div className="admin-controls">
              {bulkActions.map((option) => (
                <Button
                  key={option.action}
                  type="button"
                  variant={option.tone === "danger" ? "destructive" : "outline"}
                  size="sm"
                  className={
                    option.tone === "danger"
                      ? "rounded-[1rem] px-4 font-bold"
                      : "admin-button-outline rounded-[1rem] px-4 font-bold"
                  }
                  onClick={() => openBulkConfirmation(option)}
                  disabled={selectedClassIds.length === 0}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <AdminEmptyState
            title="No classes found"
            description="Try another state or a different search query."
          />
        ) : (
          <div
            className={`admin-table-shell${tableLoading ? " admin-table-shell--loading" : ""}`}
          >
            {tableLoading ? (
              <div className="admin-table-loading">Refreshing classes...</div>
            ) : null}
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead className="w-[6rem]">Select</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>School Year</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((classItem) => {
                  const isSelected = selectedClassIds.includes(classItem.id);
                  const classPath = `/dashboard/admin/classes/${classItem.id}`;
                  const archiveOption = bulkActions.find(
                    (option) => option.action === "archive",
                  );

                  return (
                    <TableRow
                      key={classItem.id}
                      className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]"
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          role="checkbox"
                          aria-label={`Select class ${classItem.subjectName}`}
                          className="admin-row-checkbox"
                          checked={isSelected}
                          onChange={() => toggleClassSelection(classItem.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link font-semibold text-[var(--admin-text-strong)]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.subjectName}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.section?.name || "N/A"}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link"
                        onClick={() => router.push(classPath)}
                      >
                        <span className="admin-role-pill admin-role-pill--teacher">
                          Grade {classItem.subjectGradeLevel}
                        </span>
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#9aaed0]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.schoolYear}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.teacher
                          ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                          : "Unassigned"}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#9aaed0]"
                        onClick={() => router.push(classPath)}
                      >
                        {formatSchedules(classItem.schedules)}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.room || "N/A"}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link"
                        onClick={() => router.push(classPath)}
                      >
                        <span
                          className={
                            classItem.isActive
                              ? "admin-status-pill admin-status-pill--active"
                              : "admin-status-pill admin-status-pill--archived"
                          }
                        >
                          {classItem.isActive ? "Active" : "Archived"}
                        </span>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => router.push(classPath)}
                            title="View class"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() =>
                              router.push(
                                `/dashboard/admin/classes/${classItem.id}/edit`,
                              )
                            }
                            title="Edit class"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {classItem.isActive && archiveOption ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() =>
                                openSingleActionConfirmation(classItem)
                              }
                              title="Archive class"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!classItem.isActive ? (
                            <>
                              {canRestoreArchivedClass ? (
                                <button
                                  type="button"
                                  className="admin-icon-button"
                                  onClick={() =>
                                    openRestoreConfirmation(classItem)
                                  }
                                  title="Restore class"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="admin-icon-button"
                                onClick={() => {
                                  setReplacementClassId("");
                                  setErasureTargets([classItem]);
                                }}
                                title="Purge class"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSectionCard>

      {lifecycleTarget ? (
        <AdminLifecycleDialog
          open
          onOpenChange={(open) => !open && setLifecycleTarget(null)}
          title={
            lifecycleTarget.isActive
              ? historicalLifecycleTarget
                ? "Retire historical class safely"
                : "Archive class with a learner outcome"
              : "Permanently delete archived class"
          }
          description={
            lifecycleTarget.isActive
              ? historicalLifecycleTarget
                ? `This class belongs to ${lifecycleTarget.schoolYear}. Choose how any active memberships ended, then preserve its academic history.`
                : "Only this class is evaluated. Section-only and sibling-class memberships are left unchanged."
              : "Deletion is allowed only when the archived class has no retained academic or lifecycle evidence."
          }
          targetLabel={`${lifecycleTarget.subjectName} (${lifecycleTarget.subjectCode})`}
          permanent={!lifecycleTarget.isActive}
          intents={
            lifecycleTarget.isActive
              ? [
                  {
                    value: "ARCHIVE_EMPTY",
                    label: "Archive empty class",
                    description:
                      "Use when this class has no active learner memberships.",
                  },
                  {
                    value: "COMPLETE",
                    label: "Complete memberships",
                    description:
                      "Mark active class memberships completed and preserve all evidence.",
                  },
                  {
                    value: "DROP",
                    label: "Drop memberships",
                    description:
                      "Close active class memberships as withdrawals.",
                  },
                  {
                    value: "TRANSFER",
                    label: "Transfer to replacement class",
                    description:
                      "Create compatible replacement memberships before archiving.",
                  },
                ]
              : [
                  {
                    value: "PURGE",
                    label: "Permanently delete empty record",
                    description:
                      "There is no override when retained evidence exists.",
                  },
                ]
          }
          renderIntentFields={(intent) => (
            <div className="mt-3 space-y-3">
              {historicalLifecycleTarget ? (
                <label className="block space-y-2 text-sm font-semibold text-[var(--admin-text-strong)]">
                  Historical period when memberships ended
                  <select
                    aria-label="Historical lifecycle period"
                    value={lifecyclePeriod}
                    onChange={(event) =>
                      setLifecyclePeriod(
                        event.target.value as AcademicPeriodKey | "",
                      )
                    }
                    className="admin-select w-full font-normal"
                  >
                    <option value="">Choose historical period</option>
                    {(["Q1", "Q2", "Q3", "Q4"] as const).map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {intent === "TRANSFER" ? (
                <select
                  aria-label="Replacement class"
                  value={replacementClassId}
                  onChange={(event) =>
                    setReplacementClassId(event.target.value)
                  }
                  className="admin-select w-full"
                >
                  <option value="">Choose replacement class</option>
                  {classes
                    .filter(
                      (entry) =>
                        entry.id !== lifecycleTarget.id &&
                        entry.isActive &&
                        entry.sectionId === lifecycleTarget.sectionId &&
                        entry.schoolYear === lifecycleTarget.schoolYear &&
                        entry.subjectCode.trim().toUpperCase() ===
                          lifecycleTarget.subjectCode.trim().toUpperCase(),
                    )
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.subjectName} ·{" "}
                        {entry.section?.name ?? "No section"}
                      </option>
                    ))}
                </select>
              ) : null}
            </div>
          )}
          canPreview={(intent) =>
            (!historicalLifecycleTarget || Boolean(lifecyclePeriod)) &&
            (intent !== "TRANSFER" || Boolean(replacementClassId))
          }
          previewInputKey={JSON.stringify({
            lifecycleMode: historicalLifecycleTarget
              ? "HISTORICAL_RETIREMENT"
              : "CURRENT_CLOSURE",
            lifecyclePeriod,
            replacementClassId,
          })}
          preview={async (intent) =>
            lifecycleTarget.isActive
              ? (
                  await adminLifecycleService.previewClass({
                    classId: lifecycleTarget.id,
                    lifecycleMode: historicalLifecycleTarget
                      ? "HISTORICAL_RETIREMENT"
                      : "CURRENT_CLOSURE",
                    resolution: intent as ClassLifecycleResolution,
                    replacementClassId:
                      intent === "TRANSFER" ? replacementClassId : undefined,
                    effectivePeriod: historicalLifecycleTarget
                      ? lifecyclePeriod || undefined
                      : activePeriod,
                  })
                ).data
              : (
                  await adminLifecycleService.previewPurge({
                    targetType: "CLASS",
                    targetId: lifecycleTarget.id,
                  })
                ).data
          }
          execute={async (intent, evidence) =>
            lifecycleTarget.isActive
              ? (
                  await adminLifecycleService.executeClass({
                    classId: lifecycleTarget.id,
                    lifecycleMode: historicalLifecycleTarget
                      ? "HISTORICAL_RETIREMENT"
                      : "CURRENT_CLOSURE",
                    resolution: intent as ClassLifecycleResolution,
                    replacementClassId:
                      intent === "TRANSFER" ? replacementClassId : undefined,
                    effectivePeriod: historicalLifecycleTarget
                      ? lifecyclePeriod || undefined
                      : activePeriod,
                    ...evidence,
                  })
                ).data
              : (
                  await adminLifecycleService.executePurge({
                    targetType: "CLASS",
                    targetId: lifecycleTarget.id,
                    ...evidence,
                  })
                ).data
          }
          onCompleted={async () => {
            toast.success(
              lifecycleTarget.isActive
                ? "Class archived"
                : "Class permanently deleted",
            );
            setSelectedClassIds((current) =>
              current.filter((id) => id !== lifecycleTarget.id),
            );
            await refreshTable();
          }}
        />
      ) : null}
      {erasureTargets.length > 0 ? (
        <AdminErasureBatchDialog
          open
          onOpenChange={(open) => !open && setErasureTargets([])}
          targetType="CLASS"
          targetIds={erasureTargets.map((target) => target.id)}
          targetLabel={
            erasureTargets.length === 1
              ? `${erasureTargets[0].subjectName} (${erasureTargets[0].subjectCode})`
              : `${erasureTargets.length} archived classes`
          }
          preview={async (input) =>
            (await adminLifecycleService.previewPurgeBatch(input)).data
          }
          execute={async (input) =>
            (await adminLifecycleService.executePurgeBatch(input)).data
          }
          onCompleted={async (result) => {
            toast.success(
              `${result.deletedCount} class${result.deletedCount === 1 ? "" : "es"} permanently deleted`,
            );
            setSelectedClassIds((current) =>
              current.filter((id) => !result.targetIds.includes(id)),
            );
            await refreshTable();
          }}
        />
      ) : null}
      <ConfirmationDialog
        config={confirmation}
        onClose={() => setConfirmation(null)}
      />
    </AdminPageShell>
  );
}
