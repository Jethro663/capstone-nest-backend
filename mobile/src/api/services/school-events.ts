import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { CreateSchoolEventDto, SchoolEvent, SchoolEventQuery, UpdateSchoolEventDto } from "../../types/school-event";

export const schoolEventsApi = {
  async getAll(query?: SchoolEventQuery) {
    const response = await apiClient.get<ApiEnvelope<SchoolEvent[]>>("/school-events", {
      params: query,
    });
    return normalizeArray<SchoolEvent>(unwrapEnvelope(response.data));
  },
  async create(payload: CreateSchoolEventDto) {
    const response = await apiClient.post<ApiEnvelope<SchoolEvent>>("/school-events", payload);
    return unwrapEnvelope(response.data);
  },
  async update(id: string, payload: UpdateSchoolEventDto) {
    const response = await apiClient.patch<ApiEnvelope<SchoolEvent>>(`/school-events/${id}`, payload);
    return unwrapEnvelope(response.data);
  },
  async remove(id: string) {
    await apiClient.delete(`/school-events/${id}`);
  },
};
