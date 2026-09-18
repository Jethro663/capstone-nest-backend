import type { Queue } from 'bullmq';
import { PushNotificationDispatchService } from './push-notification-dispatch.service';

describe('PushNotificationDispatchService', () => {
  it('enqueues only durable notification ids with deterministic job ids', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const service = new PushNotificationDispatchService(
      queue as unknown as Queue,
    );

    await service.enqueueCreated([
      {
        id: 'notification-1',
        userId: 'user-1',
        type: 'announcement_posted',
        title: 'Private title',
        body: 'Private body',
        createdAt: new Date(),
      },
    ]);

    expect(queue.add).toHaveBeenCalledWith(
      'deliver-push-notification',
      { notificationId: 'notification-1' },
      expect.objectContaining({
        jobId: 'push-notification-1',
        attempts: 4,
        backoff: { type: 'exponential', delay: 5_000 },
      }),
    );
    expect(JSON.stringify(queue.add.mock.calls[0])).not.toContain('Private');
  });

  it('absorbs queue outages so durable notification creation remains successful', async () => {
    const queue = { add: jest.fn().mockRejectedValue(new Error('redis down')) };
    const service = new PushNotificationDispatchService(
      queue as unknown as Queue,
    );

    await expect(
      service.enqueueCreated([
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'announcement_posted',
          title: 'Title',
          body: 'Body',
          createdAt: new Date(),
        },
      ]),
    ).resolves.toBeUndefined();
  });

  it('absorbs receipt scheduling outages after Expo already accepted a push', async () => {
    const queue = { add: jest.fn().mockRejectedValue(new Error('redis down')) };
    const service = new PushNotificationDispatchService(
      queue as unknown as Queue,
    );

    await expect(
      service.enqueueReceiptCheck('notification-1', [
        { deviceId: 'device-1', ticketId: 'ticket-1' },
      ]),
    ).resolves.toBeUndefined();
  });
});
