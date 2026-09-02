import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  TeacherSectionCandidate,
  CreateSectionDto,
  TeacherSection,
  TeacherSectionRosterStudent,
  TeacherSectionSchedulePayload,
  TeacherSectionStudentProfile,
  TeacherSectionsListResponse,
  TeacherSectionVisibilityStatus,
  UpdateSectionDto,
} from "../../types/teacher";
import { fetchAllPages, normalizePageEnvelope, type PageEnvelope } from "../pagination";

export type TeacherSectionCandidateQuery = {
  search?: string;
  gradeLevel?: string;
  eligibility?: "all" | "eligible" | "mismatch";
  prioritizeEligible?: boolean;
  page?: number;
  limit?: number;
};

export type SectionsListQuery = {
  gradeLevel?: string;
  schoolYear?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

export const sectionsApi = {
  async create(payload: CreateSectionDto) {
    const response = await apiClient.post<ApiEnvelope<TeacherSection>>("/sections/create", payload);
    return unwrapEnvelope(response.data);
  },

  async update(sectionId: string, payload: UpdateSectionDto) {
    const response = await apiClient.put<ApiEnvelope<TeacherSection>>(`/sections/update/${sectionId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async getPage(query: SectionsListQuery = {}): Promise<PageEnvelope<TeacherSection>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const response = await apiClient.get<TeacherSectionsListResponse | ApiEnvelope<TeacherSection[]>>(
      "/sections/all",
      { params: { ...query, page, limit } },
    );
    const payload = response.data as TeacherSectionsListResponse;
    return normalizePageEnvelope(
      {
        data: normalizeArray<TeacherSection>(unwrapEnvelope(response.data as ApiEnvelope<TeacherSection[]>)),
        page: payload.pagination?.page,
        limit: payload.pagination?.limit,
        total: payload.pagination?.total,
        totalPages: payload.pagination?.totalPages,
      },
      page,
      limit,
    );
  },

  async getAll(query: Omit<SectionsListQuery, "page"> = {}): Promise<TeacherSectionsListResponse> {
    const result = await fetchAllPages(
      (page, limit) => sectionsApi.getPage({ ...query, page, limit }),
      { limit: query.limit ?? 100, key: (item) => item.id },
    );
    return {
      success: true,
      data: result.data,
      pagination: {
        page: 1,
        limit: result.limit,
        total: result.total ?? result.count,
        totalPages: result.totalPages ?? 1,
      },
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
