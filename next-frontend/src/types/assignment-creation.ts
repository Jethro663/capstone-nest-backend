import type { ClassRecordCategory } from "./assessment";
import type { ClassRecordSlotOverview } from "./class-record";
import type { GradingPeriod } from "@/utils/constants";

export interface AssignmentCreationContext {
  classId: string;
  schoolYear: string;
  defaultPeriod: GradingPeriod | null;
  periods: Array<{
    key: GradingPeriod;
    label: string;
    canPrepare: boolean;
    canRelease: boolean;
    readOnlyReason: string | null;
    workbook: ClassRecordSlotOverview | null;
  }>;
  categories: Array<{ key: ClassRecordCategory; label: string }>;
}
