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
import {
  adminMaintenanceSessions,
  auditLogs,
  roles,
  userRoles,
  users,
} from '../src/drizzle/schema';
import { CurrentUser } from '../src/modules/auth/decorators/current-user.decorator';
import {
  RoleName,
  Roles,
} from '../src/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { MailService } from '../src/modules/mail/mail.service';
import { UsersService } from '../src/modules/users/users.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AdminMaintenanceController } from '../src/modules/admin-maintenance/admin-maintenance.controller';
import {
  ADMIN_MAINTENANCE_CLOCK,
  AdminMaintenanceService,
} from '../src/modules/admin-maintenance/admin-maintenance.service';
import { REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS } from '../src/modules/admin-maintenance/DTO/admin-maintenance.dto';

type Actor = { userId: string; roles: string[] };

@Controller('admin/maintenance-probe')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
class AdminMaintenanceProbeController {
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

const databaseUrl = process.env.ADMIN_MAINTENANCE_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const ADMIN_ID = '10000000-0000-4000-8000-000000000001';
const SECOND_ADMIN_ID = '10000000-0000-4000-8000-000000000005';
const TEACHER_ID = '10000000-0000-4000-8000-000000000002';
const TARGET_ID = '10000000-0000-4000-8000-000000000003';
const SECOND_TARGET_ID = '10000000-0000-4000-8000-000000000004';
const START = new Date('2026-09-12T04:00:00.000Z');

const openBody = () => ({
  currentPassword: 'MaintenanceOnly!456',
  confirmation: 'OPEN MAINTENANCE ACCESS',
  reason: 'Exercise the complete administrator presentation flow.',
  acknowledgements: [...REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS],
});

describeWithDatabase(
  'Admin Maintenance Access HTTP and PostgreSQL policy (e2e)',
  () => {
    let app: INestApplication<App>;
    let database: DatabaseService;
    let now = new Date(START);

    const asActor = (
      role: 'admin' | 'teacher' | 'student',
      userId: string,
    ) => ({
      'x-test-role': role,
      'x-test-user-id': userId,
    });

    beforeAll(async () => {
      const parsed = new URL(databaseUrl!);
      if (
        !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
        !parsed.pathname.startsWith('/nexora_admin_maintenance_test')
      ) {
        throw new Error(
          'ADMIN_MAINTENANCE_TEST_DATABASE_URL must identify a disposable local nexora_admin_maintenance_test database',
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
        adminMaintenance: { enabled: true },
        AUTH_PASSWORD_HASH_ROUNDS: '4',
        NODE_ENV: 'test',
      });
      database = new DatabaseService(config);
      await database.onModuleInit();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [
          AdminMaintenanceController,
          AdminMaintenanceProbeController,
        ],
        providers: [
          { provide: DatabaseService, useValue: database },
          { provide: ConfigService, useValue: config },
          AuditService,
          AdminMaintenanceService,
          UsersService,
          RolesGuard,
          { provide: ADMIN_MAINTENANCE_CLOCK, useValue: () => now },
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
        sql`TRUNCATE admin_maintenance_sessions, audit_logs, user_roles, users, roles CASCADE`,
      );
      const [adminRole, teacherRole, studentRole] = await database.db
        .insert(roles)
        .values([
          { name: 'admin', description: 'Administrator' },
          { name: 'teacher', description: 'Teacher' },
          { name: 'student', description: 'Student' },
        ])
        .returning();
      const password = await bcrypt.hash('MaintenanceOnly!456', 4);
      await database.db.insert(users).values([
        {
          id: ADMIN_ID,
          email: 'admin@example.test',
          password,
          firstName: 'Admin',
          lastName: 'Tester',
          status: 'ACTIVE',
          isEmailVerified: true,
        },
        {
          id: TEACHER_ID,
          email: 'teacher@example.test',
          password,
          firstName: 'Teacher',
          lastName: 'Tester',
          status: 'ACTIVE',
          isEmailVerified: true,
        },
        {
          id: SECOND_ADMIN_ID,
          email: 'second-admin@example.test',
          password,
          firstName: 'Second',
          lastName: 'Admin',
          status: 'ACTIVE',
          isEmailVerified: true,
        },
        {
          id: TARGET_ID,
          email: 'archived@example.test',
          password,
          firstName: 'Archived',
          lastName: 'Tester',
          status: 'DELETED',
          isEmailVerified: true,
        },
        {
          id: SECOND_TARGET_ID,
          email: 'second-archived@example.test',
          password,
          firstName: 'Second',
          lastName: 'Archived',
          status: 'DELETED',
          isEmailVerified: true,
        },
      ]);
      await database.db.insert(userRoles).values([
        { userId: ADMIN_ID, roleId: adminRole.id, assignedBy: 'SYSTEM' },
        {
          userId: SECOND_ADMIN_ID,
          roleId: adminRole.id,
          assignedBy: 'SYSTEM',
        },
        { userId: TEACHER_ID, roleId: teacherRole.id, assignedBy: 'SYSTEM' },
        { userId: TARGET_ID, roleId: studentRole.id, assignedBy: 'SYSTEM' },
        {
          userId: SECOND_TARGET_ID,
          roleId: studentRole.id,
          assignedBy: 'SYSTEM',
        },
      ]);
    });

    it('rejects teacher/student status and open requests', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/maintenance/session')
        .set(asActor('teacher', TEACHER_ID))
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/admin/maintenance/session')
        .set(asActor('student', TARGET_ID))
        .send(openBody())
        .expect(403);
    });

    it('rejects malformed and wrong-password open attempts', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/maintenance/session')
        .set(asActor('admin', ADMIN_ID))
        .send({ ...openBody(), confirmation: 'OPEN' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/admin/maintenance/session')
        .set(asActor('admin', ADMIN_ID))
        .send({ ...openBody(), currentPassword: 'wrong-password' })
        .expect(403);

      await expect(
        database.db.query.adminMaintenanceSessions.findFirst(),
      ).resolves.toBeUndefined();
    });

    it('keeps an audited actor-bound switch on until explicit closure while permanent safeguards survive', async () => {
      const baseline = await request(app.getHttpServer())
        .get('/api/admin/maintenance/session')
        .set(asActor('admin', ADMIN_ID))
        .expect(200);
      expect(baseline.body.data).toMatchObject({
        active: false,
        state: 'inactive',
        sessionId: null,
      });

      const opened = await request(app.getHttpServer())
        .post('/api/admin/maintenance/session')
        .set(asActor('admin', ADMIN_ID))
        .send(openBody())
        .expect(201);
      expect(opened.body.data).toMatchObject({
        active: true,
        state: 'active',
        mode: 'manual',
        serverTime: START.toISOString(),
        expiresAt: null,
        scopeCodes: ['ACADEMIC_STRUCTURE', 'ROSTER', 'ACCOUNT_LIFECYCLE'],
      });
      const sessionId = opened.body.data.sessionId as string;

      const otherAdmin = await request(app.getHttpServer())
        .get('/api/admin/maintenance/session')
        .set(asActor('admin', SECOND_ADMIN_ID))
        .expect(200);
      expect(otherAdmin.body.data).toMatchObject({
        active: false,
        state: 'inactive',
        mode: null,
      });

      await request(app.getHttpServer())
        .post(`/api/admin/maintenance-probe/users/${TARGET_ID}/reactivate`)
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
          maintenanceAccess: expect.objectContaining({
            maintenanceSessionId: sessionId,
            maintenanceRuleCodes: ['user_lifecycle_sequence'],
          }),
        }),
      });

      await request(app.getHttpServer())
        .post(`/api/admin/maintenance-probe/users/${ADMIN_ID}/purge`)
        .set(asActor('admin', ADMIN_ID))
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toContain('purge preview and execute routes');
        });
      await request(app.getHttpServer())
        .post('/api/admin/maintenance-probe/protected-request-shape')
        .set(asActor('admin', ADMIN_ID))
        .send({})
        .expect(400);

      now = new Date(START.getTime() + 24 * 60 * 60 * 1000);
      const stillActive = await request(app.getHttpServer())
        .get('/api/admin/maintenance/session')
        .set(asActor('admin', ADMIN_ID))
        .expect(200);
      expect(stillActive.body.data).toMatchObject({
        active: true,
        state: 'active',
        mode: 'manual',
        sessionId,
        expiresAt: null,
      });

      const closed = await request(app.getHttpServer())
        .delete('/api/admin/maintenance/session')
        .set(asActor('admin', ADMIN_ID))
        .expect(200);
      expect(closed.body.data).toMatchObject({
        active: false,
        state: 'inactive',
        sessionId: null,
      });
      const persisted =
        await database.db.query.adminMaintenanceSessions.findFirst();
      expect(persisted).toMatchObject({
        id: sessionId,
        mode: 'MANUAL',
        expiresAt: null,
        status: 'CLOSED',
      });

      await request(app.getHttpServer())
        .post(
          `/api/admin/maintenance-probe/users/${SECOND_TARGET_ID}/reactivate`,
        )
        .set(asActor('admin', ADMIN_ID))
        .expect(400);
    });

    it('expires a legacy timed session using backend time', async () => {
      await database.db.insert(adminMaintenanceSessions).values({
        actorUserId: ADMIN_ID,
        actorSessionVersion: 0,
        status: 'ACTIVE',
        mode: 'TIMED',
        scopeCodes: ['ACADEMIC_STRUCTURE', 'ROSTER', 'ACCOUNT_LIFECYCLE'],
        reason: 'Legacy timed session retained during the switch migration.',
        startedAt: START,
        expiresAt: new Date(START.getTime() + 15 * 60 * 1000),
      });

      now = new Date(START.getTime() + 16 * 60 * 1000);
      const expired = await request(app.getHttpServer())
        .get('/api/admin/maintenance/session')
        .set(asActor('admin', ADMIN_ID))
        .expect(200);

      expect(expired.body.data).toMatchObject({
        active: false,
        state: 'expired',
        mode: 'timed',
        sessionId: null,
      });
      await expect(
        database.db.query.adminMaintenanceSessions.findFirst(),
      ).resolves.toMatchObject({ status: 'EXPIRED', mode: 'TIMED' });
    });
  },
);
