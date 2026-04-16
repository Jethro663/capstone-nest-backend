import { api } from '@/lib/api-client';
import type {
  CreateDiscussionCommentDto,
  CreateDiscussionThreadDto,
  DiscussionComment,
  DiscussionCommentReactions,
  DiscussionThreadDetail,
  DiscussionThreadListResponse,
  DiscussionThreadSummary,
  UpdateDiscussionThreadDto,
} from '@/types/discussion';

export interface DiscussionThreadsQuery {
  page?: number;
  limit?: number;
}

export const discussionBoardService = {
  async listThreads(
    classId: string,
    query?: DiscussionThreadsQuery,
  ): Promise<{ success: boolean; message: string; data: DiscussionThreadListResponse }> {
    const { data } = await api.get(`/classes/${classId}/discussion-threads`, {
      params: query,
    });
    return data;
  },

  async getThread(
    classId: string,
    threadId: string,
  ): Promise<{ success: boolean; message: string; data: DiscussionThreadDetail }> {
    const { data } = await api.get(
      `/classes/${classId}/discussion-threads/${threadId}`,
    );
    return data;
  },

  async createThread(
    classId: string,
    dto: CreateDiscussionThreadDto,
  ): Promise<{ success: boolean; message: string; data: DiscussionThreadDetail }> {
    const { data } = await api.post(`/classes/${classId}/discussion-threads`, dto);
    return data;
  },

  async updateThread(
    classId: string,
    threadId: string,
    dto: UpdateDiscussionThreadDto,
  ): Promise<{ success: boolean; message: string; data: DiscussionThreadDetail }> {
    const { data } = await api.patch(
      `/classes/${classId}/discussion-threads/${threadId}`,
      dto,
    );
    return data;
  },

  async publishThread(
    classId: string,
    threadId: string,
  ): Promise<{ success: boolean; message: string; data: DiscussionThreadDetail }> {
    const { data } = await api.post(
      `/classes/${classId}/discussion-threads/${threadId}/publish`,
    );
    return data;
  },

  async closeThread(
    classId: string,
    threadId: string,
  ): Promise<{ success: boolean; message: string; data: DiscussionThreadDetail }> {
    const { data } = await api.post(
      `/classes/${classId}/discussion-threads/${threadId}/close`,
    );
    return data;
  },

  async reopenThread(
    classId: string,
    threadId: string,
  ): Promise<{ success: boolean; message: string; data: DiscussionThreadDetail }> {
    const { data } = await api.post(
      `/classes/${classId}/discussion-threads/${threadId}/reopen`,
    );
    return data;
  },

  async archiveThread(
    classId: string,
    threadId: string,
  ): Promise<{ success: boolean; message: string; data: { id: string; archivedAt: string } }> {
    const { data } = await api.delete(
      `/classes/${classId}/discussion-threads/${threadId}`,
    );
    return data;
  },

  async createComment(
    classId: string,
    threadId: string,
    dto: CreateDiscussionCommentDto,
  ): Promise<{ success: boolean; message: string; data: DiscussionComment }> {
    const { data } = await api.post(
      `/classes/${classId}/discussion-threads/${threadId}/comments`,
      dto,
    );
    return data;
  },

  async deleteComment(
    classId: string,
    threadId: string,
    commentId: string,
  ): Promise<{ success: boolean; message: string; data: { id: string; deletedAt: string } }> {
    const { data } = await api.delete(
      `/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}`,
    );
    return data;
  },

  async setReaction(
    classId: string,
    threadId: string,
    commentId: string,
    reactionType: 'like' | 'heart' | 'wow',
  ): Promise<{
    success: boolean;
    message: string;
    data: { commentId: string; reactions: DiscussionCommentReactions };
  }> {
    const { data } = await api.put(
      `/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}/reaction`,
      { reactionType },
    );
    return data;
  },

  async removeReaction(
    classId: string,
    threadId: string,
    commentId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { commentId: string; reactions: DiscussionCommentReactions };
  }> {
    const { data } = await api.delete(
      `/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}/reaction`,
    );
    return data;
  },

  async uploadThreadAttachment(
    classId: string,
    file: File,
  ): Promise<{ success: boolean; message: string; data: { id: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(
      `/classes/${classId}/discussion-threads/uploads`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async uploadCommentImage(
    classId: string,
    threadId: string,
    file: File,
  ): Promise<{ success: boolean; message: string; data: { id: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(
      `/classes/${classId}/discussion-threads/${threadId}/comments/uploads`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  previewUrl(thread: DiscussionThreadSummary, attachmentId: string) {
    return thread.attachments.find((entry) => entry.id === attachmentId)?.inlineUrl;
  },
};
