import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import { downloadProtectedFile } from "./protected-files";
import type { ApiEnvelope } from "../../types/api";
import type {
  CreateDiscussionThreadDto,
  CreateDiscussionCommentDto,
  DiscussionComment,
  DiscussionCommentReportReason,
  DiscussionCommentReactions,
  DiscussionThreadDetail,
  DiscussionThreadListResponse,
  ReportDiscussionCommentDto,
  DiscussionThreadSummary,
  UpdateDiscussionThreadDto,
} from "../../types/discussion";

export const discussionBoardApi = {
  async listThreads(classId: string, query?: { page?: number; limit?: number }) {
    const response = await apiClient.get<ApiEnvelope<DiscussionThreadListResponse>>(
      `/classes/${classId}/discussion-threads`,
      { params: query },
    );
    return unwrapEnvelope(response.data);
  },

  async getThread(classId: string, threadId: string) {
    const response = await apiClient.get<ApiEnvelope<DiscussionThreadDetail>>(
      `/classes/${classId}/discussion-threads/${threadId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async createThread(classId: string, payload: CreateDiscussionThreadDto) {
    const response = await apiClient.post<ApiEnvelope<DiscussionThreadDetail>>(
      `/classes/${classId}/discussion-threads`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async updateThread(classId: string, threadId: string, payload: UpdateDiscussionThreadDto) {
    const response = await apiClient.patch<ApiEnvelope<DiscussionThreadDetail>>(
      `/classes/${classId}/discussion-threads/${threadId}`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async publishThread(classId: string, threadId: string) {
    const response = await apiClient.post<ApiEnvelope<DiscussionThreadDetail>>(
      `/classes/${classId}/discussion-threads/${threadId}/publish`,
    );
    return unwrapEnvelope(response.data);
  },

  async closeThread(classId: string, threadId: string) {
    const response = await apiClient.post<ApiEnvelope<DiscussionThreadDetail>>(
      `/classes/${classId}/discussion-threads/${threadId}/close`,
    );
    return unwrapEnvelope(response.data);
  },

  async reopenThread(classId: string, threadId: string) {
    const response = await apiClient.post<ApiEnvelope<DiscussionThreadDetail>>(
      `/classes/${classId}/discussion-threads/${threadId}/reopen`,
    );
    return unwrapEnvelope(response.data);
  },

  async archiveThread(classId: string, threadId: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id: string; archivedAt: string }>>(
      `/classes/${classId}/discussion-threads/${threadId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async createComment(classId: string, threadId: string, payload: CreateDiscussionCommentDto) {
    const response = await apiClient.post<ApiEnvelope<DiscussionComment>>(
      `/classes/${classId}/discussion-threads/${threadId}/comments`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async deleteComment(classId: string, threadId: string, commentId: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id: string; deletedAt: string }>>(
      `/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async reportComment(
    classId: string,
    threadId: string,
    commentId: string,
    payload: ReportDiscussionCommentDto,
  ) {
    const response = await apiClient.post<
      ApiEnvelope<{ commentId: string; reportedAt: string; reasonCode: DiscussionCommentReportReason }>
    >(`/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}/report`, payload);
    return unwrapEnvelope(response.data);
  },

  async setReaction(
    classId: string,
    threadId: string,
    commentId: string,
    reactionType: "like" | "heart" | "wow",
  ) {
    const response = await apiClient.put<
      ApiEnvelope<{ commentId: string; reactions: DiscussionCommentReactions }>
    >(
      `/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}/reaction`,
      { reactionType },
    );
    return unwrapEnvelope(response.data);
  },

  async removeReaction(classId: string, threadId: string, commentId: string) {
    const response = await apiClient.delete<
      ApiEnvelope<{ commentId: string; reactions: DiscussionCommentReactions }>
    >(`/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}/reaction`);
    return unwrapEnvelope(response.data);
  },

  async uploadCommentImage(
    classId: string,
    threadId: string,
    file: { uri: string; name: string; type?: string | null },
  ) {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type || "image/jpeg",
    } as never);

    const response = await apiClient.post<ApiEnvelope<{ id: string }>>(
      `/classes/${classId}/discussion-threads/${threadId}/comments/uploads`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return unwrapEnvelope(response.data);
  },

  async uploadThreadAttachment(
    classId: string,
    file: { uri: string; name: string; type?: string | null },
  ) {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type || "application/octet-stream",
    } as never);

    const response = await apiClient.post<ApiEnvelope<{ id: string }>>(
      `/classes/${classId}/discussion-threads/uploads`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return unwrapEnvelope(response.data);
  },

  previewUrl(thread: DiscussionThreadSummary, attachmentId: string) {
    return thread.attachments.find((entry) => entry.id === attachmentId)?.inlineUrl;
  },

  async openAttachment(pathname: string, fallbackName: string) {
    return downloadProtectedFile({
      pathname,
      fallbackName,
      openAfterDownload: true,
    });
  },

  async downloadAttachment(pathname: string, fallbackName: string) {
    return downloadProtectedFile({
      pathname,
      fallbackName,
      persistent: true,
      openAfterDownload: true,
    });
  },
};
