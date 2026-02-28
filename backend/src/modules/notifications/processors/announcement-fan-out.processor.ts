import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { enrollments } from '../../../drizzle/schema';
import { NotificationsService, CreateNotificationInput } from '../notifications.service';
import { NotificationsGateway } from '../notifications.gateway';

interface FanOutJobData {
  announcementId: string;
  classId: string;
  title: string;
  content: string;
}

@Processor('announcements')
export class AnnouncementFanOutProcessor extends WorkerHost {
  private readonly logger = new Logger(AnnouncementFanOutProcessor.name);

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

  async process(job: Job<FanOutJobData>): Promise<void> {
    const { announcementId, classId, title, content } = job.data;

    this.logger.log(
      `[fan-out] Processing announcement ${announcementId} for class ${classId}`,
    );

    // 1. Fetch all actively enrolled students for this class
    const enrolledRows = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
    });

    if (enrolledRows.length === 0) {
      this.logger.warn(
        `[fan-out] No enrolled students for class ${classId}. Skipping.`,
      );
      return;
    }

    const studentIds = enrolledRows.map((e) => e.studentId);

    // Truncate body for notification preview (first 200 chars, strip HTML)
    const bodyText = content
      .replace(/<[^>]*>/g, '')
      .slice(0, 200)
      .trim();

    // 2. Bulk insert one notification row per student
    const inputs: CreateNotificationInput[] = studentIds.map((userId) => ({
      userId,
      type: 'announcement_posted' as const,
      referenceId: announcementId,
      title,
      body: bodyText,
    }));

    await this.notificationsService.createBulk(inputs);

    const now = new Date();

    // 3. Emit real-time event to every student (if they are online)
    for (const userId of studentIds) {
      this.notificationsGateway.emitToUser(userId, {
        id: announcementId, // referenceId as the identifier on the frontend
        type: 'announcement_posted',
        title,
        body: bodyText,
        referenceId: announcementId,
        createdAt: now,
      });
    }

    this.logger.log(
      `[fan-out] Sent to ${studentIds.length} students for announcement ${announcementId}`,
    );
  }
}
