import type {
  AcademicPolicy,
  AcademicCapabilities,
} from "@/types/academic-grading";
export const modernPolicy: AcademicPolicy = {
  id: "deped-2026-v1",
  schoolYear: "2026-2027",
  periods: [
    { key: "Q1", label: "Term 1" },
    { key: "Q2", label: "Term 2" },
    { key: "Q3", label: "Term 3" },
  ],
  gradeMethod: "adjusted_2026",
  passingGrade: 75,
  conditionalPromotion: true,
  annualRounding: "half_up",
  examComponents: [
    { key: "ST1", weight: 30 },
    { key: "ST2", weight: 30 },
    { key: "TE", weight: 40 },
  ],
  transmutationBands: [],
};
export const openCapabilities: AcademicCapabilities = {
  schoolYear: "2026-2027",
  period: "Q1",
  periodLabel: "Term 1",
  periods: modernPolicy.periods,
  policyId: modernPolicy.id,
  activeSchoolYear: "2026-2027",
  activePeriod: "Q1",
  canPrepare: true,
  canRelease: true,
  canView: true,
  canStart: true,
  canContinue: true,
  canGrade: true,
  workbookStatus: "draft",
  readOnlyReason: null,
};
