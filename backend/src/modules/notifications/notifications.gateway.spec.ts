import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// ─── Helpers ────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1';

/** Creates a mock Socket.io client */
function makeSocket(overrides: Partial<any> = {}): any {
  return {
    id: 'socket-id-1',
    data: {},
    handshake: {
      auth: { token: 'Bearer valid.jwt.token' },
      headers: {},
    },
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  // Mock server — populated by afterInit
  const mockServer = { to: jest.fn(), emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);

    // Inject mock server
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // handleConnection()
  // ──────────────────────────────────────────────────────────────────────────

  describe('handleConnection()', () => {
    it('joins the user room and stores userId on socket.data when token is valid', async () => {
      mockJwtService.verify.mockReturnValue({
        userId: USER_ID,
        type: 'access',
      });
      const client = makeSocket();

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(client.data.userId).toBe(USER_ID);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects the socket when no token is supplied', async () => {
      const client = makeSocket({ handshake: { auth: {}, headers: {} } });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: expect.stringContaining('no token'),
        }),
      );
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects the socket when token verification throws', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      const client = makeSocket();

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', expect.anything());
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects when token type is not "access"', async () => {
      mockJwtService.verify.mockReturnValue({
        userId: USER_ID,
        type: 'refresh',
      });
      const client = makeSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('strips "Bearer " prefix from token before verifying', async () => {
      mockJwtService.verify.mockReturnValue({
        userId: USER_ID,
        type: 'access',
      });
      const client = makeSocket({
        handshake: { auth: { token: 'Bearer actual.token.here' }, headers: {} },
      });

      await gateway.handleConnection(client);

      const [calledToken] = mockJwtService.verify.mock.calls[0];
      expect(calledToken).toBe('actual.token.here');
      expect(calledToken).not.toContain('Bearer');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // emitToUser()
  // ──────────────────────────────────────────────────────────────────────────

  describe('emitToUser()', () => {
    it('emits notification.new to the correct user room', () => {
      const roomEmitSpy = jest.fn();
      (gateway as any).server.to = jest
        .fn()
        .mockReturnValue({ emit: roomEmitSpy });

      const payload = {
        id: 'ann-1',
        type: 'announcement_posted',
        title: 'Hello',
        body: 'World',
        referenceId: 'ann-1',
        createdAt: new Date(),
      };

      gateway.emitToUser(USER_ID, payload);

      expect((gateway as any).server.to).toHaveBeenCalledWith(
        `user:${USER_ID}`,
      );
      expect(roomEmitSpy).toHaveBeenCalledWith('notification.new', payload);
    });

    it('does not throw if the user room is empty (no connected sockets)', () => {
      // to() returns a room object; even if no sockets are in it, emit is a no-op
      const roomEmitSpy = jest.fn();
      (gateway as any).server.to = jest
        .fn()
        .mockReturnValue({ emit: roomEmitSpy });

      expect(() =>
        gateway.emitToUser('offline-user-id', {
          id: '1',
          type: 'announcement_posted',
          title: 'T',
          body: 'B',
          createdAt: new Date(),
        }),
      ).not.toThrow();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // handleDisconnect()
  // ──────────────────────────────────────────────────────────────────────────

  describe('handleDisconnect()', () => {
    it('runs without error for a connected socket', () => {
      const client = makeSocket({ data: { userId: USER_ID } });

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });

    it('runs without error when socket.data.userId is missing (auth never completed)', () => {
      const client = makeSocket({ data: {} });

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });
});
