"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeSubjectCodeInput } from "@/lib/input-policy";
import { ROOM_OPTIONS, ROOM_OPTIONS_HELP_TEXT } from "@/lib/room-options";
import { toast } from "sonner";
import { classService } from "@/services/class-service";
import {
  ScheduleCalendarCreator,
  type ExistingScheduleSlot,
  type ScheduleSlot,
} from "@/components/admin/ScheduleCalendarCreator";
import type { ClassItem } from "@/types/class";
import type { ClassTemplate } from "@/types/class-template";
import type { Section } from "@/types/section";
import type { User } from "@/types/user";

const SUBJECTS = [
  "Science",
  "Araling Panlipunan",
  "Mathematics",
  "English",
  "Fili",
  "TLE",
  "Values",
  "MAPEH",
] as const;

const SELECT_CLS =
  "admin-select flex h-10 w-full rounded-xl px-3.5 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

const DEFAULT_GRADING_PROFILE = {
  writtenWork: 30,
  performanceTask: 50,
  quarterlyAssessment: 20,
} as const;

const GRADING_FIELDS = [
  { key: "writtenWork", label: "Written Works" },
  { key: "performanceTask", label: "Performance Tasks" },
  { key: "quarterlyAssessment", label: "Quarterly Assessment" },
] as const;

type GradingProfile = {
  writtenWork: number;
  performanceTask: number;
  quarterlyAssessment: number;
};

type GradingProfileDraft = {
  writtenWork: string;
  performanceTask: string;
  quarterlyAssessment: string;
};

function normalizeGradingInput(rawValue: string): number | string | null {
  if (rawValue === "") {
    return "";
  }

  if (!/^[0-9]*$/.test(rawValue)) {
    return null;
  }

  if (rawValue.length > 2) {
    return null;
  }

  if (rawValue.length === 2 && rawValue[0] === "0") {
    return Number(rawValue[1]);
  }

  if (rawValue === "0") {
    return 0;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) && Number.isInteger(value) ? value : null;
}

function normalizeSubjectKey(value: string) {
  return value.trim().toLowerCase();
}

function getTeacherDisplayName(
  teacher: Pick<User, "firstName" | "lastName" | "email">,
) {
  const fullName =
    `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
  return fullName || teacher.email || "Unnamed Teacher";
}

export type ClassFormValues = {
  academicWeightProfile?: "academic" | "practical";
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel: string;
  sectionId: string;
  teacherId: string;
  schoolYear: string;
  room: string;
  gradingProfile: GradingProfile;
  schedules: ScheduleSlot[];
};

export function createEmptyClassForm(
  defaultSchoolYear: string,
): ClassFormValues {
  return {
    subjectName: "",
    subjectCode: "",
    subjectGradeLevel: "7",
    sectionId: "",
    teacherId: "",
    schoolYear: defaultSchoolYear,
    room: "",
    gradingProfile: { ...DEFAULT_GRADING_PROFILE },
    schedules: [],
  };
}

type ClassFormProps = {
  initialValues: ClassFormValues;
  sections: Section[];
  teachers: User[];
  schoolYears: string[];
  lockSchoolYear?: boolean;
  saving?: boolean;
  onSubmit: (values: ClassFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  editingClassId?: string;
  templateOptions?: ClassTemplate[];
  selectedTemplateId?: string;
  templatesLoading?: boolean;
  onTemplateChange?: (templateId: string) => void;
  onValuesChange?: (values: ClassFormValues) => void;
  showGradingProfile?: boolean;
};

export default function ClassForm({
  initialValues,
  sections,
  teachers,
  schoolYears,
  lockSchoolYear = false,
  saving = false,
  onSubmit,
  onCancel,
  submitLabel,
  editingClassId,
  templateOptions = [],
  selectedTemplateId = "",
  templatesLoading = false,
  onTemplateChange,
  onValuesChange,
  showGradingProfile = false,
}: ClassFormProps) {
  const [form, setForm] = useState<ClassFormValues>(initialValues);
  const [existingSlots, setExistingSlots] = useState<ExistingScheduleSlot[]>(
    [],
  );
  const [sectionAssignments, setSectionAssignments] = useState<ClassItem[]>([]);
  const [loadingSectionAssignments, setLoadingSectionAssignments] =
    useState(false);
  const [loadingSection, setLoadingSection] = useState(false);
  const [gradingProfile, setGradingProfile] = useState<GradingProfile>(
    DEFAULT_GRADING_PROFILE,
  );
  const [gradingProfileDraft, setGradingProfileDraft] =
    useState<GradingProfileDraft>({
      writtenWork: String(DEFAULT_GRADING_PROFILE.writtenWork),
      performanceTask: String(DEFAULT_GRADING_PROFILE.performanceTask),
      quarterlyAssessment: String(DEFAULT_GRADING_PROFILE.quarterlyAssessment),
    });
  const [isEditingGrading, setIsEditingGrading] = useState(false);

  useEffect(() => {
    setForm(initialValues);
    const safeProfile = initialValues.gradingProfile ?? DEFAULT_GRADING_PROFILE;
    setGradingProfile({
      writtenWork:
        Number(safeProfile.writtenWork) || DEFAULT_GRADING_PROFILE.writtenWork,
      performanceTask:
        Number(safeProfile.performanceTask) ||
        DEFAULT_GRADING_PROFILE.performanceTask,
      quarterlyAssessment:
        Number(safeProfile.quarterlyAssessment) ||
        DEFAULT_GRADING_PROFILE.quarterlyAssessment,
    });
    setGradingProfileDraft({
      writtenWork: String(
        Number(safeProfile.writtenWork) || DEFAULT_GRADING_PROFILE.writtenWork,
      ),
      performanceTask: String(
        Number(safeProfile.performanceTask) ||
          DEFAULT_GRADING_PROFILE.performanceTask,
      ),
      quarterlyAssessment: String(
        Number(safeProfile.quarterlyAssessment) ||
          DEFAULT_GRADING_PROFILE.quarterlyAssessment,
      ),
    });
    setIsEditingGrading(false);
  }, [initialValues]);

  useEffect(() => {
    onValuesChange?.({
      ...form,
      gradingProfile,
    });
  }, [form, gradingProfile, onValuesChange]);

  const setField = (field: keyof ClassFormValues, value: string) => {
    let nextValue = value;
    if (field === "subjectCode") {
      nextValue = sanitizeSubjectCodeInput(value, 20);
    }

    setForm((current) => ({ ...current, [field]: nextValue }));
  };

  const handleGradeLevelChange = (value: string) => {
    const currentSection = sections.find((s) => s.id === form.sectionId);
    const nextSectionId =
      currentSection?.gradeLevel === value ? currentSection.id : "";
    const nextSectionRoom =
      sections
        .find((section) => section.id === nextSectionId)
        ?.roomNumber?.trim() ?? "";

    setForm((current) => ({
      ...current,
      subjectGradeLevel: value,
      sectionId: nextSectionId,
      room: nextSectionRoom,
      schedules: [],
    }));
    setExistingSlots([]);
    onTemplateChange?.("");
  };

  const handleSubjectNameChange = (value: string) => {
    setField("subjectName", value);
    onTemplateChange?.("");
  };

  const handleSectionChange = (sectionId: string) => {
    const selectedSection = sections.find(
      (section) => section.id === sectionId,
    );
    const sectionRoom = selectedSection?.roomNumber?.trim() ?? "";
    setForm((current) => ({
      ...current,
      sectionId,
      room: sectionRoom,
      schedules: [],
    }));
    setExistingSlots([]);
  };

  const filteredSections = form.subjectGradeLevel
    ? sections.filter((s) => s.gradeLevel === form.subjectGradeLevel)
    : [];
  const selectedSection = useMemo(
    () => sections.find((section) => section.id === form.sectionId),
    [form.sectionId, sections],
  );
  useEffect(() => {
    let mounted = true;

    if (!form.sectionId || !form.schoolYear) {
      setSectionAssignments([]);
      setLoadingSectionAssignments(false);
      return () => {
        mounted = false;
      };
    }

    const fetchSectionAssignments = async () => {
      try {
        setLoadingSectionAssignments(true);
        const res = await classService.getAll({
          sectionId: form.sectionId,
          schoolYear: form.schoolYear,
          isActive: "true",
          page: 1,
          limit: 200,
        });
        if (!mounted) return;
        const assignedClasses = (res.data?.data || []).filter(
          (classItem) => !editingClassId || classItem.id !== editingClassId,
        );
        setSectionAssignments(assignedClasses);
      } catch {
        if (mounted) setSectionAssignments([]);
      } finally {
        if (mounted) setLoadingSectionAssignments(false);
      }
    };

    void fetchSectionAssignments();

    return () => {
      mounted = false;
    };
  }, [editingClassId, form.schoolYear, form.sectionId]);

  const assignedSubjectNames = useMemo(() => {
    const subjectNames = new Set<string>();
    sectionAssignments.forEach((classItem) => {
      const subjectKey = normalizeSubjectKey(classItem.subjectName || "");
      if (subjectKey) subjectNames.add(subjectKey);
    });
    return subjectNames;
  }, [sectionAssignments]);

  const assignedTeacherIds = useMemo(() => {
    const teacherIds = new Set<string>();
    sectionAssignments.forEach((classItem) => {
      if (classItem.teacherId) teacherIds.add(classItem.teacherId);
    });
    return teacherIds;
  }, [sectionAssignments]);

  const isSubjectUnavailable = (subjectName: string) =>
    Boolean(
      form.sectionId &&
      assignedSubjectNames.has(normalizeSubjectKey(subjectName)),
    );

  const isTeacherUnavailable = (teacherId: string) =>
    Boolean(form.sectionId && assignedTeacherIds.has(teacherId));

  const selectedSubjectUnavailable = Boolean(
    form.subjectName && isSubjectUnavailable(form.subjectName),
  );
  const selectedTeacherUnavailable = Boolean(
    form.teacherId && isTeacherUnavailable(form.teacherId),
  );
  const sectionRoomNumber = selectedSection?.roomNumber?.trim() ?? "";
  const sectionHasAssignedRoom = Boolean(sectionRoomNumber);
  const sectionRequiresRoomAssignment =
    Boolean(form.sectionId) && !sectionHasAssignedRoom;
  const subjectOptions = useMemo(() => {
    const currentSubject = form.subjectName.trim();
    if (
      !currentSubject ||
      SUBJECTS.includes(currentSubject as (typeof SUBJECTS)[number])
    ) {
      return [...SUBJECTS];
    }
    return [currentSubject, ...SUBJECTS];
  }, [form.subjectName]);

  const roomOptions = useMemo(() => {
    if (sectionHasAssignedRoom) {
      return [sectionRoomNumber];
    }
    if (!form.room) return [...ROOM_OPTIONS];
    if (ROOM_OPTIONS.includes(form.room as (typeof ROOM_OPTIONS)[number])) {
      return [...ROOM_OPTIONS];
    }

    return [form.room, ...ROOM_OPTIONS];
  }, [form.room, sectionHasAssignedRoom, sectionRoomNumber]);

  const roomHelpText = useMemo(() => {
    if (!form.sectionId) {
      return "Select a section first to load its assigned room.";
    }

    if (sectionRequiresRoomAssignment) {
      return "This section has no assigned room yet. Assign a room in section setup before creating classes.";
    }

    if (sectionHasAssignedRoom) {
      return `This section is assigned to Room ${sectionRoomNumber}. All classes under this section must use this room.`;
    }

    return ROOM_OPTIONS_HELP_TEXT;
  }, [
    form.sectionId,
    sectionHasAssignedRoom,
    sectionRequiresRoomAssignment,
    sectionRoomNumber,
  ]);

  useEffect(() => {
    if (!form.sectionId) return;

    if (!sectionHasAssignedRoom) {
      if (form.room) {
        setForm((current) => ({ ...current, room: "" }));
      }
      return;
    }

    if (form.room !== sectionRoomNumber) {
      setForm((current) => ({ ...current, room: sectionRoomNumber }));
    }
  }, [form.room, form.sectionId, sectionHasAssignedRoom, sectionRoomNumber]);

  const isScheduleReady = Boolean(
    form.subjectName &&
    form.subjectCode.trim() &&
    form.subjectGradeLevel &&
    form.sectionId &&
    form.schoolYear &&
    form.room.trim(),
  );
  const isTemplateReady = Boolean(form.subjectName && form.subjectGradeLevel);

  const fetchRoomSchedules = useCallback(
    async (room: string, schoolYear: string) => {
      try {
        setLoadingSection(true);
        const res = await classService.getAll({
          room,
          schoolYear,
          page: 1,
          limit: 100,
        });
        const roomClasses: ClassItem[] = res.data?.data || [];
        const slots: ExistingScheduleSlot[] = [];

        for (const cls of roomClasses) {
          if (editingClassId && cls.id === editingClassId) continue;
          if (!cls.schedules?.length) continue;
          for (const sched of cls.schedules) {
            slots.push({
              days: [...sched.days],
              startTime: sched.startTime,
              endTime: sched.endTime,
              subjectName: cls.subjectName,
              subjectCode: cls.subjectCode,
              teacherName: cls.teacher
                ? `${cls.teacher.firstName || ""} ${cls.teacher.lastName || ""}`.trim()
                : undefined,
              room: cls.room || undefined,
            });
          }
        }
        setExistingSlots(slots);
      } catch {
        setExistingSlots([]);
      } finally {
        setLoadingSection(false);
      }
    },
    [editingClassId],
  );

  useEffect(() => {
    if (isScheduleReady && form.room.trim()) {
      fetchRoomSchedules(form.room.trim(), form.schoolYear);
    } else {
      setExistingSlots([]);
    }
  }, [form.room, form.schoolYear, isScheduleReady, fetchRoomSchedules]);

  const gradingTotal =
    Number(gradingProfileDraft.writtenWork || 0) +
    Number(gradingProfileDraft.performanceTask || 0) +
    Number(gradingProfileDraft.quarterlyAssessment || 0);
  const isGradingProfileValid =
    GRADING_FIELDS.every((entry) => {
      const profileValue = Number(gradingProfileDraft[entry.key]);
      return Number.isInteger(profileValue) && profileValue > 0;
    }) && gradingTotal === 100;
  const isCreateBlocked =
    isEditingGrading ||
    !isGradingProfileValid ||
    selectedSubjectUnavailable ||
    selectedTeacherUnavailable;

  const canSaveGrading = isGradingProfileValid;

  const updateGradingProfile = (
    field: keyof GradingProfile,
    rawValue: string,
  ) => {
    if (!isEditingGrading) return;
    const value = normalizeGradingInput(rawValue);
    if (value === null) return;
    const nextDraft = {
      ...gradingProfileDraft,
      [field]: String(value),
    } as GradingProfileDraft;
    const nextTotal =
      Number(nextDraft.writtenWork || 0) +
      Number(nextDraft.performanceTask || 0) +
      Number(nextDraft.quarterlyAssessment || 0);
    if (nextTotal > 100) return;
    setGradingProfileDraft(nextDraft);
  };

  const onClickSaveGrading = () => {
    if (!canSaveGrading) return;
    setIsEditingGrading(false);
    const nextProfile = {
      writtenWork: Number(gradingProfileDraft.writtenWork),
      performanceTask: Number(gradingProfileDraft.performanceTask),
      quarterlyAssessment: Number(gradingProfileDraft.quarterlyAssessment),
    };
    setForm((current) => ({
      ...current,
      gradingProfile: nextProfile,
    }));
    setGradingProfile(nextProfile);
  };

  const normalizedSchedules = (): ScheduleSlot[] => {
    return form.schedules
      .filter((slot) => slot.days.length > 0 && slot.startTime && slot.endTime)
      .map((slot) => ({
        days: slot.days,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
  };

  const handleSubmit = async () => {
    const schedules = normalizedSchedules();
    if (!form.subjectName || !form.subjectCode.trim()) {
      toast.error("Subject name and code are required");
      return;
    }
    if (!form.subjectGradeLevel) {
      toast.error("Please select a grade level");
      return;
    }
    if (!form.sectionId || !form.teacherId) {
      toast.error("Section and teacher are required");
      return;
    }

    if (selectedSubjectUnavailable) {
      toast.error(
        "This subject already exists in the selected section. Choose another subject.",
      );
      return;
    }
    if (selectedTeacherUnavailable) {
      toast.error(
        "This teacher already has a class in the selected section. Choose another teacher.",
      );
      return;
    }
    if (sectionRequiresRoomAssignment) {
      toast.error(
        "Selected section has no assigned room. Assign a room in section setup first.",
      );
      return;
    }
    if (!form.room.trim() || schedules.length === 0) {
      toast.error("Select a room and at least one schedule slot");
      return;
    }
    if (isCreateBlocked) {
      toast.error("Save a valid grading profile before creating this class");
      return;
    }

    await onSubmit({
      ...form,
      subjectCode: sanitizeSubjectCodeInput(form.subjectCode, 20),
      gradingProfile,
      schedules,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--admin-outline)] bg-[#f8fbff] px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--admin-text-muted)]">
          Class Setup
        </p>
        <p className="flex-1 text-sm leading-5 text-[var(--admin-text-muted)]">
          Keep the teaching assignment and schedule in one view, with the
          required details visible first and the scheduler right below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Subject Name">
          <div className="space-y-3">
            <select
              value={form.subjectName}
              onChange={(event) => handleSubjectNameChange(event.target.value)}
              className={SELECT_CLS}
            >
              <option value="">Select subject</option>
              {subjectOptions.map((subject) => {
                const unavailable = isSubjectUnavailable(subject);
                return (
                  <option key={subject} value={subject} disabled={unavailable}>
                    {subject}
                    {unavailable ? " (already in this section)" : ""}
                  </option>
                );
              })}
            </select>

            {form.sectionId ? (
              <p
                className={`text-[11px] ${
                  selectedSubjectUnavailable
                    ? "font-semibold text-red-600"
                    : "text-[var(--admin-text-muted)]"
                }`}
              >
                {loadingSectionAssignments
                  ? "Checking subjects already assigned to this section..."
                  : selectedSubjectUnavailable
                    ? "This subject is already assigned in the selected section."
                    : assignedSubjectNames.size > 0
                      ? `${assignedSubjectNames.size} subject${assignedSubjectNames.size === 1 ? " is" : "s are"} already assigned here and disabled.`
                      : "All subject options are available for this section."}
              </p>
            ) : null}

            {onTemplateChange ? (
              <div className="rounded-xl border border-[var(--admin-outline)] bg-[#f8fbff] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  Template Apply (Optional)
                </p>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  Applies only templates that match the selected subject and
                  grade level.
                </p>
                <select
                  className="admin-select mt-2 h-10 w-full rounded-xl px-3"
                  value={selectedTemplateId}
                  onChange={(event) => onTemplateChange(event.target.value)}
                  disabled={!isTemplateReady || templatesLoading}
                >
                  {!isTemplateReady ? (
                    <option value="">
                      Select subject and grade level first
                    </option>
                  ) : templatesLoading ? (
                    <option value="">Loading compatible templates...</option>
                  ) : (
                    <option value="">No template</option>
                  )}
                  {templateOptions.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.subjectCode} - Grade{" "}
                      {template.subjectGradeLevel})
                    </option>
                  ))}
                </select>
                {isTemplateReady &&
                !templatesLoading &&
                templateOptions.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                    No compatible templates found for this subject and grade
                    level.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Field>
        <Field label="Subject Code">
          <Input
            value={form.subjectCode}
            onChange={(event) => setField("subjectCode", event.target.value)}
            placeholder="e.g. MATH-7"
            maxLength={20}
            className="admin-input h-10 rounded-xl"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Grade Level">
          <select
            value={form.subjectGradeLevel}
            onChange={(event) => handleGradeLevelChange(event.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Select grade level</option>
            {["7", "8", "9", "10"].map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </Field>

        <Field label="School Year">
          <select
            value={form.schoolYear}
            onChange={(event) => setField("schoolYear", event.target.value)}
            className={SELECT_CLS}
            disabled={lockSchoolYear}
          >
            <option value="">
              {lockSchoolYear ? "Locked by transition state" : "Select year"}
            </option>
            {schoolYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Section">
          <select
            value={form.sectionId}
            onChange={(event) => handleSectionChange(event.target.value)}
            disabled={!form.subjectGradeLevel}
            className={SELECT_CLS}
          >
            <option value="">
              {form.subjectGradeLevel
                ? `Select section (Grade ${form.subjectGradeLevel})`
                : "Select a grade level first"}
            </option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Teacher">
          <select
            value={form.teacherId}
            onChange={(event) => setField("teacherId", event.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Select teacher</option>
            {teachers.map((teacher) => {
              const unavailable = isTeacherUnavailable(teacher.id);
              return (
                <option
                  key={teacher.id}
                  value={teacher.id}
                  disabled={unavailable}
                >
                  {getTeacherDisplayName(teacher)}
                  {unavailable ? " (already assigned in this section)" : ""}
                </option>
              );
            })}
          </select>
          {form.sectionId ? (
            <p
              className={`text-[11px] ${
                selectedTeacherUnavailable
                  ? "font-semibold text-red-600"
                  : "text-[var(--admin-text-muted)]"
              }`}
            >
              {loadingSectionAssignments
                ? "Checking teachers already assigned to this section..."
                : selectedTeacherUnavailable
                  ? "This teacher already has a class in the selected section."
                  : assignedTeacherIds.size > 0
                    ? `${assignedTeacherIds.size} teacher${assignedTeacherIds.size === 1 ? " is" : "s are"} already assigned here and disabled.`
                    : "All teachers are available for this section."}
            </p>
          ) : null}
        </Field>
      </div>

      <Field label="Room">
        <select
          value={form.room}
          onChange={(event) => setField("room", event.target.value)}
          className={SELECT_CLS}
          aria-label="Room"
          disabled={
            !form.sectionId ||
            sectionHasAssignedRoom ||
            sectionRequiresRoomAssignment
          }
        >
          <option value="">
            {!form.sectionId
              ? "Select section first"
              : sectionRequiresRoomAssignment
                ? "Assign room in section setup first"
                : "Select room"}
          </option>
          {roomOptions.map((room) => (
            <option key={room} value={room}>
              Room {room}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[var(--admin-text-muted)]">
          {roomHelpText}
        </p>
      </Field>

      {showGradingProfile && (
        <Field label="Modern policy classification for other subjects">
          <select
            aria-label="Modern subject classification"
            className={SELECT_CLS}
            value={form.academicWeightProfile ?? ""}
            onChange={(e) =>
              setForm((previous) => ({
                ...previous,
                academicWeightProfile: (e.target.value ||
                  undefined) as ClassFormValues["academicWeightProfile"],
              }))
            }
          >
            <option value="">Use recognized subject policy</option>
            <option value="academic">Academic (20 / 50 / 30)</option>
            <option value="practical">Practical (20 / 60 / 20)</option>
          </select>
          <p className="text-xs text-[var(--admin-text-muted)]">
            For an unrecognized subject in a modern school year, explicitly
            choose its classification. Recognized learning areas always use the
            frozen policy weights.
          </p>
        </Field>
      )}
      {showGradingProfile ? (
        <div className="rounded-xl border border-[var(--admin-outline)] bg-[#f8fbff] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                Grading System
              </p>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                Legacy grading distribution only. Modern school-year policy
                determines category weights. Legacy values must total exactly
                100.
              </p>
            </div>
            <div className="admin-chip">Total {gradingTotal} / 100</div>
          </div>
          <div className="mt-3 space-y-3 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
            {GRADING_FIELDS.map((entry) => (
              <Field key={entry.key} label={entry.label}>
                <Input
                  inputMode="numeric"
                  value={gradingProfileDraft[entry.key]}
                  onChange={(event) =>
                    updateGradingProfile(entry.key, event.target.value)
                  }
                  disabled={!isEditingGrading}
                  className="admin-input h-10 rounded-xl"
                  maxLength={2}
                  aria-label={entry.label}
                />
              </Field>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--admin-text-muted)]">
            <p>
              {isGradingProfileValid
                ? "Ready to save."
                : "All fields must be positive, two-digit numbers and total exactly 100."}
            </p>
            <div className="flex gap-2">
              {!isEditingGrading ? (
                <Button
                  variant="outline"
                  className="admin-button-outline rounded-xl px-3 py-1 font-black"
                  onClick={() => setIsEditingGrading(true)}
                >
                  Edit Grade
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="admin-button-outline rounded-xl px-3 py-1 font-black"
                  onClick={onClickSaveGrading}
                  disabled={!canSaveGrading}
                >
                  Save Grading
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-black text-[var(--admin-text-strong)]">
              Schedule
            </p>
            <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
              Pick the timetable after subject, grade level, section, school
              year, and room are set.
            </p>
          </div>
          <div className="admin-chip">
            {loadingSection
              ? `Checking room ${form.room || ""} schedule...`
              : `${form.schedules.length} slot${form.schedules.length === 1 ? "" : "s"} selected`}
          </div>
        </div>

        <ScheduleCalendarCreator
          value={form.schedules}
          onChange={(schedules) =>
            setForm((current) => ({ ...current, schedules }))
          }
          existingSlots={existingSlots}
          disabled={!isScheduleReady || loadingSection}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--admin-outline)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-black text-[var(--admin-text-strong)]">
            Save Class
          </p>
          <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
            Double-check the section, teacher, and schedule before saving.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="admin-button-outline rounded-xl font-black"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="admin-button-solid rounded-xl font-black"
            onClick={handleSubmit}
            disabled={
              saving ||
              !form.subjectName ||
              !form.subjectCode.trim() ||
              !form.subjectGradeLevel ||
              isCreateBlocked
            }
          >
            {saving ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
