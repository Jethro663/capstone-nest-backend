import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { CreatedNotification } from './notifications.service';

export const PUSH_NOTIFICATION_QUEUE = 'notification-push';
export const DELIVER_PUSH_NOTIFICATION_JOB = 'deliver-push-notification';
export const CHECK_PUSH_RECEIPTS_JOB = 'check-push-receipts';

@Injectable()
export class PushNotificationDispatchService {
  private readonly logger = new Logger(PushNotificationDispatchService.name);

  constructor(
    @InjectQueue(PUSH_NOTIFICATION_QUEUE)
    private readonly pushQueue: Queue,
  ) {}

  async enqueueCreated(notifications: CreatedNotification[]): Promise<void> {
    for (const notification of notifications) {
      try {
        await this.pushQueue.add(
          DELIVER_PUSH_NOTIFICATION_JOB,
          { notificationId: notification.id },
          {
            jobId: `push-${notification.id}`,
            attempts: 4,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } catch {
        this.logger.warn(
          '[push-dispatch] Queue unavailable; durable inbox delivery remains authoritative.',
        );
      }
    }
  }

  async enqueueReceiptCheck(
    notificationId: string,
    tickets: Array<{ deviceId: string; ticketId: string }>,
  ): Promise<void> {
    if (tickets.length === 0) return;
    try {
      await this.pushQueue.add(
        CHECK_PUSH_RECEIPTS_JOB,
        { notificationId, tickets },
        {
          jobId: `push-receipts-${notificationId}`,
          delay: 15 * 60 * 1000,
          attempts: 4,
          backoff: { type: 'exponential', delay: 15_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch {
      this.logger.warn(
        '[push-receipts] Queue unavailable after provider acceptance; skipping receipt polling to avoid duplicate delivery.',
      );
    }
  }
}
