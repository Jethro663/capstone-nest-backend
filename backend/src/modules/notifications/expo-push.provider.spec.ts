import { ConfigService } from '@nestjs/config';
import { ExpoPushProvider } from './expo-push.provider';

describe('ExpoPushProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does no network work while the server kill switch is off', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const provider = new ExpoPushProvider(
      new ConfigService({ PUSH_NOTIFICATIONS_ENABLED: 'false' }),
    );

    await expect(
      provider.send([
        {
          deviceId: 'device-1',
          token: 'ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]',
          title: 'Title',
          body: 'Body',
          data: { notificationId: 'notification-1', type: 'grade_updated' },
        },
      ]),
    ).resolves.toEqual({ status: 'disabled', tickets: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends a minimal payload and classifies invalid-token tickets', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              status: 'error',
              message: 'Device is no longer registered',
              details: { error: 'DeviceNotRegistered' },
            },
          ],
        }),
    } as Response);
    const provider = new ExpoPushProvider(
      new ConfigService({ PUSH_NOTIFICATIONS_ENABLED: 'true' }),
    );

    const result = await provider.send([
      {
        deviceId: 'device-1',
        token: 'ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]',
        title: 'Title',
        body: 'Body',
        data: {
          notificationId: 'notification-1',
          type: 'grade_updated',
          referenceId: 'grade-1',
        },
      },
    ]);

    expect(result).toEqual({
      status: 'sent',
      tickets: [
        expect.objectContaining({
          deviceId: 'device-1',
          status: 'invalid',
        }),
      ],
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = (fetch as jest.Mock).mock.calls[0][1];
    const payload = JSON.parse(String(request.body));
    expect(payload[0]).toEqual(
      expect.objectContaining({
        to: 'ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]',
        title: 'Title',
        body: 'Body',
        data: {
          notificationId: 'notification-1',
          type: 'grade_updated',
          referenceId: 'grade-1',
        },
      }),
    );
    expect(payload[0]).not.toHaveProperty('userId');
  });
});
