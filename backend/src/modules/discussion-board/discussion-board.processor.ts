import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { enrollments } from '../../drizzle/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

interface ThreadPublishedJobData {
  classId: string;
  threadId: string;
  title: string;
  bodyHtml: string;
}

interface CommentCreatedJobData {
  classId: string;
  threadId: string;
  commentId: string;
  threadTitle: string;
  commenterId: string;
  classTeacherId: string | null;
}

@Processor('discussion-board')
export class DiscussionBoardProcessor extends WorkerHost {
  private readonly logger = new Logger(DiscussionBoardProcessor.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
  }

  private get db() {
    return this.databaseService.db;
  }

  private stripHtml(input: string) {
    return input
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async process(
    job: Job<ThreadPublishedJobData | CommentCreatedJobData>,
  ): Promise<void> {
    if (job.name === 'thread-published') {
      await this.handleThreadPublished(job as Job<ThreadPublishedJobData>);
      return;
    }

    if (job.name === 'comment-created') {
      await this.handleCommentCreated(job as Job<CommentCreatedJobData>);
      return;
    }

    this.logger.warn(
      `[processor] Unknown discussion-board job "${job.name}" ignored.`,
    );
  }

  private async handleThreadPublished(job: Job<ThreadPublishedJobData>) {
    const { classId, threadId, title, bodyHtml } = job.data;

    const enrolledRows = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
    });

    if (enrolledRows.length === 0) {
      return;
    }

    const preview = this.stripHtml(bodyHtml).slice(0, 200);
    const inputs = enrolledRows.map((row) => ({
      userId: row.studentId,
      type: 'discussion_thread_posted' as const,
      referenceId: threadId,
      title,
      body: preview || 'A new discussion has been posted.',
    }));

    const inserted = await this.notificationsService.createBulkDeduped(inputs);
    const now = new Date();
    for (const notification of inserted) {
      this.notificationsGateway.emitToUser(notification.userId, {
        id: `${threadId}:discussion-thread`,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        referenceId: notification.referenceId,
        createdAt: now,
      });
    }
  }

  private async handleCommentCreated(job: Job<CommentCreatedJobData>) {
    const { classId, threadId, threadTitle, commenterId, classTeacherId } = job.data;
    const enrolledRows = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
    });

    const inputs = enrolledRows
      .filter((row) => row.studentId !== commenterId)
      .map((row) => ({
        userId: row.studentId,
        type: 'discussion_comment_posted' as const,
        referenceId: threadId,
        title: `New replies in "${threadTitle}"`,
        body: 'A new comment was posted in this discussion thread.',
      }));

    if (classTeacherId && classTeacherId !== commenterId) {
      inputs.unshift({
        userId: classTeacherId,
        type: 'discussion_comment_posted',
        referenceId: threadId,
        title: `New replies in "${threadTitle}"`,
        body: 'A student posted a new comment in your discussion thread.',
      });
    }

    const inserted = await this.notificationsService.createBulkDeduped(inputs);

    if (inserted.length === 0) {
      return;
    }

    const now = new Date();
    for (const entry of inserted) {
      this.notificationsGateway.emitToUser(entry.userId, {
        id: `${threadId}:discussion-comment:${entry.userId}`,
        type: entry.type,
        title: entry.title,
        body: entry.body,
        referenceId: entry.referenceId,
        createdAt: now,
      });
    }
  }
}
