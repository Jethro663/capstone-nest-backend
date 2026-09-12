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
import { DatabaseService } from '../../database/database.service';
import { systemResetState, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { Interval } from '@nestjs/schedule';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
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
    private readonly database: DatabaseService,
  ) {}

  afterInit() {
    this.logger.log('NotificationsGateway initialized (/notifications)');
  }

  async handleConnection(client: Socket) {
    try {
      // Client must pass token in handshake: { auth: { token: 'Bearer eyJ...' } }
      const rawToken: string =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization ||
        '';

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
      const payload = this.jwtService.verify<{
        userId: string;
        type: string;
        sessionVersion?: number;
      }>(token, { secret });

      if (payload.type !== 'access') {
        throw new Error('Token type must be access');
      }

      const [user, maintenance] = await Promise.all([
        this.database.db.query.users.findFirst({
          where: eq(users.id, payload.userId),
          columns: {
            status: true,
            isEmailVerified: true,
            sessionVersion: true,
          },
        }),
        this.database.db.query.systemResetState.findFirst({
          where: eq(systemResetState.id, 1),
        }),
      ]);
      if (
        !maintenance ||
        maintenance.active ||
        !user ||
        user.status !== 'ACTIVE' ||
        !user.isEmailVerified ||
        (payload.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)
      ) {
        throw new Error('Session unavailable');
      }

      // Subscribe this socket to a user-specific room so we can target it
      await Promise.all([
        client.join(`user:${payload.userId}`),
        client.join(`reset-epoch:${maintenance.epoch}`),
      ]);
      const socketData = client.data as {
        userId?: string;
        resetEpoch?: number;
      };
      socketData.userId = payload.userId;
      socketData.resetEpoch = maintenance.epoch;

      this.logger.log(`[WS] Connected: ${client.id} → user:${payload.userId}`);
    } catch (error) {
      this.logger.warn(
        `[WS] Auth failed for ${client.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Unauthorized: invalid token.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const socketData = client.data as { userId?: string };
    this.logger.log(
      `[WS] Disconnected: ${client.id} (user:${socketData.userId ?? 'unknown'})`,
    );
  }

  @Interval(1000)
  async disconnectResetSessions(): Promise<void> {
    if (!this.server) return;
    try {
      const state = await this.database.db.query.systemResetState.findFirst({
        where: eq(systemResetState.id, 1),
      });
      if (!state || state.active) this.server.disconnectSockets(true);
      else
        this.server
          .except(`reset-epoch:${state.epoch}`)
          .disconnectSockets(true);
    } catch {
      // Loss of the durable session authority is not permission to keep sockets.
      this.server.disconnectSockets(true);
    }
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
      metadata?: Record<string, unknown>;
      createdAt: Date;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('notification.new', payload);
  }
}
