import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { SystemCapabilitiesSnapshot } from "../../types/system-capabilities";

export const systemCapabilitiesApi = {
  async getSnapshot() {
    const response = await apiClient.get<ApiEnvelope<SystemCapabilitiesSnapshot>>(
      "/system/capabilities",
    );
    return unwrapEnvelope(response.data);
  },
};
