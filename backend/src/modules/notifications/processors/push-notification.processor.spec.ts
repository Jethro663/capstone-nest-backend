import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';
import { DatabaseService } from '../../../database/database.service';
import { NotificationDevicesService } from '../notification-devices.service';
import { ExpoPushProvider } from '../expo-push.provider';
import { PushNotificationDispatchService } from '../push-notification-dispatch.service';
import { PushTokenProtectionService } from '../push-token-protection.service';
import { PushNotificationProcessor } from './push-notification.processor';

jest.mock('../../system-reset/system-reset.work', () => ({
  runSystemResetWork: (_modules: unknown, work: () => Promise<unknown>) =>
    work(),
}));

describe('PushNotificationProcessor', () => {
  const db = {
    query: {
      notifications: { findFirst: jest.fn() },
      notificationDevices: { findMany: jest.fn() },
    },
  };
  const protection = { reveal: jest.fn(() => 'ExponentPushToken[valid]') };
  const provider = { send: jest.fn(), receipts: jest.fn() };
  const devices = { disableByIds: jest.fn() };
  const dispatch = { enqueueReceiptCheck: jest.fn() };
  let processor: PushNotificationProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new PushNotificationProcessor(
      { db } as unknown as DatabaseService,
      protection as unknown as PushTokenProtectionService,
      provider as unknown as ExpoPushProvider,
      devices as unknown as NotificationDevicesService,
      dispatch as unknown as PushNotificationDispatchService,
    );
  });

  it('fans a durable notification out to active devices with minimal data', async () => {
    db.query.notifications.findFirst.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
      type: 'assessment_assigned',
      title: 'New assessment',
      body: 'A new assessment is available.',
      referenceId: 'assessment-1',
      metadata: { classId: 'class-1', privateGrade: 99 },
    });
    db.query.notificationDevices.findMany.mockResolvedValue([
      {
        id: 'device-1',
        userId: 'user-1',
        installationId: 'install-1',
        pushTokenCiphertext: 'encrypted-1',
      },
      {
        id: 'device-2',
        userId: 'user-1',
        installationId: 'install-2',
        pushTokenCiphertext: 'encrypted-2',
      },
    ]);
    provider.send.mockResolvedValue({
      status: 'sent',
      tickets: [
        { deviceId: 'device-1', status: 'ok', ticketId: 'ticket-1' },
        { deviceId: 'device-2', status: 'invalid' },
      ],
    });

    await processor.process({
      name: 'deliver-push-notification',
      data: { notificationId: 'notification-1' },
    } as Job);

    expect(provider.send).toHaveBeenCalledWith([
      expect.objectContaining({
        deviceId: 'device-1',
        data: {
          notificationId: 'notification-1',
          type: 'assessment_assigned',
          referenceId: 'assessment-1',
          classId: 'class-1',
        },
      }),
      expect.objectContaining({ deviceId: 'device-2' }),
    ]);
    expect(JSON.stringify(provider.send.mock.calls[0][0])).not.toContain(
      'privateGrade',
    );
    expect(devices.disableByIds).toHaveBeenCalledWith(
      ['device-2'],
      'invalid_token',
    );
    expect(dispatch.enqueueReceiptCheck).toHaveBeenCalledWith(
      'notification-1',
      [{ deviceId: 'device-1', ticketId: 'ticket-1' }],
    );
  });

  it('disables tokens rejected by delayed Expo receipts', async () => {
    provider.receipts.mockResolvedValue({
      'ticket-1': 'DeviceNotRegistered',
      'ticket-2': null,
    });

    await processor.process({
      name: 'check-push-receipts',
      data: {
        notificationId: 'notification-1',
        tickets: [
          { deviceId: 'device-1', ticketId: 'ticket-1' },
          { deviceId: 'device-2', ticketId: 'ticket-2' },
        ],
      },
    } as Job);

    expect(devices.disableByIds).toHaveBeenCalledWith(
      ['device-1'],
      'invalid_token',
    );
  });

  it('rejects unsupported jobs without retrying them', async () => {
    await expect(
      processor.process({ name: 'unknown', data: {} } as Job),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });
});
