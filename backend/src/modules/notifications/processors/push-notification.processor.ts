import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';
import { and, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { notificationDevices, notifications } from '../../../drizzle/schema';
import { runSystemResetWork } from '../../system-reset/system-reset.work';
import { ExpoPushProvider, type ExpoPushMessage } from '../expo-push.provider';
import { NotificationDevicesService } from '../notification-devices.service';
import {
  CHECK_PUSH_RECEIPTS_JOB,
  DELIVER_PUSH_NOTIFICATION_JOB,
  PUSH_NOTIFICATION_QUEUE,
  PushNotificationDispatchService,
} from '../push-notification-dispatch.service';
import { PushTokenProtectionService } from '../push-token-protection.service';

type DeliverJob = { notificationId: string };
type ReceiptJob = {
  notificationId: string;
  tickets: Array<{ deviceId: string; ticketId: string }>;
};

@Processor(PUSH_NOTIFICATION_QUEUE, { concurrency: 5 })
export class PushNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(PushNotificationProcessor.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenProtection: PushTokenProtectionService,
    private readonly provider: ExpoPushProvider,
    private readonly notificationDevicesService: NotificationDevicesService,
    private readonly dispatch: PushNotificationDispatchService,
    @Optional() private readonly modules?: ModuleRef,
  ) {
    super();
  }

  private get db() {
    return this.databaseService.db;
  }

  async process(job: Job<DeliverJob | ReceiptJob>): Promise<void> {
    return runSystemResetWork(this.modules, () => this.processAdmitted(job));
  }

  private async processAdmitted(job: Job<DeliverJob | ReceiptJob>) {
    if (job.name === DELIVER_PUSH_NOTIFICATION_JOB) {
      await this.deliver(job.data as DeliverJob);
      return;
    }
    if (job.name === CHECK_PUSH_RECEIPTS_JOB) {
      await this.checkReceipts(job.data as ReceiptJob);
      return;
    }
    throw new UnrecoverableError(`Unsupported push job: ${job.name}`);
  }

  private async deliver(data: DeliverJob): Promise<void> {
    const notification = await this.db.query.notifications.findFirst({
      where: eq(notifications.id, data.notificationId),
      columns: {
        id: true,
        userId: true,
        type: true,
        title: true,
        body: true,
        referenceId: true,
        metadata: true,
      },
    });
    if (!notification) return;

    const devices = await this.db.query.notificationDevices.findMany({
      where: and(
        eq(notificationDevices.userId, notification.userId),
        eq(notificationDevices.notificationsEnabled, true),
        isNull(notificationDevices.disabledAt),
      ),
      columns: {
        id: true,
        userId: true,
        installationId: true,
        pushTokenCiphertext: true,
      },
    });
    if (devices.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    const unreadableDeviceIds: string[] = [];
    const metadata =
      notification.metadata && typeof notification.metadata === 'object'
        ? (notification.metadata as Record<string, unknown>)
        : {};
    for (const device of devices) {
      try {
        const token = this.tokenProtection.reveal(
          device.pushTokenCiphertext,
          `${device.userId}:${device.installationId}`,
        );
        messages.push({
          deviceId: device.id,
          token,
          title: notification.title,
          body: notification.body,
          data: {
            notificationId: notification.id,
            type: notification.type,
            ...(notification.referenceId
              ? { referenceId: notification.referenceId }
              : {}),
            ...(typeof metadata.classId === 'string'
              ? { classId: metadata.classId }
              : {}),
          },
        });
      } catch {
        unreadableDeviceIds.push(device.id);
      }
    }

    await this.notificationDevicesService.disableByIds(
      unreadableDeviceIds,
      'decryption_failed',
    );
    if (messages.length === 0) return;

    const result = await this.provider.send(messages);
    if (result.status === 'disabled') return;
    const invalidDeviceIds = result.tickets
      .filter((ticket) => ticket.status === 'invalid')
      .map((ticket) => ticket.deviceId);
    await this.notificationDevicesService.disableByIds(
      invalidDeviceIds,
      'invalid_token',
    );
    const receiptTickets = result.tickets.flatMap((ticket) =>
      ticket.status === 'ok' && ticket.ticketId
        ? [{ deviceId: ticket.deviceId, ticketId: ticket.ticketId }]
        : [],
    );
    await this.dispatch.enqueueReceiptCheck(notification.id, receiptTickets);
    this.logger.log(
      `[push-delivery] attempted=${messages.length} accepted=${receiptTickets.length} invalid=${invalidDeviceIds.length}`,
    );
  }

  private async checkReceipts(data: ReceiptJob): Promise<void> {
    if (data.tickets.length === 0) return;
    const receipts = await this.provider.receipts(
      data.tickets.map((ticket) => ticket.ticketId),
    );
    const invalidDeviceIds = data.tickets
      .filter((ticket) => receipts[ticket.ticketId] === 'DeviceNotRegistered')
      .map((ticket) => ticket.deviceId);
    await this.notificationDevicesService.disableByIds(
      invalidDeviceIds,
      'invalid_token',
    );
    this.logger.log(
      `[push-receipts] checked=${data.tickets.length} invalid=${invalidDeviceIds.length}`,
    );
  }
}
