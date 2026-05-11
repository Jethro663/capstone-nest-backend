import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  TeacherSectionCandidate,
  TeacherSection,
  TeacherSectionRosterStudent,
  TeacherSectionSchedulePayload,
  TeacherSectionStudentProfile,
  TeacherSectionsListResponse,
  TeacherSectionVisibilityStatus,
} from "../../types/teacher";

export const sectionsApi = {
  async getMy(status: TeacherSectionVisibilityStatus = "all"): Promise<TeacherSectionsListResponse> {
    const response = await apiClient.get<
      TeacherSectionsListResponse | ApiEnvelope<TeacherSection[]>
    >("/sections/my", {
      params: { status },
    });
    const payload = response.data as TeacherSectionsListResponse;

    return {
      success: payload?.success,
      data: normalizeArray<TeacherSection>(unwrapEnvelope(response.data as ApiEnvelope<TeacherSection[]>)),
      pagination: payload?.pagination,
    };
  },

  async getById(sectionId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherSection>>(`/sections/${sectionId}`);
    return unwrapEnvelope(response.data);
  },

  async getRoster(sectionId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherSectionRosterStudent[]>>(
      `/sections/${sectionId}/roster`,
    );
    return normalizeArray<TeacherSectionRosterStudent>(unwrapEnvelope(response.data));
  },

  async getCandidates(sectionId: string, search?: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherSectionCandidate[]>>(
      `/sections/${sectionId}/candidates`,
      { params: { search: search?.trim() || undefined } },
    );
    return normalizeArray<TeacherSectionCandidate>(unwrapEnvelope(response.data));
  },

  async addStudents(sectionId: string, studentIds: string[]) {
    const response = await apiClient.post<ApiEnvelope<{ createdCount?: number }>>(
      `/sections/${sectionId}/roster`,
      { studentIds },
    );
    return unwrapEnvelope(response.data);
  },

  async removeStudent(sectionId: string, studentId: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(
      `/sections/${sectionId}/roster/${studentId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async getStudentProfileForSection(sectionId: string, studentId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherSectionStudentProfile>>(
      `/sections/${sectionId}/students/${studentId}/profile`,
    );
    return unwrapEnvelope(response.data);
  },

  async getSchedule(sectionId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherSectionSchedulePayload>>(
      `/sections/${sectionId}/schedule`,
    );
    return unwrapEnvelope(response.data);
  },
};
