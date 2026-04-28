import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classes,
  discussionCommentAttachments,
  discussionCommentReactions,
  discussionComments,
  discussionThreadAttachments,
  discussionThreads,
  enrollments,
  uploadedFiles,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { sanitizeRichTextHtml as sanitizeRichText } from '../../common/utils/rich-text-sanitizer';
import {
  CreateDiscussionThreadDto,
  DISCUSSION_THEME_IDS,
  DiscussionLinkAttachmentDto,
  QueryDiscussionThreadsDto,
  UpdateDiscussionThreadDto,
} from './DTO/discussion-thread.dto';
import {
  CreateDiscussionCommentDto,
  SetDiscussionReactionDto,
} from './DTO/discussion-comment.dto';
import { RoleName } from '../../common/constants/role.constants';

type AccessContext = {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  classTeacherId: string | null;
};

type ThreadAttachmentPayload = {
  id: string;
  attachmentType: 'image' | 'pdf' | 'link';
  fileId: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  createdAt: Date;
  file?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: string;
  } | null;
};

function stripHtml(input: string) {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class DiscussionBoardService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    @InjectQueue('discussion-board')
    private readonly discussionQueue: Queue,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private sanitizeThreadHtml(input: string): string {
    return sanitizeRichText(input);
  }

  private sanitizeCommentHtml(input: string): string {
    return sanitizeRichText(input);
  }

  private assertTheme(themeId?: string) {
    if (!themeId) return;
    if (
      !DISCUSSION_THEME_IDS.includes(
        themeId as (typeof DISCUSSION_THEME_IDS)[number],
      )
    ) {
      throw new BadRequestException('Invalid discussion theme.');
    }
  }

  private parseAccess(
    roles: string[],
  ): Pick<AccessContext, 'isAdmin' | 'isTeacher' | 'isStudent'> {
    return {
      isAdmin: roles.includes(RoleName.Admin),
      isTeacher: roles.includes(RoleName.Teacher),
      isStudent: roles.includes(RoleName.Student),
    };
  }

  private async getClassAccessContext(
    classId: string,
    userId: string,
    roles: string[],
  ): Promise<AccessContext> {
    const access = this.parseAccess(roles);
    if (!access.isAdmin && !access.isTeacher && !access.isStudent) {
      throw new ForbiddenException('You do not have access to this class.');
    }

    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true },
    });

    if (!classRecord) {
      throw new NotFoundException('Class not found.');
    }

    if (access.isAdmin) {
      return { ...access, classTeacherId: classRecord.teacherId };
    }

    if (access.isTeacher) {
      if (classRecord.teacherId !== userId) {
        throw new ForbiddenException('You can only access your own classes.');
      }
      return { ...access, classTeacherId: classRecord.teacherId };
    }

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, userId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this class.');
    }

    return { ...access, classTeacherId: classRecord.teacherId };
  }

  private assertThreadReadable(
    thread: {
      status: 'draft' | 'published' | 'closed' | 'archived';
      publishedAt: Date | null;
      archivedAt: Date | null;
    },
    access: AccessContext,
  ) {
    if (thread.archivedAt || thread.status === 'archived') {
      throw new NotFoundException('Discussion thread not found.');
    }

    if (
      access.isStudent &&
      (thread.status === 'draft' || !thread.publishedAt)
    ) {
      throw new NotFoundException('Discussion thread not found.');
    }
  }

  private assertTeacherWritable(access: AccessContext) {
    if (access.isAdmin || access.isTeacher) return;
    throw new ForbiddenException('Only teachers can perform this action.');
  }

  private assertStudentInteractive(access: AccessContext) {
    if (access.isAdmin || access.isStudent) return;
    throw new ForbiddenException('Only students can perform this action.');
  }

  private assertThreadCommentable(thread: {
    status: 'draft' | 'published' | 'closed' | 'archived';
    publishedAt: Date | null;
    allowComments: boolean;
  }) {
    if (thread.status === 'closed') {
      throw new BadRequestException('This discussion thread is closed.');
    }
    if (thread.status !== 'published' || !thread.publishedAt) {
      throw new BadRequestException(
        'Comments are only allowed on published threads.',
      );
    }
    if (!thread.allowComments) {
      throw new BadRequestException('Comments are disabled for this thread.');
    }
  }

  private async resolveThreadFileAttachments(
    classId: string,
    actorId: string,
    access: AccessContext,
    fileIds: string[] | undefined,
  ) {
    if (!fileIds || fileIds.length === 0)
      return [] as Array<{
        fileId: string;
        attachmentType: 'image' | 'pdf';
      }>;

    const files = await this.db.query.uploadedFiles.findMany({
      where: and(
        inArray(uploadedFiles.id, fileIds),
        isNull(uploadedFiles.deletedAt),
      ),
      columns: {
        id: true,
        classId: true,
        teacherId: true,
        mimeType: true,
      },
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException(
        'One or more attachment files do not exist.',
      );
    }

    const byId = new Map(files.map((file) => [file.id, file]));
    return fileIds.map((id) => {
      const file = byId.get(id);
      if (!file) {
        throw new BadRequestException('Invalid attachment file id.');
      }
      if (file.classId !== classId) {
        throw new ForbiddenException(
          'Attachment file must belong to the same class.',
        );
      }
      if (!access.isAdmin && file.teacherId !== actorId) {
        throw new ForbiddenException('You can only attach files you uploaded.');
      }
      const mime = file.mimeType.toLowerCase();
      if (mime.startsWith('image/')) {
        return { fileId: file.id, attachmentType: 'image' as const };
      }
      if (mime.includes('pdf')) {
        return { fileId: file.id, attachmentType: 'pdf' as const };
      }
      throw new BadRequestException(
        'Thread attachments only allow image or PDF files.',
      );
    });
  }

  private resolveThreadLinkAttachments(
    links: DiscussionLinkAttachmentDto[] | undefined,
  ) {
    if (!links || links.length === 0)
      return [] as Array<{
        attachmentType: 'link';
        linkUrl: string;
        linkLabel: string | null;
      }>;

    return links.map((link) => {
      let parsed: URL;
      try {
        parsed = new URL(link.url);
      } catch {
        throw new BadRequestException('Invalid link attachment URL.');
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new BadRequestException(
          'Link attachments only support http/https URLs.',
        );
      }
      return {
        attachmentType: 'link' as const,
        linkUrl: parsed.toString(),
        linkLabel: link.label?.trim() || null,
      };
    });
  }

  private async resolveCommentImageAttachments(
    classId: string,
    actorId: string,
    access: AccessContext,
    fileIds: string[] | undefined,
  ) {
    if (!fileIds || fileIds.length === 0)
      return [] as Array<{ fileId: string }>;

    const files = await this.db.query.uploadedFiles.findMany({
      where: and(
        inArray(uploadedFiles.id, fileIds),
        isNull(uploadedFiles.deletedAt),
      ),
      columns: {
        id: true,
        classId: true,
        teacherId: true,
        mimeType: true,
      },
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException(
        'One or more comment attachment files do not exist.',
      );
    }

    const byId = new Map(files.map((file) => [file.id, file]));
    return fileIds.map((id) => {
      const file = byId.get(id);
      if (!file) {
        throw new BadRequestException('Invalid comment attachment file id.');
      }
      if (file.classId !== classId) {
        throw new ForbiddenException(
          'Comment image attachment must belong to the same class.',
        );
      }
      if (!access.isAdmin && file.teacherId !== actorId) {
        throw new ForbiddenException('You can only attach files you uploaded.');
      }
      if (!file.mimeType.toLowerCase().startsWith('image/')) {
        throw new BadRequestException(
          'Comment attachments only support images.',
        );
      }
      return { fileId: file.id };
    });
  }

  private toThreadAttachmentResource(
    classId: string,
    threadId: string,
    attachment: ThreadAttachmentPayload,
  ) {
    if (attachment.attachmentType === 'link') {
      return {
        id: attachment.id,
        type: 'link' as const,
        linkUrl: attachment.linkUrl,
        linkLabel: attachment.linkLabel,
      };
    }

    return {
      id: attachment.id,
      type: attachment.attachmentType,
      fileId: attachment.fileId,
      originalName: attachment.file?.originalName ?? null,
      mimeType: attachment.file?.mimeType ?? null,
      sizeBytes: attachment.file?.sizeBytes ?? null,
      inlineUrl: `/api/classes/${classId}/discussion-threads/${threadId}/attachments/${attachment.id}/inline`,
      downloadUrl: `/api/classes/${classId}/discussion-threads/${threadId}/attachments/${attachment.id}/download`,
    };
  }

  private toCommentAttachmentResource(
    classId: string,
    threadId: string,
    commentId: string,
    attachment: {
      id: string;
      fileId: string;
      file?: {
        id: string;
        originalName: string;
        mimeType: string;
        sizeBytes: string;
      } | null;
    },
  ) {
    return {
      id: attachment.id,
      fileId: attachment.fileId,
      originalName: attachment.file?.originalName ?? null,
      mimeType: attachment.file?.mimeType ?? null,
      sizeBytes: attachment.file?.sizeBytes ?? null,
      inlineUrl: `/api/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}/attachments/${attachment.id}/inline`,
      downloadUrl: `/api/classes/${classId}/discussion-threads/${threadId}/comments/${commentId}/attachments/${attachment.id}/download`,
    };
  }

  private async getThreadOrThrow(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
  ) {
    const access = await this.getClassAccessContext(classId, actorId, roles);
    const thread = await this.db.query.discussionThreads.findFirst({
      where: and(
        eq(discussionThreads.id, threadId),
        eq(discussionThreads.classId, classId),
      ),
      with: {
        author: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attachments: {
          with: {
            file: {
              columns: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
          orderBy: (table, { asc: byAsc }) => [byAsc(table.createdAt)],
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Discussion thread not found.');
    }

    this.assertThreadReadable(
      {
        status: thread.status,
        publishedAt: thread.publishedAt,
        archivedAt: thread.archivedAt,
      },
      access,
    );

    return { thread, access };
  }

  private async getReactionSummary(commentId: string, actorId: string) {
    const reactions = await this.db.query.discussionCommentReactions.findMany({
      where: eq(discussionCommentReactions.commentId, commentId),
      columns: {
        userId: true,
        reactionType: true,
      },
    });

    const counts = {
      like: 0,
      heart: 0,
      wow: 0,
    };

    let userReaction: 'like' | 'heart' | 'wow' | null = null;
    for (const reaction of reactions) {
      if (reaction.reactionType === 'like') counts.like += 1;
      if (reaction.reactionType === 'heart') counts.heart += 1;
      if (reaction.reactionType === 'wow') counts.wow += 1;
      if (reaction.userId === actorId) {
        userReaction = reaction.reactionType;
      }
    }

    return {
      ...counts,
      total: counts.like + counts.heart + counts.wow,
      userReaction,
    };
  }

  private async getThreadCommentPayload(
    classId: string,
    threadId: string,
    commentId: string,
    actorId: string,
    access: AccessContext,
  ) {
    const comment = await this.db.query.discussionComments.findFirst({
      where: and(
        eq(discussionComments.id, commentId),
        eq(discussionComments.threadId, threadId),
        isNull(discussionComments.deletedAt),
      ),
      with: {
        author: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attachments: {
          with: {
            file: {
              columns: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
          orderBy: (table, { asc: byAsc }) => [byAsc(table.createdAt)],
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Discussion comment not found.');
    }

    const reactions = await this.getReactionSummary(comment.id, actorId);
    return {
      id: comment.id,
      threadId: comment.threadId,
      authorId: comment.authorId,
      bodyHtml: comment.bodyHtml,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      canDelete:
        access.isAdmin || access.isTeacher || comment.authorId === actorId,
      author: comment.author,
      reactions,
      attachments: comment.attachments.map((attachment) =>
        this.toCommentAttachmentResource(
          classId,
          threadId,
          comment.id,
          attachment as any,
        ),
      ),
    };
  }

  async listThreads(
    classId: string,
    actorId: string,
    roles: string[],
    query: QueryDiscussionThreadsDto,
  ) {
    const access = await this.getClassAccessContext(classId, actorId, roles);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(discussionThreads.classId, classId),
      isNull(discussionThreads.archivedAt),
      access.isStudent
        ? and(
            inArray(discussionThreads.status, ['published', 'closed']),
            sql`${discussionThreads.publishedAt} IS NOT NULL`,
          )
        : undefined,
    );

    const [rows, totalRows] = await Promise.all([
      this.db.query.discussionThreads.findMany({
        where: whereClause,
        with: {
          author: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          attachments: {
            with: {
              file: {
                columns: {
                  id: true,
                  originalName: true,
                  mimeType: true,
                  sizeBytes: true,
                },
              },
            },
            orderBy: (table, { asc: byAsc }) => [byAsc(table.createdAt)],
          },
        },
        orderBy: [
          desc(discussionThreads.isPinned),
          desc(discussionThreads.publishedAt),
          desc(discussionThreads.createdAt),
        ],
        limit,
        offset,
      }),
      this.db
        .select({ total: count() })
        .from(discussionThreads)
        .where(whereClause),
    ]);

    const threadIds = rows.map((row) => row.id);
    const commentCounts =
      threadIds.length > 0
        ? await this.db
            .select({
              threadId: discussionComments.threadId,
              total: count(),
            })
            .from(discussionComments)
            .where(
              and(
                inArray(discussionComments.threadId, threadIds),
                isNull(discussionComments.deletedAt),
              ),
            )
            .groupBy(discussionComments.threadId)
        : [];

    const countByThreadId = new Map(
      commentCounts.map((entry) => [entry.threadId, Number(entry.total)]),
    );

    return {
      items: rows.map((thread) => ({
        id: thread.id,
        classId: thread.classId,
        authorId: thread.authorId,
        title: thread.title,
        bodyHtml: thread.bodyHtml,
        themeId: thread.themeId,
        commentLimitPerStudent: thread.commentLimitPerStudent,
        allowComments: thread.allowComments,
        isPinned: thread.isPinned,
        status: thread.status,
        publishedAt: thread.publishedAt,
        closedAt: thread.closedAt,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        author: thread.author,
        commentCount: countByThreadId.get(thread.id) ?? 0,
        attachments: thread.attachments.map((attachment) =>
          this.toThreadAttachmentResource(
            classId,
            thread.id,
            attachment as unknown as ThreadAttachmentPayload,
          ),
        ),
      })),
      page,
      limit,
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async getThread(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );

    const comments = await this.db.query.discussionComments.findMany({
      where: and(
        eq(discussionComments.threadId, thread.id),
        isNull(discussionComments.deletedAt),
      ),
      with: {
        author: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attachments: {
          with: {
            file: {
              columns: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
          orderBy: (table, { asc: byAsc }) => [byAsc(table.createdAt)],
        },
      },
      orderBy: [asc(discussionComments.createdAt)],
    });

    const commentIds = comments.map((comment) => comment.id);
    const reactionRows =
      commentIds.length > 0
        ? await this.db.query.discussionCommentReactions.findMany({
            where: inArray(discussionCommentReactions.commentId, commentIds),
            columns: {
              commentId: true,
              userId: true,
              reactionType: true,
            },
          })
        : [];

    const reactionsByComment = new Map<
      string,
      {
        like: number;
        heart: number;
        wow: number;
        total: number;
        userReaction: 'like' | 'heart' | 'wow' | null;
      }
    >();

    for (const commentId of commentIds) {
      reactionsByComment.set(commentId, {
        like: 0,
        heart: 0,
        wow: 0,
        total: 0,
        userReaction: null,
      });
    }

    for (const reaction of reactionRows) {
      const bucket = reactionsByComment.get(reaction.commentId);
      if (!bucket) continue;
      if (reaction.reactionType === 'like') bucket.like += 1;
      if (reaction.reactionType === 'heart') bucket.heart += 1;
      if (reaction.reactionType === 'wow') bucket.wow += 1;
      bucket.total = bucket.like + bucket.heart + bucket.wow;
      if (reaction.userId === actorId) {
        bucket.userReaction = reaction.reactionType;
      }
    }

    return {
      id: thread.id,
      classId: thread.classId,
      authorId: thread.authorId,
      title: thread.title,
      bodyHtml: thread.bodyHtml,
      themeId: thread.themeId,
      commentLimitPerStudent: thread.commentLimitPerStudent,
      allowComments: thread.allowComments,
      isPinned: thread.isPinned,
      status: thread.status,
      publishedAt: thread.publishedAt,
      closedAt: thread.closedAt,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      author: thread.author,
      attachments: thread.attachments.map((attachment) =>
        this.toThreadAttachmentResource(
          classId,
          thread.id,
          attachment as unknown as ThreadAttachmentPayload,
        ),
      ),
      comments: comments.map((comment) => ({
        id: comment.id,
        threadId: comment.threadId,
        authorId: comment.authorId,
        bodyHtml: comment.bodyHtml,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        canDelete:
          access.isAdmin || access.isTeacher || comment.authorId === actorId,
        author: comment.author,
        reactions: reactionsByComment.get(comment.id) ?? {
          like: 0,
          heart: 0,
          wow: 0,
          total: 0,
          userReaction: null,
        },
        attachments: comment.attachments.map((attachment) =>
          this.toCommentAttachmentResource(
            classId,
            thread.id,
            comment.id,
            attachment as any,
          ),
        ),
      })),
    };
  }

  async createThread(
    classId: string,
    actorId: string,
    roles: string[],
    dto: CreateDiscussionThreadDto,
  ) {
    const access = await this.getClassAccessContext(classId, actorId, roles);
    this.assertTeacherWritable(access);
    this.assertTheme(dto.themeId);

    const title = dto.title.trim();
    const bodyHtml = this.sanitizeThreadHtml(dto.bodyHtml);

    if (!title) {
      throw new BadRequestException('Thread title is required.');
    }
    if (!bodyHtml) {
      throw new BadRequestException('Thread body is required.');
    }

    const fileAttachments = await this.resolveThreadFileAttachments(
      classId,
      actorId,
      access,
      dto.fileAttachmentIds,
    );
    const linkAttachments = this.resolveThreadLinkAttachments(
      dto.linkAttachments,
    );

    const [thread] = await this.db
      .insert(discussionThreads)
      .values({
        classId,
        authorId: actorId,
        title,
        bodyHtml,
        themeId: dto.themeId ?? 'classic',
        commentLimitPerStudent: dto.commentLimitPerStudent ?? null,
        allowComments: dto.allowComments ?? true,
        isPinned: dto.isPinned ?? false,
        status: 'draft',
      })
      .returning();

    if (fileAttachments.length > 0 || linkAttachments.length > 0) {
      await this.db.insert(discussionThreadAttachments).values([
        ...fileAttachments.map((attachment) => ({
          threadId: thread.id,
          attachmentType: attachment.attachmentType,
          fileId: attachment.fileId,
        })),
        ...linkAttachments.map((attachment) => ({
          threadId: thread.id,
          attachmentType: attachment.attachmentType,
          linkUrl: attachment.linkUrl,
          linkLabel: attachment.linkLabel,
        })),
      ]);
    }

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.created',
      targetType: 'discussion_thread',
      targetId: thread.id,
      metadata: {
        classId,
        status: thread.status,
        attachmentCount: fileAttachments.length + linkAttachments.length,
      },
    });

    return this.getThread(classId, thread.id, actorId, roles);
  }

  async updateThread(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
    dto: UpdateDiscussionThreadDto,
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertTeacherWritable(access);

    const updates: Partial<typeof discussionThreads.$inferInsert> = {
      updatedAt: new Date(),
    };
    const changedFields: string[] = [];

    if (dto.title !== undefined) {
      updates.title = dto.title.trim();
      changedFields.push('title');
    }
    if (dto.bodyHtml !== undefined) {
      updates.bodyHtml = this.sanitizeThreadHtml(dto.bodyHtml);
      changedFields.push('bodyHtml');
    }
    if (dto.themeId !== undefined) {
      this.assertTheme(dto.themeId);
      updates.themeId = dto.themeId;
      changedFields.push('themeId');
    }
    if (dto.commentLimitPerStudent !== undefined) {
      updates.commentLimitPerStudent = dto.commentLimitPerStudent ?? null;
      changedFields.push('commentLimitPerStudent');
    }
    if (dto.allowComments !== undefined) {
      updates.allowComments = dto.allowComments;
      changedFields.push('allowComments');
    }
    if (dto.isPinned !== undefined) {
      updates.isPinned = dto.isPinned;
      changedFields.push('isPinned');
    }

    if (changedFields.length > 0) {
      await this.db
        .update(discussionThreads)
        .set(updates)
        .where(eq(discussionThreads.id, thread.id));
    }

    if (
      dto.fileAttachmentIds !== undefined ||
      dto.linkAttachments !== undefined
    ) {
      const fileAttachments = await this.resolveThreadFileAttachments(
        classId,
        actorId,
        access,
        dto.fileAttachmentIds ?? [],
      );
      const linkAttachments = this.resolveThreadLinkAttachments(
        dto.linkAttachments ?? [],
      );

      await this.db
        .delete(discussionThreadAttachments)
        .where(eq(discussionThreadAttachments.threadId, thread.id));

      if (fileAttachments.length > 0 || linkAttachments.length > 0) {
        await this.db.insert(discussionThreadAttachments).values([
          ...fileAttachments.map((attachment) => ({
            threadId: thread.id,
            attachmentType: attachment.attachmentType,
            fileId: attachment.fileId,
          })),
          ...linkAttachments.map((attachment) => ({
            threadId: thread.id,
            attachmentType: attachment.attachmentType,
            linkUrl: attachment.linkUrl,
            linkLabel: attachment.linkLabel,
          })),
        ]);
      }

      changedFields.push('attachments');
    }

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.updated',
      targetType: 'discussion_thread',
      targetId: thread.id,
      metadata: {
        classId,
        changedFields,
      },
    });

    return this.getThread(classId, thread.id, actorId, roles);
  }

  async publishThread(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertTeacherWritable(access);

    if (thread.status === 'closed') {
      throw new BadRequestException(
        'Closed threads must be reopened instead of republished.',
      );
    }

    if (thread.status !== 'published' || !thread.publishedAt) {
      const now = new Date();
      await this.db
        .update(discussionThreads)
        .set({
          status: 'published',
          publishedAt: thread.publishedAt ?? now,
          updatedAt: now,
        })
        .where(eq(discussionThreads.id, thread.id));

      await this.discussionQueue.add(
        'thread-published',
        {
          classId,
          threadId: thread.id,
          title: thread.title,
          bodyHtml: thread.bodyHtml,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.published',
      targetType: 'discussion_thread',
      targetId: thread.id,
      metadata: {
        classId,
      },
    });

    return this.getThread(classId, thread.id, actorId, roles);
  }

  async closeThread(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertTeacherWritable(access);

    if (!thread.publishedAt || thread.status === 'draft') {
      throw new BadRequestException('Draft threads cannot be closed.');
    }

    if (thread.status !== 'closed') {
      await this.db
        .update(discussionThreads)
        .set({
          status: 'closed',
          allowComments: false,
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(discussionThreads.id, thread.id));
    }

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.closed',
      targetType: 'discussion_thread',
      targetId: thread.id,
      metadata: {
        classId,
      },
    });

    return this.getThread(classId, thread.id, actorId, roles);
  }

  async reopenThread(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertTeacherWritable(access);

    if (!thread.publishedAt || thread.status === 'draft') {
      throw new BadRequestException('Draft threads cannot be reopened.');
    }

    if (thread.status !== 'published') {
      await this.db
        .update(discussionThreads)
        .set({
          status: 'published',
          allowComments: true,
          closedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(discussionThreads.id, thread.id));
    }

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.reopened',
      targetType: 'discussion_thread',
      targetId: thread.id,
      metadata: {
        classId,
      },
    });

    return this.getThread(classId, thread.id, actorId, roles);
  }

  async archiveThread(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertTeacherWritable(access);

    const now = new Date();
    await this.db
      .update(discussionThreads)
      .set({
        status: 'archived',
        archivedAt: now,
        updatedAt: now,
      })
      .where(eq(discussionThreads.id, thread.id));

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.archived',
      targetType: 'discussion_thread',
      targetId: thread.id,
      metadata: {
        classId,
      },
    });

    return { id: thread.id, archivedAt: now };
  }

  async createComment(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
    dto: CreateDiscussionCommentDto,
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertStudentInteractive(access);
    this.assertThreadCommentable(thread);

    const sanitizedBody =
      dto.bodyHtml === undefined
        ? null
        : this.sanitizeCommentHtml(dto.bodyHtml);
    const attachments = await this.resolveCommentImageAttachments(
      classId,
      actorId,
      access,
      dto.attachmentFileIds,
    );

    if (!sanitizedBody && attachments.length === 0) {
      throw new BadRequestException(
        'Comment must include text or at least one image attachment.',
      );
    }

    if (access.isStudent && thread.commentLimitPerStudent) {
      const [activeCount] = await this.db
        .select({ total: count() })
        .from(discussionComments)
        .where(
          and(
            eq(discussionComments.threadId, thread.id),
            eq(discussionComments.authorId, actorId),
            isNull(discussionComments.deletedAt),
          ),
        );

      const used = Number(activeCount?.total ?? 0);
      if (used >= thread.commentLimitPerStudent) {
        throw new BadRequestException(
          `You already reached the comment limit (${thread.commentLimitPerStudent}) for this thread.`,
        );
      }
    }

    const [comment] = await this.db
      .insert(discussionComments)
      .values({
        threadId: thread.id,
        authorId: actorId,
        bodyHtml: sanitizedBody,
      })
      .returning();

    if (attachments.length > 0) {
      await this.db.insert(discussionCommentAttachments).values(
        attachments.map((attachment) => ({
          commentId: comment.id,
          fileId: attachment.fileId,
        })),
      );
    }

    await this.discussionQueue.add(
      'comment-created',
      {
        classId,
        threadId: thread.id,
        commentId: comment.id,
        threadTitle: thread.title,
        commenterId: actorId,
        classTeacherId: access.classTeacherId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.auditService.log({
      actorId,
      action: 'discussion.comment.created',
      targetType: 'discussion_comment',
      targetId: comment.id,
      metadata: {
        classId,
        threadId: thread.id,
        hasBody: Boolean(sanitizedBody),
        attachmentCount: attachments.length,
      },
    });

    return this.getThreadCommentPayload(
      classId,
      thread.id,
      comment.id,
      actorId,
      access,
    );
  }

  async deleteComment(
    classId: string,
    threadId: string,
    commentId: string,
    actorId: string,
    roles: string[],
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );

    const comment = await this.db.query.discussionComments.findFirst({
      where: and(
        eq(discussionComments.id, commentId),
        eq(discussionComments.threadId, thread.id),
        isNull(discussionComments.deletedAt),
      ),
      columns: {
        id: true,
        authorId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Discussion comment not found.');
    }

    if (access.isStudent && comment.authorId !== actorId) {
      throw new ForbiddenException('You can only delete your own comments.');
    }

    const now = new Date();
    await this.db
      .update(discussionComments)
      .set({
        deletedAt: now,
        deletedById: actorId,
        updatedAt: now,
      })
      .where(eq(discussionComments.id, comment.id));

    await this.auditService.log({
      actorId,
      action: 'discussion.comment.deleted',
      targetType: 'discussion_comment',
      targetId: comment.id,
      metadata: {
        classId,
        threadId: thread.id,
      },
    });

    return { id: comment.id, deletedAt: now };
  }

  async setCommentReaction(
    classId: string,
    threadId: string,
    commentId: string,
    actorId: string,
    roles: string[],
    dto: SetDiscussionReactionDto,
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertStudentInteractive(access);
    this.assertThreadCommentable(thread);

    const comment = await this.db.query.discussionComments.findFirst({
      where: and(
        eq(discussionComments.id, commentId),
        eq(discussionComments.threadId, thread.id),
        isNull(discussionComments.deletedAt),
      ),
      columns: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Discussion comment not found.');
    }

    await this.db
      .insert(discussionCommentReactions)
      .values({
        commentId: comment.id,
        userId: actorId,
        reactionType: dto.reactionType,
      })
      .onConflictDoUpdate({
        target: [
          discussionCommentReactions.commentId,
          discussionCommentReactions.userId,
        ],
        set: {
          reactionType: dto.reactionType,
          updatedAt: new Date(),
        },
      });

    const reactionSummary = await this.getReactionSummary(comment.id, actorId);

    await this.auditService.log({
      actorId,
      action: 'discussion.comment.reaction.set',
      targetType: 'discussion_comment',
      targetId: comment.id,
      metadata: {
        classId,
        threadId: thread.id,
        reactionType: dto.reactionType,
      },
    });

    return {
      commentId: comment.id,
      reactions: reactionSummary,
    };
  }

  async removeCommentReaction(
    classId: string,
    threadId: string,
    commentId: string,
    actorId: string,
    roles: string[],
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertStudentInteractive(access);
    this.assertThreadCommentable(thread);

    const comment = await this.db.query.discussionComments.findFirst({
      where: and(
        eq(discussionComments.id, commentId),
        eq(discussionComments.threadId, thread.id),
        isNull(discussionComments.deletedAt),
      ),
      columns: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Discussion comment not found.');
    }

    await this.db
      .delete(discussionCommentReactions)
      .where(
        and(
          eq(discussionCommentReactions.commentId, comment.id),
          eq(discussionCommentReactions.userId, actorId),
        ),
      );

    const reactionSummary = await this.getReactionSummary(comment.id, actorId);

    await this.auditService.log({
      actorId,
      action: 'discussion.comment.reaction.removed',
      targetType: 'discussion_comment',
      targetId: comment.id,
      metadata: {
        classId,
        threadId: thread.id,
      },
    });

    return {
      commentId: comment.id,
      reactions: reactionSummary,
    };
  }

  async uploadThreadAttachmentFile(
    classId: string,
    actorId: string,
    roles: string[],
    file: Express.Multer.File,
  ) {
    const access = await this.getClassAccessContext(classId, actorId, roles);
    this.assertTeacherWritable(access);

    const mimeType = file.mimetype.toLowerCase();
    if (!mimeType.startsWith('image/') && !mimeType.includes('pdf')) {
      throw new BadRequestException(
        'Thread attachments only support image and PDF files.',
      );
    }

    const [savedFile] = await this.db
      .insert(uploadedFiles)
      .values({
        teacherId: actorId,
        classId,
        scope: 'private',
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath: file.path.replace(/\\/g, '/'),
      })
      .returning();

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.attachment.uploaded',
      targetType: 'uploaded_file',
      targetId: savedFile.id,
      metadata: {
        classId,
        mimeType: savedFile.mimeType,
        sizeBytes: savedFile.sizeBytes,
      },
    });

    return savedFile;
  }

  async uploadCommentImageFile(
    classId: string,
    threadId: string,
    actorId: string,
    roles: string[],
    file: Express.Multer.File,
  ) {
    const { thread, access } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );
    this.assertStudentInteractive(access);
    this.assertThreadCommentable(thread);

    const mimeType = file.mimetype.toLowerCase();
    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('Comment attachments only support images.');
    }

    const [savedFile] = await this.db
      .insert(uploadedFiles)
      .values({
        teacherId: actorId,
        classId,
        scope: 'private',
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath: file.path.replace(/\\/g, '/'),
      })
      .returning();

    await this.auditService.log({
      actorId,
      action: 'discussion.comment.attachment.uploaded',
      targetType: 'uploaded_file',
      targetId: savedFile.id,
      metadata: {
        classId,
        threadId: thread.id,
        mimeType: savedFile.mimeType,
        sizeBytes: savedFile.sizeBytes,
      },
    });

    return savedFile;
  }

  async getThreadAttachmentFile(
    classId: string,
    threadId: string,
    attachmentId: string,
    actorId: string,
    roles: string[],
    mode: 'inline' | 'download',
  ) {
    const { thread } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );

    const attachment =
      await this.db.query.discussionThreadAttachments.findFirst({
        where: and(
          eq(discussionThreadAttachments.id, attachmentId),
          eq(discussionThreadAttachments.threadId, thread.id),
        ),
        columns: {
          id: true,
          fileId: true,
          attachmentType: true,
        },
      });

    if (
      !attachment ||
      !attachment.fileId ||
      attachment.attachmentType === 'link'
    ) {
      throw new NotFoundException('Thread attachment file not found.');
    }

    const file = await this.db.query.uploadedFiles.findFirst({
      where: and(
        eq(uploadedFiles.id, attachment.fileId),
        isNull(uploadedFiles.deletedAt),
      ),
      columns: {
        id: true,
        originalName: true,
        mimeType: true,
        filePath: true,
      },
    });

    if (!file) {
      throw new NotFoundException('Attachment file no longer exists.');
    }

    await this.auditService.log({
      actorId,
      action: 'discussion.thread.attachment.accessed',
      targetType: 'uploaded_file',
      targetId: file.id,
      metadata: {
        classId,
        threadId: thread.id,
        mode,
      },
    });

    return file;
  }

  async getCommentAttachmentFile(
    classId: string,
    threadId: string,
    commentId: string,
    attachmentId: string,
    actorId: string,
    roles: string[],
    mode: 'inline' | 'download',
  ) {
    const { thread } = await this.getThreadOrThrow(
      classId,
      threadId,
      actorId,
      roles,
    );

    const comment = await this.db.query.discussionComments.findFirst({
      where: and(
        eq(discussionComments.id, commentId),
        eq(discussionComments.threadId, thread.id),
        isNull(discussionComments.deletedAt),
      ),
      columns: {
        id: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Discussion comment not found.');
    }

    const attachment =
      await this.db.query.discussionCommentAttachments.findFirst({
        where: and(
          eq(discussionCommentAttachments.id, attachmentId),
          eq(discussionCommentAttachments.commentId, comment.id),
        ),
        columns: {
          id: true,
          fileId: true,
        },
      });

    if (!attachment) {
      throw new NotFoundException('Comment attachment file not found.');
    }

    const file = await this.db.query.uploadedFiles.findFirst({
      where: and(
        eq(uploadedFiles.id, attachment.fileId),
        isNull(uploadedFiles.deletedAt),
      ),
      columns: {
        id: true,
        originalName: true,
        mimeType: true,
        filePath: true,
      },
    });

    if (!file) {
      throw new NotFoundException('Attachment file no longer exists.');
    }

    await this.auditService.log({
      actorId,
      action: 'discussion.comment.attachment.accessed',
      targetType: 'uploaded_file',
      targetId: file.id,
      metadata: {
        classId,
        threadId: thread.id,
        commentId: comment.id,
        mode,
      },
    });

    return file;
  }

  getThreadNotificationPreview(bodyHtml: string) {
    return stripHtml(bodyHtml).slice(0, 220);
  }
}
