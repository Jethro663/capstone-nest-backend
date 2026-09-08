import type {
  ClassRecordCategory,
  SaveAssessmentEditorInput,
} from "@/types/assessment";
import type { GradingPeriod } from "@/utils/constants";

export interface AssignmentSetup {
  type: "quiz" | "file_upload" | null;
  quarter: GradingPeriod | "";
  category: ClassRecordCategory | "";
  itemId: string;
  manualSlot: boolean;
  title: string;
  noDueDate: boolean;
  dueDate: string;
  closeWhenDue: boolean;
  maxAttempts: string;
}
export function emptyAssignmentSetup(): AssignmentSetup {
  return {
    type: null,
    quarter: "",
    category: "",
    itemId: "",
    manualSlot: false,
    title: "",
    noDueDate: true,
    dueDate: "",
    closeWhenDue: true,
    maxAttempts: "1",
  };
}
export function buildAssignmentRequest(
  classId: string,
  mutationId: string,
  setup: AssignmentSetup,
  defaultPeriod: GradingPeriod,
  skip: boolean,
): SaveAssessmentEditorInput {
  if (!setup.type) throw new Error("Choose an assignment format");
  const settings: SaveAssessmentEditorInput["settings"] = {
    title: skip ? "" : setup.title.trim(),
    type: setup.type,
    quarter: skip ? defaultPeriod : setup.quarter || defaultPeriod,
  };
  if (!skip) {
    settings.classRecordCategory = setup.category || undefined;
    settings.classRecordItemId = setup.itemId || undefined;
    settings.dueDate = setup.noDueDate
      ? undefined
      : new Date(`${setup.dueDate}:00+08:00`).toISOString();
    settings.closeWhenDue = !setup.noDueDate && setup.closeWhenDue;
    if (setup.type === "quiz") settings.maxAttempts = Number(setup.maxAttempts);
  }
  return { mutationId, classId, action: "save", settings, questions: [] };
}
