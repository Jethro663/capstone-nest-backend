import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all origins in development; tighten in prod via env var
      callback(null, true);
    },
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('NotificationsGateway initialized (/notifications)');
  }

  async handleConnection(client: Socket) {
    try {
      // Client must pass token in handshake: { auth: { token: 'Bearer eyJ...' } }
      const rawToken: string =
        client.handshake?.auth?.token || client.handshake?.headers?.authorization || '';

      const token = rawToken.startsWith('Bearer ')
        ? rawToken.slice(7)
        : rawToken;

      if (!token) {
        this.logger.warn(`[WS] No token — disconnecting ${client.id}`);
        client.emit('error', { message: 'Unauthorized: no token provided.' });
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('jwt.secret');
      const payload = this.jwtService.verify<{ userId: string; type: string }>(
        token,
        { secret },
      );

      if (payload.type !== 'access') {
        throw new Error('Token type must be access');
      }

      // Subscribe this socket to a user-specific room so we can target it
      client.join(`user:${payload.userId}`);
      client.data.userId = payload.userId;

      this.logger.log(
        `[WS] Connected: ${client.id} → user:${payload.userId}`,
      );
    } catch (err) {
      this.logger.warn(`[WS] Auth failed for ${client.id}: ${err.message}`);
      client.emit('error', { message: 'Unauthorized: invalid token.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[WS] Disconnected: ${client.id} (user:${client.data?.userId ?? 'unknown'})`,
    );
  }

  /**
   * Called by AnnouncementFanOutProcessor to push a real-time notification
   * to a specific user. If the user is not connected, this is a no-op —
   * the notification row in DB acts as the offline fallback.
   */
  emitToUser(
    userId: string,
    payload: {
      id: string;
      type: string;
      title: string;
      body: string;
      referenceId?: string;
      createdAt: Date;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('notification.new', payload);
  }
}
