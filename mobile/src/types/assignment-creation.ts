import type { AcademicPeriodKey } from "./academic-grading";
export type AssignmentRecordCategory =
  "written_work" | "performance_task" | "quarterly_assessment";

export type AssignmentFormat = "quiz" | "file_upload";

export interface AssignmentCreationSlot {
  itemId: string;
  title: string;
  order: number;
  maxScore: number;
  assessmentId: string | null;
  assessmentTitle: string | null;
  scoreCount: number;
  status: "empty" | "manual" | "linked_self" | "linked_other";
  isSelectable: boolean;
}

export interface AssignmentCreationContext {
  classId: string;
  schoolYear: string;
  defaultPeriod: AcademicPeriodKey | null;
  periods: Array<{
    key: AcademicPeriodKey;
    label: string;
    canPrepare: boolean;
    canRelease: boolean;
    readOnlyReason: string | null;
    workbook: {
      classRecordId: string;
      gradingPeriod: AcademicPeriodKey;
      status: "draft" | "finalized" | "locked";
      categories: Array<{
        id: string;
        key: AssignmentRecordCategory;
        label: string;
        slots: AssignmentCreationSlot[];
      }>;
    } | null;
  }>;
  categories: Array<{ key: AssignmentRecordCategory; label: string }>;
}
