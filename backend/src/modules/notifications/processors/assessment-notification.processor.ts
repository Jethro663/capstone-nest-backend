import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import {
  assessmentAttempts,
  classes,
  enrollments,
} from '../../../drizzle/schema';
import {
  ASSESSMENT_ASSIGNED_JOB,
  ASSESSMENT_DUE_REMINDER_JOB,
} from '../assessment-notification-dispatch.service';
import {
  CreateNotificationInput,
  NotificationsService,
} from '../notifications.service';
import { NotificationsGateway } from '../notifications.gateway';

interface AssessmentNotificationJobData {
  assessmentId: string;
  classId: string;
  title: string;
  dueDate?: string | null;
}

@Processor('notifications')
export class AssessmentNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(AssessmentNotificationProcessor.name);

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

  async process(job: Job<AssessmentNotificationJobData>): Promise<void> {
    if (job.name === ASSESSMENT_ASSIGNED_JOB) {
      await this.notifyAssessmentAssigned(job.data);
      return;
    }

    if (job.name === ASSESSMENT_DUE_REMINDER_JOB) {
      await this.notifyAssessmentDue(job.data);
      return;
    }

    this.logger.warn(`[assessment-notifications] Unknown job ${job.name}`);
  }

  private async notifyAssessmentAssigned(
    data: AssessmentNotificationJobData,
  ): Promise<void> {
    const studentIds = await this.getEnrolledStudentIds(data.classId);
    if (studentIds.length === 0) return;

    await this.createAndEmit(
      studentIds.map((userId) => ({
        userId,
        type: 'assessment_assigned' as const,
        referenceId: data.assessmentId,
        title: `New assessment: ${data.title}`,
        body: 'A new assessment is available in your class.',
      })),
    );
  }

  private async notifyAssessmentDue(
    data: AssessmentNotificationJobData,
  ): Promise<void> {
    const studentIds = await this.getEnrolledStudentIds(data.classId);
    if (studentIds.length === 0) return;

    const submittedStudentIds = await this.getSubmittedStudentIds(
      data.assessmentId,
      studentIds,
    );
    const unsubmittedStudentIds = studentIds.filter(
      (studentId) => !submittedStudentIds.has(studentId),
    );
    if (unsubmittedStudentIds.length === 0) return;

    await this.createAndEmit(
      unsubmittedStudentIds.map((userId) => ({
        userId,
        type: 'assessment_due' as const,
        referenceId: data.assessmentId,
        title: `Due tomorrow: ${data.title}`,
        body: 'This assessment is due in about 24 hours.',
      })),
    );
  }

  private async createAndEmit(
    inputs: CreateNotificationInput[],
  ): Promise<void> {
    const inserted = await this.notificationsService.createBulkDeduped(inputs);
    const now = new Date();

    for (const input of inserted) {
      this.notificationsGateway.emitToUser(input.userId, {
        id:
          input.referenceId ?? `${input.type}:${input.userId}:${now.getTime()}`,
        type: input.type,
        title: input.title,
        body: input.body,
        referenceId: input.referenceId,
        createdAt: now,
      });
    }
  }

  private async getEnrolledStudentIds(classId: string): Promise<string[]> {
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, isActive: true },
      with: {
        section: {
          columns: { id: true, isActive: true },
        },
      },
    });

    if (!classRecord?.isActive || classRecord.section?.isActive === false) {
      this.logger.warn(
        '[assessment-notifications] Class ' +
          classId +
          ' is archived or inactive. Skipping.',
      );
      return [];
    }

    const enrolledRows = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
    });

    return enrolledRows.map((row) => row.studentId);
  }

  private async getSubmittedStudentIds(
    assessmentId: string,
    studentIds: string[],
  ): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set();

    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.isSubmitted, true),
        inArray(assessmentAttempts.studentId, studentIds),
      ),
      columns: { studentId: true },
    });

    return new Set(attempts.map((attempt) => attempt.studentId));
  }
}
