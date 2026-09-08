import type { SaveAssessmentEditorInput } from "../../types/assessment";
import type { AcademicPeriodKey } from "../../types/academic-grading";
import type { AssignmentFormat } from "../../types/assignment-creation";
import type { AssignmentRecordCategory } from "../../types/assignment-creation";

export interface AssignmentSetup {
  type: AssignmentFormat | null;
  quarter: AcademicPeriodKey | null;
  category: AssignmentRecordCategory | null;
  itemId: string | null;
  manualSlot: boolean;
  title: string;
  noDueDate: boolean;
  dueAt: Date | null;
  closeWhenDue: boolean;
  maxAttempts: string;
}

export function emptyAssignmentSetup(): AssignmentSetup {
  return {
    type: null,
    quarter: null,
    category: null,
    itemId: null,
    manualSlot: false,
    title: "",
    noDueDate: true,
    dueAt: null,
    closeWhenDue: true,
    maxAttempts: "1",
  };
}

export function toManilaIso(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  const localWallClock = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00+08:00`;
  return new Date(localWallClock).toISOString();
}

export function buildAssignmentRequest(
  classId: string,
  mutationId: string,
  setup: AssignmentSetup,
  defaultPeriod: AcademicPeriodKey,
  skip: boolean,
): SaveAssessmentEditorInput {
  if (!setup.type) throw new Error("Choose an assignment format");
  const settings: SaveAssessmentEditorInput["settings"] = {
    title: skip ? "" : setup.title.trim(),
    type: setup.type,
    quarter: skip ? defaultPeriod : (setup.quarter ?? defaultPeriod),
  };
  if (!skip) {
    settings.classRecordCategory = setup.category ?? undefined;
    settings.classRecordItemId = setup.itemId ?? undefined;
    settings.dueDate =
      setup.noDueDate || !setup.dueAt ? undefined : toManilaIso(setup.dueAt);
    settings.closeWhenDue = !setup.noDueDate && setup.closeWhenDue;
    if (setup.type === "quiz") settings.maxAttempts = Number(setup.maxAttempts);
  }
  return {
    mutationId,
    classId,
    action: "save",
    settings,
    questions: [],
  };
}
