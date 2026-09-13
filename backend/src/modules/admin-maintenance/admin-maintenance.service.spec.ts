import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS,
  type OpenAdminMaintenanceSessionDto,
} from './DTO/admin-maintenance.dto';
import { AdminMaintenanceService } from './admin-maintenance.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const NOW = new Date('2026-09-13T04:00:00.000Z');
const FUTURE = new Date('2026-09-13T04:15:00.000Z');
const PAST = new Date('2026-09-13T03:59:59.000Z');
const ACTOR_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_ADMIN_ID = '10000000-0000-4000-8000-000000000002';
const SESSION_ID = '20000000-0000-4000-8000-000000000001';

const makeActor = (overrides: Record<string, unknown> = {}) => ({
  id: ACTOR_ID,
  email: 'admin@example.test',
  firstName: 'Maintenance',
  lastName: 'Admin',
  password: 'hash',
  status: 'ACTIVE',
  isEmailVerified: true,
  sessionVersion: 4,
  userRoles: [{ role: { name: 'admin' } }],
  ...overrides,
});

const makeSession = (overrides: Record<string, unknown> = {}) => ({
  id: SESSION_ID,
  actorUserId: ACTOR_ID,
  actorSessionVersion: 4,
  status: 'ACTIVE',
  scopeCodes: ['ACADEMIC_STRUCTURE', 'ROSTER', 'ACCOUNT_LIFECYCLE'],
  reason: 'Prepare a clean academic presentation.',
  startedAt: NOW,
  expiresAt: FUTURE,
  lastUsedAt: NOW,
  closedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

function setup(enabled = true) {
  const sessionFindFirst = jest.fn();
  const userFindFirst = jest.fn().mockResolvedValue(makeActor());
  const resetStateFindFirst = jest.fn().mockResolvedValue(undefined);
  const returning = jest.fn().mockResolvedValue([makeSession()]);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const values = jest.fn().mockReturnValue({ returning });
  const insert = jest.fn().mockReturnValue({ values });
  const db: any = {
    query: {
      adminMaintenanceSessions: { findFirst: sessionFindFirst },
      users: { findFirst: userFindFirst },
      systemResetState: { findFirst: resetStateFindFirst },
    },
    insert,
    update,
  };
  db.transaction = jest.fn((work: (tx: typeof db) => unknown) =>
    Promise.resolve(work(db)),
  );
  const config = {
    get: jest.fn((key: string, fallback: unknown) => {
      if (key === 'adminMaintenance.enabled') return enabled;
      if (key === 'adminMaintenance.durationMinutes') return 15;
      return fallback;
    }),
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-id' }) };
  const service = new AdminMaintenanceService(
    { db } as any,
    config as any,
    audit as any,
    () => new Date(NOW),
  );
  return {
    service,
    sessionFindFirst,
    userFindFirst,
    resetStateFindFirst,
    returning,
    set,
    update,
    insert,
    config,
    audit,
  };
}

const openDto = (): OpenAdminMaintenanceSessionDto => ({
  currentPassword: 'Maintenance!456',
  confirmation: 'OPEN MAINTENANCE ACCESS',
  reason: 'Prepare a clean academic presentation.',
  acknowledgements: [...REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS],
});

describe('AdminMaintenanceService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('returns only the authenticated actor maintenance status', async () => {
    const { service, sessionFindFirst, userFindFirst } = setup();
    sessionFindFirst.mockResolvedValue(makeSession());

    await expect(service.getStatus(ACTOR_ID)).resolves.toMatchObject({
      active: true,
      state: 'active',
      sessionId: SESSION_ID,
      expiresAt: FUTURE.toISOString(),
    });

    userFindFirst.mockResolvedValue(makeActor({ id: OTHER_ADMIN_ID }));
    sessionFindFirst.mockResolvedValue(null);
    await expect(service.getStatus(OTHER_ADMIN_ID)).resolves.toMatchObject({
      active: false,
      state: 'inactive',
      sessionId: null,
    });
  });

  it.each([
    ['expired', makeSession({ expiresAt: PAST })],
    ['closed', makeSession({ status: 'CLOSED', closedAt: NOW })],
    ['session version changed', makeSession({ actorSessionVersion: 3 })],
  ])('fails closed when the session is %s', async (_label, row) => {
    const { service, sessionFindFirst, returning } = setup();
    sessionFindFirst.mockResolvedValue(row);
    if (row.status === 'ACTIVE') {
      returning.mockResolvedValueOnce([
        {
          ...row,
          status: _label === 'expired' ? 'EXPIRED' : 'REVOKED',
          closedAt: NOW,
        },
      ]);
    }
    const context = await service.resolveForActor(ACTOR_ID, ['admin']);
    expect(context.active).toBe(false);
    expect(context.allows('schedule_collision')).toBe(false);
  });

  it('never grants maintenance rules to a teacher', async () => {
    const { service, sessionFindFirst } = setup();
    sessionFindFirst.mockResolvedValue(makeSession());
    const context = await service.resolveForActor(ACTOR_ID, ['teacher']);
    expect(context.active).toBe(false);
    expect(context.allows('section_capacity')).toBe(false);
  });

  it('fails closed when session state cannot be read', async () => {
    const { service, sessionFindFirst } = setup();
    sessionFindFirst.mockRejectedValue(new Error('database unavailable'));
    const context = await service.resolveForActor(ACTOR_ID, ['admin']);
    expect(context.active).toBe(false);
    expect(context.audit(['section_capacity'])).toBeUndefined();
  });

  it('rejects opening when maintenance is unavailable', async () => {
    const { service } = setup(false);
    await expect(
      service.open(openDto(), ACTOR_ID, ['admin']),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects opening for a non-admin actor', async () => {
    const { service } = setup();
    await expect(
      service.open(openDto(), ACTOR_ID, ['teacher']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects opening when the password is wrong', async () => {
    const { service, insert } = setup();
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.open(openDto(), ACTOR_ID, ['admin']),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects an incomplete acknowledgement set', async () => {
    const { service } = setup();
    const dto = openDto();
    dto.acknowledgements = dto.acknowledgements.slice(0, 1);
    await expect(service.open(dto, ACTOR_ID, ['admin'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects opening while Full Reset maintenance is active', async () => {
    const { service, resetStateFindFirst, insert } = setup();
    resetStateFindFirst.mockResolvedValue({ active: true });
    await expect(
      service.open(openDto(), ACTOR_ID, ['admin']),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('opens a 15-minute actor-bound session with fixed server scopes', async () => {
    const { service, returning, set, audit } = setup();
    returning.mockResolvedValueOnce([]).mockResolvedValueOnce([makeSession()]);

    await expect(
      service.open(openDto(), ACTOR_ID, ['admin']),
    ).resolves.toMatchObject({
      active: true,
      state: 'active',
      expiresAt: FUTURE.toISOString(),
      scopeCodes: ['ACADEMIC_STRUCTURE', 'ROSTER', 'ACCOUNT_LIFECYCLE'],
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REVOKED', closedAt: NOW }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_MAINTENANCE_OPENED',
        metadata: expect.objectContaining({ revokedSessionIds: [] }),
      }),
      dbContainingTransaction(),
    );
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain(
      'Maintenance!456',
    );
  });

  it('deduplicates server-owned warning codes in audit metadata', async () => {
    const { service, sessionFindFirst, set } = setup();
    sessionFindFirst.mockResolvedValue(makeSession());
    const context = await service.resolveForActor(ACTOR_ID, ['admin']);
    expect(context.allows('schedule_collision')).toBe(true);
    expect(context.audit(['schedule_collision', 'schedule_collision'])).toEqual(
      {
        maintenanceSessionId: SESSION_ID,
        maintenanceExpiresAt: FUTURE.toISOString(),
        maintenanceRuleCodes: ['schedule_collision'],
      },
    );
    expect(set).toHaveBeenCalledWith({ lastUsedAt: NOW, updatedAt: NOW });
  });

  it('closes only the actor active session and audits the close', async () => {
    const { service, returning, audit } = setup();
    returning.mockResolvedValue([
      makeSession({ status: 'CLOSED', closedAt: NOW }),
    ]);
    await expect(service.close(ACTOR_ID)).resolves.toMatchObject({
      active: false,
      state: 'inactive',
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_MAINTENANCE_CLOSED' }),
      dbContainingTransaction(),
    );
  });

  it('persists and audits session expiry before reporting expired state', async () => {
    const { service, sessionFindFirst, returning, audit, set } = setup();
    const expired = makeSession({ expiresAt: PAST });
    sessionFindFirst.mockResolvedValue(expired);
    returning.mockResolvedValueOnce([
      { ...expired, status: 'EXPIRED', closedAt: NOW },
    ]);

    await expect(service.getStatus(ACTOR_ID, ['admin'])).resolves.toMatchObject(
      {
        active: false,
        state: 'expired',
      },
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'EXPIRED', closedAt: NOW }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_MAINTENANCE_EXPIRED',
        metadata: expect.objectContaining({ cause: 'SESSION_EXPIRED' }),
      }),
      dbContainingTransaction(),
    );
  });

  it('does not report a newly opened session when its audit write fails', async () => {
    const { service, returning, audit } = setup();
    returning.mockResolvedValueOnce([]).mockResolvedValueOnce([makeSession()]);
    audit.log.mockRejectedValueOnce(new Error('audit insert failed'));

    await expect(service.open(openDto(), ACTOR_ID, ['admin'])).rejects.toThrow(
      'audit insert failed',
    );
  });

  it('requires the exact active actor-bound session at the mutation boundary', async () => {
    const { service, sessionFindFirst, returning } = setup();
    sessionFindFirst.mockResolvedValue(makeSession());
    returning.mockResolvedValue([makeSession()]);

    await expect(
      service.requireActiveSession(ACTOR_ID, ['admin'], SESSION_ID),
    ).resolves.toMatchObject({ active: true, sessionId: SESSION_ID });
    await expect(
      service.requireActiveSession(
        ACTOR_ID,
        ['admin'],
        '20000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MAINTENANCE_SESSION_REQUIRED',
      }),
    });
  });
});

function dbContainingTransaction() {
  return expect.objectContaining({ transaction: expect.any(Function) });
}
