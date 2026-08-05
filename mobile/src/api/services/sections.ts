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

export type TeacherSectionCandidateQuery = {
  search?: string;
  gradeLevel?: string;
  eligibility?: "all" | "eligible" | "mismatch";
  prioritizeEligible?: boolean;
  page?: number;
  limit?: number;
};

export const sectionsApi = {
  async getAll(query?: {
    gradeLevel?: string;
    schoolYear?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
  }): Promise<TeacherSectionsListResponse> {
    const response = await apiClient.get<TeacherSectionsListResponse | ApiEnvelope<TeacherSection[]>>(
      "/sections/all",
      { params: query },
    );
    const payload = response.data as TeacherSectionsListResponse;

    return {
      success: payload?.success,
      data: normalizeArray<TeacherSection>(unwrapEnvelope(response.data as ApiEnvelope<TeacherSection[]>)),
      pagination: payload?.pagination,
    };
  },

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

  async getCandidates(sectionId: string, query?: string | TeacherSectionCandidateQuery) {
    const params =
      typeof query === "string"
        ? { search: query.trim() || undefined }
        : {
            ...query,
            search: query?.search?.trim() || undefined,
          };
    const response = await apiClient.get<ApiEnvelope<TeacherSectionCandidate[]>>(
      `/sections/${sectionId}/candidates`,
      { params },
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

  async updatePresentation(sectionId: string, dto: { cardPreset?: string | null; cardBannerUrl?: string | null }) {
    const response = await apiClient.patch<ApiEnvelope<TeacherSection>>(
      `/sections/${sectionId}/presentation`,
      dto,
    );
    return unwrapEnvelope(response.data);
  },

  async uploadBanner(sectionId: string, imageUri: string) {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'banner.jpg';
    
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append("image", {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await apiClient.post<ApiEnvelope<TeacherSection>>(
      `/sections/${sectionId}/banner`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return unwrapEnvelope(response.data);
  },
};
