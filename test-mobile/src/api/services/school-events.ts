import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  CreateSchoolEventDto,
  SchoolEvent,
  SchoolEventQuery,
  UpdateSchoolEventDto,
} from "../../types/school-event";

export const schoolEventsApi = {
  async getAll(query?: SchoolEventQuery) {
    const response = await apiClient.get<ApiEnvelope<SchoolEvent[]>>("/school-events", {
      params: query,
    });
    return normalizeArray<SchoolEvent>(unwrapEnvelope(response.data));
  },

  async create(dto: CreateSchoolEventDto) {
    const response = await apiClient.post<ApiEnvelope<SchoolEvent>>("/school-events", dto);
    return unwrapEnvelope(response.data);
  },

  async update(id: string, dto: UpdateSchoolEventDto) {
    const response = await apiClient.patch<ApiEnvelope<SchoolEvent>>(`/school-events/${id}`, dto);
    return unwrapEnvelope(response.data);
  },

  async remove(id: string) {
    const response = await apiClient.delete<ApiEnvelope<unknown>>(`/school-events/${id}`);
    return unwrapEnvelope(response.data);
  },
};
