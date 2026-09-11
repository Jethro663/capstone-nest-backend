import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ADMIN_DEMO_MODE_STATE_ID } from '../../drizzle/schema';
import {
  REQUIRED_DEMO_ACKNOWLEDGEMENTS,
  type ActivateAdminDemoModeDto,
  type DeactivateAdminDemoModeDto,
} from './DTO/admin-demo-mode.dto';
import { AdminDemoModeService } from './admin-demo-mode.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const NOW = new Date('2026-09-12T04:00:00.000Z');
const FUTURE = new Date('2026-09-12T04:30:00.000Z');
const PAST = new Date('2026-09-12T03:59:59.000Z');
const ACTOR_ID = '10000000-0000-4000-8000-000000000001';

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: ADMIN_DEMO_MODE_STATE_ID,
  enabled: false,
  expiresAt: null,
  reason: null,
  activatedBy: null,
  activatedAt: null,
  deactivatedBy: null,
  deactivatedAt: null,
  version: 0,
  updatedAt: NOW,
  ...overrides,
});

function setup(available = true) {
  const stateFindFirst = jest.fn();
  const userFindFirst = jest.fn().mockResolvedValue({
    id: ACTOR_ID,
    email: 'admin@lms.local',
    firstName: 'Demo',
    lastName: 'Admin',
    password: 'hash',
    userRoles: [{ role: { name: 'admin' } }],
  });
  const returning = jest.fn();
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const onConflictDoNothing = jest.fn().mockResolvedValue(undefined);
  const values = jest.fn().mockReturnValue({ onConflictDoNothing });
  const insert = jest.fn().mockReturnValue({ values });
  const db: any = {
    query: {
      adminDemoModeStates: { findFirst: stateFindFirst },
      users: { findFirst: userFindFirst },
    },
    insert,
    update,
  };
  db.transaction = jest.fn((work: (tx: typeof db) => unknown) =>
    Promise.resolve(work(db)),
  );
  const config = {
    get: jest.fn((_key: string, fallback: boolean) => available ?? fallback),
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit' }) };
  const service = new AdminDemoModeService(
    { db } as any,
    config as any,
    audit as any,
    () => new Date(NOW),
  );
  return {
    service,
    db,
    stateFindFirst,
    userFindFirst,
    returning,
    set,
    where,
    update,
    insert,
    values,
    onConflictDoNothing,
    config,
    audit,
  };
}

const activationDto = (): ActivateAdminDemoModeDto => ({
  currentPassword: 'Test@123',
  confirmation: 'ENABLE DEMO MODE',
  reason: 'Prepare a complete presentation flow.',
  durationMinutes: 30,
  expectedVersion: 0,
  acknowledgements: [...REQUIRED_DEMO_ACKNOWLEDGEMENTS],
});

describe('AdminDemoModeService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it.each([
    ['missing row', null, 'disabled', false],
    ['disabled row', makeRow(), 'disabled', false],
    [
      'future expiry',
      makeRow({ enabled: true, expiresAt: FUTURE }),
      'active',
      true,
    ],
    [
      'past expiry',
      makeRow({ enabled: true, expiresAt: PAST }),
      'expired',
      false,
    ],
  ])('derives %s from server time', async (_label, row, state, active) => {
    const { service, stateFindFirst } = setup();
    stateFindFirst.mockResolvedValue(row);
    await expect(service.getStatus()).resolves.toMatchObject({ state, active });
  });

  it('reports unavailable while retaining the current version for safe deactivation', async () => {
    const { service, stateFindFirst } = setup(false);
    stateFindFirst.mockResolvedValue(makeRow({ enabled: true, version: 3 }));
    await expect(service.getStatus()).resolves.toMatchObject({
      available: false,
      active: false,
      state: 'unavailable',
      version: 3,
    });
    expect(stateFindFirst).toHaveBeenCalledTimes(1);
  });

  it('turns status read errors into a service-unavailable response', async () => {
    const { service, stateFindFirst } = setup();
    stateFindFirst.mockRejectedValue(new Error('database unavailable'));
    await expect(service.getStatus()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects activation while deployment availability is off', async () => {
    const { service } = setup(false);
    await expect(
      service.activate(activationDto(), ACTOR_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects activation when the current password is wrong', async () => {
    const { service, update } = setup();
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.activate(activationDto(), ACTOR_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an incomplete acknowledgement set in the service boundary', async () => {
    const { service } = setup();
    const dto = activationDto();
    dto.acknowledgements = dto.acknowledgements.slice(0, 2);
    await expect(service.activate(dto, ACTOR_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects stale activation without overwriting current state', async () => {
    const { service, returning } = setup();
    returning.mockResolvedValue([]);
    await expect(
      service.activate(activationDto(), ACTOR_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('activates with one server-time expiry, an incremented version, and no password audit material', async () => {
    const { service, returning, set, audit } = setup();
    returning.mockResolvedValue([
      makeRow({
        enabled: true,
        expiresAt: FUTURE,
        reason: activationDto().reason,
        activatedBy: ACTOR_ID,
        activatedAt: NOW,
        version: 1,
      }),
    ]);

    await expect(
      service.activate(activationDto(), ACTOR_ID),
    ).resolves.toMatchObject({
      active: true,
      state: 'active',
      version: 1,
      serverTime: NOW.toISOString(),
      expiresAt: FUTURE.toISOString(),
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        expiresAt: FUTURE,
        version: 1,
      }),
    );
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain('Test@123');
  });

  it('deactivates immediately even when deployment availability is off', async () => {
    const { service, returning, set } = setup(false);
    returning.mockResolvedValue([
      makeRow({ version: 4, deactivatedBy: ACTOR_ID, deactivatedAt: NOW }),
    ]);
    const dto: DeactivateAdminDemoModeDto = {
      confirmation: 'DISABLE DEMO MODE',
      expectedVersion: 3,
    };

    await expect(service.deactivate(dto, ACTOR_ID)).resolves.toMatchObject({
      available: false,
      active: false,
      state: 'unavailable',
      version: 4,
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, expiresAt: null, version: 4 }),
    );
  });

  it('never allows a relaxed rule for a non-admin actor', async () => {
    const { service, stateFindFirst } = setup();
    stateFindFirst.mockResolvedValue(
      makeRow({ enabled: true, expiresAt: FUTURE, version: 2 }),
    );
    const context = await service.resolveForActor(ACTOR_ID, ['teacher']);
    expect(context.active).toBe(false);
    expect(context.allows('schedule_collision')).toBe(false);
  });

  it('fails closed for mutation policy when the state read fails', async () => {
    const { service, stateFindFirst } = setup();
    stateFindFirst.mockRejectedValue(new Error('database unavailable'));
    const context = await service.resolveForActor(ACTOR_ID, ['admin']);
    expect(context.active).toBe(false);
    expect(context.allows('section_capacity')).toBe(false);
    expect(context.audit(['section_capacity'])).toBeUndefined();
  });

  it('deduplicates audit metadata for an effective administrator context', async () => {
    const { service, stateFindFirst } = setup();
    stateFindFirst.mockResolvedValue(
      makeRow({ enabled: true, expiresAt: FUTURE, version: 2 }),
    );
    const context = await service.resolveForActor(ACTOR_ID, ['admin']);
    expect(context.allows('schedule_collision')).toBe(true);
    expect(context.audit(['schedule_collision', 'schedule_collision'])).toEqual(
      {
        demoModeVersion: 2,
        demoModeExpiresAt: FUTURE.toISOString(),
        bypassedRules: ['schedule_collision'],
      },
    );
  });
});
