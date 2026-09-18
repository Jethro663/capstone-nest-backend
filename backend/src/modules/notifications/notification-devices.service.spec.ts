import { ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { NotificationDevicesService } from './notification-devices.service';
import { PushTokenProtectionService } from './push-token-protection.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const INSTALLATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('NotificationDevicesService', () => {
  let service: NotificationDevicesService;
  let db: any;
  let insertChain: any;
  let updateChain: any;
  const protection = {
    protect: jest.fn(() => ({
      ciphertext: 'v1:encrypted',
      fingerprint: 'f'.repeat(64),
    })),
  };

  beforeEach(() => {
    insertChain = {
      values: jest.fn(),
      onConflictDoUpdate: jest.fn(),
      returning: jest.fn(),
    };
    insertChain.values.mockReturnValue(insertChain);
    insertChain.onConflictDoUpdate.mockReturnValue(insertChain);
    insertChain.returning.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        userId: USER_ID,
        installationId: INSTALLATION_ID,
        platform: 'android',
        provider: 'expo',
        pushTokenCiphertext: 'v1:encrypted',
        tokenFingerprint: 'f'.repeat(64),
        appVersion: '0.1.45',
        buildNumber: 46,
        notificationsEnabled: true,
        lastSeenAt: new Date('2026-09-18T00:00:00.000Z'),
        disabledAt: null,
        disableReason: null,
        createdAt: new Date('2026-09-18T00:00:00.000Z'),
        updatedAt: new Date('2026-09-18T00:00:00.000Z'),
      },
    ]);
    updateChain = {
      set: jest.fn(),
      where: jest.fn(),
      returning: jest.fn(),
    };
    updateChain.set.mockReturnValue(updateChain);
    updateChain.where.mockReturnValue(updateChain);
    updateChain.returning.mockResolvedValue([]);
    db = {
      query: { notificationDevices: { findFirst: jest.fn() } },
      insert: jest.fn().mockReturnValue(insertChain),
      update: jest.fn().mockReturnValue(updateChain),
    };
    service = new NotificationDevicesService(
      { db } as DatabaseService,
      protection as unknown as PushTokenProtectionService,
    );
    jest.clearAllMocks();
  });

  it('idempotently upserts an installation for the authenticated user without returning secrets', async () => {
    db.query.notificationDevices.findFirst.mockResolvedValue(null);

    const result = await service.register(USER_ID, INSTALLATION_ID, {
      platform: 'android',
      provider: 'expo',
      pushToken: 'ExponentPushToken[secret]',
      notificationsEnabled: true,
      appVersion: '0.1.45',
      buildNumber: 46,
    });

    expect(protection.protect).toHaveBeenCalledWith(
      'ExponentPushToken[secret]',
      `${USER_ID}:${INSTALLATION_ID}`,
    );
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.any(Array),
        set: expect.objectContaining({
          pushTokenCiphertext: 'v1:encrypted',
          tokenFingerprint: 'f'.repeat(64),
          notificationsEnabled: true,
          disabledAt: null,
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(result).not.toHaveProperty('pushTokenCiphertext');
    expect(result).not.toHaveProperty('tokenFingerprint');
  });

  it('rejects an active token already owned by another account or installation', async () => {
    db.query.notificationDevices.findFirst.mockResolvedValue({
      userId: OTHER_USER_ID,
      installationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    await expect(
      service.register(USER_ID, INSTALLATION_ID, {
        platform: 'ios',
        provider: 'expo',
        pushToken: 'ExponentPushToken[secret]',
        notificationsEnabled: true,
        appVersion: '0.1.45',
        buildNumber: 46,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('revokes only the authenticated user installation and remains idempotent', async () => {
    await expect(
      service.revoke(USER_ID, INSTALLATION_ID, 'logout'),
    ).resolves.toEqual({
      installationId: INSTALLATION_ID,
      notificationsEnabled: false,
      disabled: true,
    });

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationsEnabled: false,
        disableReason: 'logout',
        disabledAt: expect.any(Date),
      }),
    );
    expect(updateChain.where).toHaveBeenCalledWith(expect.anything());
  });
});
