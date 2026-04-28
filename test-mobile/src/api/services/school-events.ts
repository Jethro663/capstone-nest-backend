import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { SchoolEvent, SchoolEventQuery } from "../../types/school-event";

export const schoolEventsApi = {
  async getAll(query?: SchoolEventQuery) {
    const response = await apiClient.get<ApiEnvelope<SchoolEvent[]>>("/school-events", {
      params: query,
    });
    return normalizeArray<SchoolEvent>(unwrapEnvelope(response.data));
  },
};
