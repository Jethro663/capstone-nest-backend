import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const ASSESSMENT_ASSIGNED_JOB = 'assessment-assigned';
export const ASSESSMENT_DUE_REMINDER_JOB = 'assessment-due-reminder';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface AssessmentNotificationDispatchInput {
  id: string;
  classId: string;
  title: string;
  dueDate?: Date | string | null;
  isPublished?: boolean | null;
}

interface AssessmentNotificationJobData {
  assessmentId: string;
  classId: string;
  title: string;
  dueDate?: string | null;
}

@Injectable()
export class AssessmentNotificationDispatchService {
  constructor(
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue<AssessmentNotificationJobData>,
  ) {}

  async enqueueAssessmentAssigned(
    assessment: AssessmentNotificationDispatchInput,
  ): Promise<void> {
    await this.notificationsQueue.add(
      ASSESSMENT_ASSIGNED_JOB,
      this.toJobData(assessment),
      {
        jobId: `${ASSESSMENT_ASSIGNED_JOB}:${assessment.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async rescheduleAssessmentDueReminder(
    assessment: AssessmentNotificationDispatchInput,
  ): Promise<void> {
    await this.removeAssessmentDueReminder(assessment.id);

    if (!assessment.isPublished || !assessment.dueDate) return;

    const dueDate = new Date(assessment.dueDate);
    if (Number.isNaN(dueDate.getTime())) return;

    const now = Date.now();
    if (dueDate.getTime() <= now) return;

    const delay = Math.max(0, dueDate.getTime() - now - ONE_DAY_MS);

    await this.notificationsQueue.add(
      ASSESSMENT_DUE_REMINDER_JOB,
      this.toJobData(assessment),
      {
        jobId: `${ASSESSMENT_DUE_REMINDER_JOB}:${assessment.id}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async removeAssessmentDueReminder(assessmentId: string): Promise<void> {
    const existingJob = await this.notificationsQueue.getJob(
      `${ASSESSMENT_DUE_REMINDER_JOB}:${assessmentId}`,
    );
    await existingJob?.remove();
  }

  private toJobData(
    assessment: AssessmentNotificationDispatchInput,
  ): AssessmentNotificationJobData {
    return {
      assessmentId: assessment.id,
      classId: assessment.classId,
      title: assessment.title,
      dueDate: assessment.dueDate
        ? new Date(assessment.dueDate).toISOString()
        : null,
    };
  }
}
