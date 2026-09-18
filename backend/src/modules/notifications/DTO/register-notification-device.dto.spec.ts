import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterNotificationDeviceDto } from './register-notification-device.dto';

describe('RegisterNotificationDeviceDto', () => {
  it('accepts a bounded Expo installation registration', async () => {
    const dto = plainToInstance(RegisterNotificationDeviceDto, {
      platform: 'android',
      provider: 'expo',
      pushToken: 'ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]',
      notificationsEnabled: true,
      appVersion: '0.1.45',
      buildNumber: 46,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects unsupported providers and malformed push tokens', async () => {
    const dto = plainToInstance(RegisterNotificationDeviceDto, {
      platform: 'android',
      provider: 'raw-fcm',
      pushToken: 'not-a-push-token',
      notificationsEnabled: true,
      appVersion: '0.1.45',
      buildNumber: 46,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['provider', 'pushToken']),
    );
  });
});
