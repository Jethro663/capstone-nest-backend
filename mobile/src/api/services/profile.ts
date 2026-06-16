import { apiClient } from "../client";
import { normalizeObject, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { StudentProfile, UpdateProfileDto } from "../../types/profile";

const emptyProfile = (): StudentProfile => ({
  id: "",
  userId: "",
});

export const profileApi = {
  async getMine() {
    const response = await apiClient.get<ApiEnvelope<StudentProfile | null>>("/profiles/me");
    const data = unwrapEnvelope(response.data);
    return data ? normalizeObject(data, emptyProfile()) : null;
  },

  async updateByUserId(userId: string, payload: UpdateProfileDto) {
    const response = await apiClient.put<ApiEnvelope<StudentProfile>>(`/profiles/update/${userId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async uploadAvatar(file: { uri: string; name: string; type: string }) {
    const formData = new FormData();
    formData.append("image", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as never);

    const response = await apiClient.post<ApiEnvelope<{ profile: StudentProfile; profilePicture: string }>>(
      "/profiles/me/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return unwrapEnvelope(response.data);
  },
};
