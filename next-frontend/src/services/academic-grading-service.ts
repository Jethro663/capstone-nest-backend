import { api } from "@/lib/api-client";
import type {
  AcademicAudit,
  AcademicAlignmentPreview,
  AcademicPeriodKey,
  BackSubject,
  Grade10Completion,
} from "@/types/academic-grading";

type Evidence = { reason: string; sourceReference: string };
type Envelope<T> = { success: boolean; message: string; data: T };
async function post<T = unknown>(path: string, payload: unknown) {
  return (await api.post<Envelope<T>>(path, payload)).data;
}
export const academicGradingService = {
  async audit(schoolYear?: string) {
    return (
      await api.get<Envelope<AcademicAudit>>("/academic-state/audit", {
        params: { schoolYear },
      })
    ).data;
  },
  preserveLegacy: (reason: string) =>
    post("/academic-state/repair/preserve-legacy", { reason }),
  initializePolicy: (year: string, reason: string) =>
    post(
      `/academic-state/repair/policies/${encodeURIComponent(year)}/initialize`,
      { reason },
    ),
  classifySubject: (
    id: string,
    profile: "academic" | "practical",
    reason: string,
  ) =>
    post(`/academic-state/repair/classes/${id}/profile`, { profile, reason }),
  repairWorkbook: (
    id: string,
    reason: string,
    examinations: Array<{ itemId: string; component: "ST1" | "ST2" | "TE" }>,
  ) =>
    post(`/academic-state/repair/records/${id}/policy`, {
      reason,
      examinations,
    }),
  retireDuplicate: (id: string, canonicalClassId: string, reason: string) =>
    post(`/academic-state/repair/classes/${id}/retire-duplicate`, {
      canonicalClassId,
      reason,
    }),
  excludePeriod: (id: string, reason: string) =>
    post(`/academic-state/repair/records/${id}/exclude-historical-period`, {
      reason,
    }),
  excludeAssessmentPeriod: (id: string, reason: string) =>
    post(`/academic-state/repair/assessments/${id}/exclude-historical-period`, {
      reason,
    }),
  repairAssessmentPeriod: (
    id: string,
    quarter: AcademicPeriodKey,
    reason: string,
  ) =>
    post(`/academic-state/repair/assessments/${id}/period`, {
      quarter,
      reason,
    }),
  repairState: (payload: {
    selectedStateId: string;
    expectedStateIds: string[];
    expectedVersion: number;
    quarter: AcademicPeriodKey;
    currentPassword: string;
    reason: string;
  }) => post("/academic-state/repair/state", payload),
  previewStateAlignment: (payload: {
    sourceSchoolYear: string;
    targetSchoolYear: string;
    targetQuarter: AcademicPeriodKey;
    classIds: string[];
  }) =>
    post<AcademicAlignmentPreview>(
      "/academic-state/repair/state-alignment/preview",
      payload,
    ),
  executeStateAlignment: (payload: {
    sourceSchoolYear: string;
    targetSchoolYear: string;
    targetQuarter: AcademicPeriodKey;
    classIds: string[];
    manifestHash: string;
    confirmations: Array<{ code: string; text: string }>;
    reason: string;
    currentPassword: string;
  }) =>
    post<{
      auditEventId: string;
      movedClassIds: string[];
      movedSectionIds: string[];
      updatedLegacyEvidenceRows: number;
    }>("/academic-state/repair/state-alignment", payload),
  externalGrade: (
    classId: string,
    payload: Evidence & {
      studentId: string;
      period: AcademicPeriodKey;
      grade: number;
    },
  ) =>
    post(
      `/academic-grading/classes/${classId}/external-period-grades`,
      payload,
    ),
  selectSource: (
    classId: string,
    payload: {
      studentId: string;
      period: AcademicPeriodKey;
      sourceId: string;
      sourceType: "period_revision" | "external";
      reason: string;
    },
  ) => post(`/academic-grading/classes/${classId}/source-selection`, payload),
  recordRemediation: (
    annualId: string,
    payload: Evidence & { remedialClassMark: number },
  ) => post(`/academic-grading/annual-grades/${annualId}/remediation`, payload),
  async backSubjects(studentId?: string) {
    return (
      await api.get<Envelope<BackSubject[]>>(
        "/academic-grading/back-subjects",
        { params: { studentId } },
      )
    ).data;
  },
  scheduleBackSubject: (
    id: string,
    payload: { schoolYear: string; period: AcademicPeriodKey; reason: string },
  ) => post(`/academic-grading/back-subjects/${id}/schedule`, payload),
  clearBackSubject: (id: string, payload: Evidence & { grade: number }) =>
    post(`/academic-grading/back-subjects/${id}/clear`, payload),
  async grade10Completions() {
    return (
      await api.get<Envelope<Grade10Completion[]>>(
        "/academic-grading/grade-10-completions",
      )
    ).data;
  },
  completeGrade10: (studentId: string, payload: Evidence) =>
    post(`/academic-grading/students/${studentId}/complete-grade-10`, payload),
};
