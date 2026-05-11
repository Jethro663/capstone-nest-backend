export type DiscussionReactionType = "like" | "heart" | "wow";
export type DiscussionCommentReportReason =
  | "inappropriate"
  | "spam"
  | "off_topic"
  | "harassment"
  | "academic_dishonesty";

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
  profilePicture?: string | null;
}

export interface DiscussionReactor {
  userId: string;
  reactionType: DiscussionReactionType;
  user?: DiscussionAuthor;
}

export interface DiscussionCommentReactions {
  like: number;
  heart: number;
  wow: number;
  total: number;
  userReaction: DiscussionReactionType | null;
  reactors?: DiscussionReactor[];
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

export interface CreateDiscussionThreadDto {
  title: string;
  bodyHtml: string;
  themeId?: string;
  commentLimitPerStudent?: number;
  allowComments?: boolean;
  isPinned?: boolean;
  fileAttachmentIds?: string[];
  linkAttachments?: Array<{ url: string; label?: string }>;
}

export interface UpdateDiscussionThreadDto {
  title?: string;
  bodyHtml?: string;
  themeId?: string;
  commentLimitPerStudent?: number | null;
  allowComments?: boolean;
  isPinned?: boolean;
  fileAttachmentIds?: string[];
  linkAttachments?: Array<{ url: string; label?: string }>;
}

export interface CreateDiscussionCommentDto {
  bodyHtml?: string;
  attachmentFileIds?: string[];
}

export interface ReportDiscussionCommentDto {
  reasonCode: DiscussionCommentReportReason;
  notes?: string;
}
