import type {
  AcademicPolicy,
  AcademicReadiness,
} from "@/types/academic-grading";
import { api } from "@/lib/api-client";
import type {
  AcademicStateCurrent,
  AcademicStateImpactPreview,
  ActivateAcademicPeriod,
  AcademicActivationPreview,
  AcademicQuarter,
} from "@/types/academic-state";

export const academicStateService = {
  async getPolicy(schoolYear: string) {
    const { data } = await api.get<{ success: boolean; data: AcademicPolicy }>(
      "/academic-state/policy",
      { params: { schoolYear } },
    );
    return data;
  },
  async getReadiness() {
    const { data } = await api.get<{
      success: boolean;
      data: AcademicReadiness;
    }>("/academic-state/transition-readiness");
    return data;
  },
  async previewActivation(targetQuarter: AcademicQuarter) {
    const { data } = await api.get<{
      success: boolean;
      data: AcademicActivationPreview;
    }>("/academic-state/quarter-readiness", { params: { targetQuarter } });
    return data;
  },
  async activatePeriod(payload: ActivateAcademicPeriod) {
    const { data } = await api.post<{
      success: boolean;
      data: AcademicStateCurrent & { replayed: boolean };
    }>("/academic-state/activate-period", payload);
    return data;
  },
  async getCurrent() {
    const { data } = await api.get("/academic-state/current");
    return data as {
      success: boolean;
      message: string;
      data: AcademicStateCurrent;
    };
  },

  async getImpactPreview(payload: { schoolYear: string }) {
    const { data } = await api.get("/academic-state/impact-preview", {
      params: payload,
    });
    return data as {
      success: boolean;
      message: string;
      data: AcademicStateImpactPreview;
    };
  },

  async transition(payload: {
    expectedSchoolYear: string;
    expectedQuarter: AcademicQuarter;
    expectedVersion: number;
    schoolYear: string;
    currentPassword: string;
    confirmationText: string;
  }) {
    const { data } = await api.post("/academic-state/transition", payload);
    return data as {
      success: boolean;
      message: string;
      data: {
        state: AcademicStateCurrent;
        impact: {
          classRecordsFinalized: number;
          enrollmentsCompleted: number;
          classesArchived: number;
          sectionsArchived: number;
          schoolEventsArchived: number;
          reusableSectionsCreated: number;
          reusableClassesCreated: number;
          classSchedulesCloned: number;
          classSchedulesCleared: boolean;
          studentsPromoted: number;
          studentsRetained: number;
          studentsGraduated: number;
          reusableContentCloned: {
            assessmentsCreated: number;
            assessmentQuestionsCreated: number;
            lessonsCreated: number;
            lessonBlocksCreated: number;
            modulesCreated: number;
            moduleSectionsCreated: number;
            moduleItemsCreated: number;
            moduleGradingScaleEntriesCreated: number;
          };
        };
      };
    };
  },

  async notifyTeachers() {
    const { data } = await api.post("/academic-state/notify-teachers");
    return data as {
      success: boolean;
      message: string;
      data: {
        message: string;
        notifiedClassesCount: number;
        notifiedTeachersCount: number;
        details?: Array<{
          classId: string;
          subjectName: string;
          sectionName: string;
          gradeLevel: string;
          teacherId: string;
          allRecordsFinalized: boolean;
        }>;
      };
    };
  },
};
