import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

export type ExpoPushMessage = {
  deviceId: string;
  token: string;
  title: string;
  body: string;
  data: {
    notificationId: string;
    type: string;
    referenceId?: string;
    classId?: string;
  };
};

export type ExpoPushTicket = {
  deviceId: string;
  status: 'ok' | 'invalid' | 'permanent';
  ticketId?: string;
};

@Injectable()
export class ExpoPushProvider {
  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return (
      this.configService
        .get<string>('PUSH_NOTIFICATIONS_ENABLED')
        ?.trim()
        .toLowerCase() === 'true'
    );
  }

  async send(messages: ExpoPushMessage[]): Promise<{
    status: 'disabled' | 'sent';
    tickets: ExpoPushTicket[];
  }> {
    if (!this.isEnabled() || messages.length === 0) {
      return { status: 'disabled', tickets: [] };
    }

    const response = await fetch(EXPO_PUSH_SEND_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(
        messages.map((message) => ({
          to: message.token,
          title: message.title,
          body: message.body,
          sound: 'default',
          priority: 'high',
          data: message.data,
        })),
      ),
    });
    if (!response.ok) {
      throw new Error(
        `Expo push request failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id?: string;
        status?: string;
        details?: { error?: string };
      }>;
    };
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const tickets = messages.map((message, index): ExpoPushTicket => {
      const row = rows[index];
      if (row?.status === 'ok' && row.id) {
        return { deviceId: message.deviceId, status: 'ok', ticketId: row.id };
      }
      return {
        deviceId: message.deviceId,
        status:
          row?.details?.error === 'DeviceNotRegistered'
            ? 'invalid'
            : 'permanent',
      };
    });

    return { status: 'sent', tickets };
  }

  async receipts(ticketIds: string[]): Promise<Record<string, string | null>> {
    if (!this.isEnabled() || ticketIds.length === 0) return {};
    const response = await fetch(EXPO_PUSH_RECEIPTS_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ ids: ticketIds }),
    });
    if (!response.ok) {
      throw new Error(
        `Expo push receipt request failed with status ${response.status}.`,
      );
    }
    const payload = (await response.json()) as {
      data?: Record<string, { status?: string; details?: { error?: string } }>;
    };
    return Object.fromEntries(
      ticketIds.map((ticketId) => [
        ticketId,
        payload.data?.[ticketId]?.details?.error ?? null,
      ]),
    );
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    const accessToken = this.configService.get<string>(
      'EXPO_PUSH_ACCESS_TOKEN',
    );
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }
}
