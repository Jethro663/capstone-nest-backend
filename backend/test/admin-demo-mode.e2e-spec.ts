import {
  BadRequestException,
  Body,
  Controller,
  INestApplication,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DatabaseService } from '../src/database/database.service';
import { auditLogs, roles, userRoles, users } from '../src/drizzle/schema';
import { CurrentUser } from '../src/modules/auth/decorators/current-user.decorator';
import {
  RoleName,
  Roles,
} from '../src/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { MailService } from '../src/modules/mail/mail.service';
import { UsersService } from '../src/modules/users/users.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AdminDemoModeController } from '../src/modules/admin-demo-mode/admin-demo-mode.controller';
import {
  ADMIN_DEMO_MODE_CLOCK,
  AdminDemoModeService,
} from '../src/modules/admin-demo-mode/admin-demo-mode.service';

type Actor = { userId: string; roles: string[] };

@Controller('admin/demo-mode-probe')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
class AdminDemoModeProbeController {
  constructor(private readonly usersService: UsersService) {}

  @Post('users/:id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.usersService.reactivateUser(id, actor.userId);
  }

  @Post('users/:id/purge')
  purge(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.usersService.purgeUser(id, actor.userId);
  }

  @Post('protected-request-shape')
  protectedRequestShape(@Body() body: { requiredName?: string }) {
    if (!body.requiredName?.trim()) {
      throw new BadRequestException(
        'Required request validation remains protected',
      );
    }
    return { accepted: true };
  }
}

const databaseUrl = process.env.ADMIN_DEMO_MODE_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const ADMIN_ID = '10000000-0000-4000-8000-000000000001';
const TEACHER_ID = '10000000-0000-4000-8000-000000000002';
const TARGET_ID = '10000000-0000-4000-8000-000000000003';
const SECOND_TARGET_ID = '10000000-0000-4000-8000-000000000004';
const START = new Date('2026-09-12T04:00:00.000Z');

const activationBody = (expectedVersion = 0) => ({
  currentPassword: 'DemoOnly!456',
  confirmation: 'ENABLE DEMO MODE',
  reason: 'Exercise the complete administrator presentation flow.',
  durationMinutes: 15,
  expectedVersion,
  acknowledgements: [
    'SHARED_DATA_CAN_CHANGE',
    'ACTIONS_REMAIN_AUDITED',
    'HARD_SAFEGUARDS_REMAIN',
  ],
});

describeWithDatabase('Admin Demo mode HTTP and PostgreSQL policy (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  let now = new Date(START);

  const asActor = (role: 'admin' | 'teacher' | 'student', userId: string) => ({
    'x-test-role': role,
    'x-test-user-id': userId,
  });

  beforeAll(async () => {
    const parsed = new URL(databaseUrl!);
    if (
      !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
      !parsed.pathname.startsWith('/nexora_demo_mode_test')
    ) {
      throw new Error(
        'ADMIN_DEMO_MODE_TEST_DATABASE_URL must identify a disposable local nexora_demo_mode_test database',
      );
    }

    const config = new ConfigService({
      database: {
        url: databaseUrl,
        poolMax: 4,
        idleTimeout: 1_000,
        connectionTimeout: 5_000,
        statementTimeout: 15_000,
      },
      adminDemoMode: { available: true },
      AUTH_PASSWORD_HASH_ROUNDS: '4',
      NODE_ENV: 'test',
    });
    database = new DatabaseService(config);
    await database.onModuleInit();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdminDemoModeController, AdminDemoModeProbeController],
      providers: [
        { provide: DatabaseService, useValue: database },
        { provide: ConfigService, useValue: config },
        AuditService,
        AdminDemoModeService,
        UsersService,
        RolesGuard,
        { provide: ADMIN_DEMO_MODE_CLOCK, useValue: () => now },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn(), emitAsync: jest.fn() },
        },
        {
          provide: MailService,
          useValue: {
            sendOtpEmail: jest.fn(),
            sendPasswordEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(
      (
        req: Request & { user?: Actor & { email?: string } },
        _res: Response,
        next: NextFunction,
      ) => {
        const role = req.header('x-test-role');
        const userId = req.header('x-test-user-id');
        if (role && userId) {
          req.user = { userId, roles: [role], email: `${role}@example.test` };
        }
        next();
      },
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    now = new Date(START);
    await database.db.execute(
      sql`TRUNCATE admin_demo_mode_states, audit_logs, user_roles, users, roles CASCADE`,
    );
    const [adminRole, teacherRole, studentRole] = await database.db
      .insert(roles)
      .values([
        { name: 'admin', description: 'Administrator' },
        { name: 'teacher', description: 'Teacher' },
        { name: 'student', description: 'Student' },
      ])
      .returning();
    const password = await bcrypt.hash('DemoOnly!456', 4);
    await database.db.insert(users).values([
      {
        id: ADMIN_ID,
        email: 'admin@example.test',
        password,
        firstName: 'Admin',
        lastName: 'Tester',
        status: 'ACTIVE',
      },
      {
        id: TEACHER_ID,
        email: 'teacher@example.test',
        password,
        firstName: 'Teacher',
        lastName: 'Tester',
        status: 'ACTIVE',
      },
      {
        id: TARGET_ID,
        email: 'archived@example.test',
        password,
        firstName: 'Archived',
        lastName: 'Tester',
        status: 'DELETED',
      },
      {
        id: SECOND_TARGET_ID,
        email: 'second-archived@example.test',
        password,
        firstName: 'Second',
        lastName: 'Archived',
        status: 'DELETED',
      },
    ]);
    await database.db.insert(userRoles).values([
      { userId: ADMIN_ID, roleId: adminRole.id, assignedBy: 'SYSTEM' },
      { userId: TEACHER_ID, roleId: teacherRole.id, assignedBy: 'SYSTEM' },
      { userId: TARGET_ID, roleId: studentRole.id, assignedBy: 'SYSTEM' },
      {
        userId: SECOND_TARGET_ID,
        roleId: studentRole.id,
        assignedBy: 'SYSTEM',
      },
    ]);
  });

  it('rejects teacher/student status and activation requests', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/demo-mode')
      .set(asActor('teacher', TEACHER_ID))
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/admin/demo-mode/activate')
      .set(asActor('student', TARGET_ID))
      .send(activationBody())
      .expect(403);
  });

  it('rejects malformed, wrong-password, and stale activation attempts', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/demo-mode/activate')
      .set(asActor('admin', ADMIN_ID))
      .send({ ...activationBody(), confirmation: 'ENABLE' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/admin/demo-mode/activate')
      .set(asActor('admin', ADMIN_ID))
      .send({ ...activationBody(), currentPassword: 'wrong-password' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/admin/demo-mode/activate')
      .set(asActor('admin', ADMIN_ID))
      .send(activationBody(9))
      .expect(409);

    await expect(
      database.db.query.adminDemoModeStates.findFirst(),
    ).resolves.toBeUndefined();
  });

  it('activates an audited reversible exception while permanent safeguards survive expiry and deactivation', async () => {
    const baseline = await request(app.getHttpServer())
      .get('/api/admin/demo-mode')
      .set(asActor('admin', ADMIN_ID))
      .expect(200);
    expect(baseline.body.data).toMatchObject({
      active: false,
      state: 'disabled',
      version: 0,
    });

    const activation = await request(app.getHttpServer())
      .post('/api/admin/demo-mode/activate')
      .set(asActor('admin', ADMIN_ID))
      .send(activationBody())
      .expect(201);
    expect(activation.body.data).toMatchObject({
      active: true,
      state: 'active',
      version: 1,
      serverTime: START.toISOString(),
    });

    await request(app.getHttpServer())
      .post(`/api/admin/demo-mode-probe/users/${TARGET_ID}/reactivate`)
      .set(asActor('admin', ADMIN_ID))
      .expect(201);
    await expect(
      database.db.query.users.findFirst({ where: eq(users.id, TARGET_ID) }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      database.db.query.auditLogs.findFirst({
        where: eq(auditLogs.action, 'user.reactivated'),
      }),
    ).resolves.toMatchObject({
      metadata: expect.objectContaining({
        demoMode: expect.objectContaining({
          demoModeVersion: 1,
          bypassedRules: ['user_lifecycle_sequence'],
        }),
      }),
    });

    await request(app.getHttpServer())
      .post(`/api/admin/demo-mode-probe/users/${ADMIN_ID}/purge`)
      .set(asActor('admin', ADMIN_ID))
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/admin/demo-mode-probe/protected-request-shape')
      .set(asActor('admin', ADMIN_ID))
      .send({})
      .expect(400);

    now = new Date(START.getTime() + 16 * 60 * 1000);
    const expired = await request(app.getHttpServer())
      .get('/api/admin/demo-mode')
      .set(asActor('admin', ADMIN_ID))
      .expect(200);
    expect(expired.body.data).toMatchObject({
      active: false,
      state: 'expired',
      version: 1,
    });
    await request(app.getHttpServer())
      .post(`/api/admin/demo-mode-probe/users/${SECOND_TARGET_ID}/reactivate`)
      .set(asActor('admin', ADMIN_ID))
      .expect(400);

    const deactivation = await request(app.getHttpServer())
      .post('/api/admin/demo-mode/deactivate')
      .set(asActor('admin', ADMIN_ID))
      .send({ confirmation: 'DISABLE DEMO MODE', expectedVersion: 1 })
      .expect(201);
    expect(deactivation.body.data).toMatchObject({
      active: false,
      state: 'disabled',
      version: 2,
    });
    const persisted = await database.db.query.adminDemoModeStates.findFirst();
    expect(persisted).toMatchObject({ enabled: false, version: 2 });
  });
});
