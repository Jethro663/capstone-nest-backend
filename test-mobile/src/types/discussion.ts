export type DiscussionReactionType = "like" | "heart" | "wow";

export interface DiscussionAttachmentResource {
  id: string;
  type?: "image" | "pdf" | "link";
  fileId?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  inlineUrl?: string | null;
  downloadUrl?: string | null;
}

export interface DiscussionAuthor {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface DiscussionCommentReactions {
  like: number;
  heart: number;
  wow: number;
  total: number;
  userReaction: DiscussionReactionType | null;
}

export interface DiscussionComment {
  id: string;
  threadId: string;
  authorId: string;
  bodyHtml: string | null;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
  author?: DiscussionAuthor;
  reactions: DiscussionCommentReactions;
  attachments: DiscussionAttachmentResource[];
}

export interface DiscussionThreadSummary {
  id: string;
  classId: string;
  authorId: string;
  title: string;
  bodyHtml: string;
  themeId: string;
  commentLimitPerStudent: number | null;
  allowComments: boolean;
  isPinned: boolean;
  status: "draft" | "published" | "closed" | "archived";
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: DiscussionAuthor;
  commentCount: number;
  attachments: DiscussionAttachmentResource[];
}

export interface DiscussionThreadDetail extends DiscussionThreadSummary {
  comments: DiscussionComment[];
}

export interface DiscussionThreadListResponse {
  items: DiscussionThreadSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateDiscussionCommentDto {
  bodyHtml?: string;
  attachmentFileIds?: string[];
}
