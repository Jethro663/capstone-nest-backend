import { ConflictException, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { notificationDevices } from '../../drizzle/schema';
import { RegisterNotificationDeviceDto } from './DTO/register-notification-device.dto';
import { PushTokenProtectionService } from './push-token-protection.service';

@Injectable()
export class NotificationDevicesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenProtection: PushTokenProtectionService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  async register(
    userId: string,
    installationId: string,
    input: RegisterNotificationDeviceDto,
  ) {
    const ownerBinding = `${userId}:${installationId}`;
    const protectedToken = this.tokenProtection.protect(
      input.pushToken,
      ownerBinding,
    );
    const tokenOwner = await this.db.query.notificationDevices.findFirst({
      where: and(
        eq(notificationDevices.tokenFingerprint, protectedToken.fingerprint),
        eq(notificationDevices.notificationsEnabled, true),
        isNull(notificationDevices.disabledAt),
      ),
      columns: { userId: true, installationId: true },
    });
    if (
      tokenOwner &&
      (tokenOwner.userId !== userId ||
        tokenOwner.installationId !== installationId)
    ) {
      throw new ConflictException(
        'This push installation is already registered to another session.',
      );
    }

    const now = new Date();
    const [row] = await this.db
      .insert(notificationDevices)
      .values({
        userId,
        installationId,
        platform: input.platform,
        provider: input.provider,
        pushTokenCiphertext: protectedToken.ciphertext,
        tokenFingerprint: protectedToken.fingerprint,
        appVersion: input.appVersion,
        buildNumber: input.buildNumber,
        notificationsEnabled: input.notificationsEnabled,
        lastSeenAt: now,
        disabledAt: input.notificationsEnabled ? null : now,
        disableReason: input.notificationsEnabled ? null : 'permission_denied',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          notificationDevices.userId,
          notificationDevices.installationId,
        ],
        set: {
          platform: input.platform,
          provider: input.provider,
          pushTokenCiphertext: protectedToken.ciphertext,
          tokenFingerprint: protectedToken.fingerprint,
          appVersion: input.appVersion,
          buildNumber: input.buildNumber,
          notificationsEnabled: input.notificationsEnabled,
          lastSeenAt: now,
          disabledAt: input.notificationsEnabled ? null : now,
          disableReason: input.notificationsEnabled
            ? null
            : 'permission_denied',
          updatedAt: now,
        },
      })
      .returning();

    return this.toPublicDevice(row);
  }

  async revoke(
    userId: string,
    installationId: string,
    reason: 'logout' | 'permission_denied' | 'user_revoke' = 'user_revoke',
  ) {
    const now = new Date();
    await this.db
      .update(notificationDevices)
      .set({
        notificationsEnabled: false,
        disabledAt: now,
        disableReason: reason,
        updatedAt: now,
      })
      .where(
        and(
          eq(notificationDevices.userId, userId),
          eq(notificationDevices.installationId, installationId),
        ),
      )
      .returning({ id: notificationDevices.id });

    return { installationId, notificationsEnabled: false, disabled: true };
  }

  async disableByIds(
    deviceIds: string[],
    reason: 'invalid_token' | 'decryption_failed' | 'account_action',
  ): Promise<void> {
    if (deviceIds.length === 0) return;
    const now = new Date();
    await this.db
      .update(notificationDevices)
      .set({
        notificationsEnabled: false,
        disabledAt: now,
        disableReason: reason,
        updatedAt: now,
      })
      .where(inArray(notificationDevices.id, [...new Set(deviceIds)]));
  }

  private toPublicDevice(row: typeof notificationDevices.$inferSelect) {
    return {
      id: row.id,
      installationId: row.installationId,
      platform: row.platform,
      provider: row.provider,
      appVersion: row.appVersion,
      buildNumber: row.buildNumber,
      notificationsEnabled: row.notificationsEnabled,
      lastSeenAt: row.lastSeenAt,
      disabledAt: row.disabledAt,
      disableReason: row.disableReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
