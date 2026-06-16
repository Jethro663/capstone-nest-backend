import { apiClient } from "../client";
import { normalizeObject, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { TeacherProfile, UpdateTeacherProfileDto } from "../../types/profile";

const emptyTeacherProfile = (): TeacherProfile => ({
  id: "",
  userId: "",
});

export const teacherProfileApi = {
  async getMine() {
    const response = await apiClient.get<ApiEnvelope<TeacherProfile | null>>("/teacher-profiles/me");
    const data = unwrapEnvelope(response.data);
    return data ? normalizeObject(data, emptyTeacherProfile()) : null;
  },

  async updateByUserId(userId: string, payload: UpdateTeacherProfileDto) {
    const response = await apiClient.put<ApiEnvelope<TeacherProfile>>(`/teacher-profiles/${userId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async uploadAvatar(file: { uri: string; name: string; type: string }) {
    const formData = new FormData();
    formData.append("image", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as never);

    const response = await apiClient.post<ApiEnvelope<{ profile: TeacherProfile; profilePicture: string }>>(
      "/teacher-profiles/me/avatar",
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
