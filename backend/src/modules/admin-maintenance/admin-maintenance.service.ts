import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { and, eq, gt } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  adminMaintenanceSessions,
  users,
  type AdminMaintenanceScopeCode,
} from '../../drizzle/schema';
import { RoleName } from '../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import {
  REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS,
  type AdminMaintenanceStatusDto,
  type OpenAdminMaintenanceSessionDto,
} from './DTO/admin-maintenance.dto';
import {
  ADMIN_MAINTENANCE_PROTECTED_RULES,
  ADMIN_MAINTENANCE_RULE_SCOPE,
  ADMIN_MAINTENANCE_RULES,
  ADMIN_MAINTENANCE_SCOPES,
  type AdminMaintenanceRuleCode,
} from './admin-maintenance.policy';

export const ADMIN_MAINTENANCE_CLOCK = Symbol('ADMIN_MAINTENANCE_CLOCK');

type MaintenanceRow = typeof adminMaintenanceSessions.$inferSelect;
type ActorRow = {
  id: string;
  password: string;
  status: string;
  isEmailVerified: boolean;
  sessionVersion: number;
  userRoles?: Array<{ role: { name: string } }>;
};

export interface AdminMaintenanceContext {
  active: boolean;
  sessionId: string | null;
  expiresAt: Date | null;
  allows: (rule: AdminMaintenanceRuleCode) => boolean;
  audit: (ruleCodes: readonly AdminMaintenanceRuleCode[]) =>
    | {
        maintenanceSessionId: string;
        maintenanceExpiresAt: string;
        maintenanceRuleCodes: AdminMaintenanceRuleCode[];
      }
    | undefined;
}

@Injectable()
export class AdminMaintenanceService {
  private readonly logger = new Logger(AdminMaintenanceService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(ADMIN_MAINTENANCE_CLOCK) private readonly clock: () => Date,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAvailable() {
    return this.configService.get<boolean>('adminMaintenance.enabled', false);
  }

  private durationMinutes() {
    const configured = this.configService.get<number>(
      'adminMaintenance.durationMinutes',
      15,
    );
    return Number.isInteger(configured) && configured >= 5 && configured <= 30
      ? configured
      : 15;
  }

  private inactiveContext(): AdminMaintenanceContext {
    return {
      active: false,
      sessionId: null,
      expiresAt: null,
      allows: () => false,
      audit: () => undefined,
    };
  }

  private async readActor(
    actorId: string,
    db: DatabaseService['db'] = this.db,
  ): Promise<ActorRow | null> {
    return (
      ((await db.query.users.findFirst({
        where: eq(users.id, actorId),
        columns: {
          id: true,
          password: true,
          status: true,
          isEmailVerified: true,
          sessionVersion: true,
        },
        with: {
          userRoles: {
            columns: {},
            with: { role: { columns: { name: true } } },
          },
        },
      })) as ActorRow | undefined) ?? null
    );
  }

  private async readSession(
    actorId: string,
    db: DatabaseService['db'] = this.db,
  ): Promise<MaintenanceRow | null> {
    return (
      (await db.query.adminMaintenanceSessions.findFirst({
        where: and(
          eq(adminMaintenanceSessions.actorUserId, actorId),
          eq(adminMaintenanceSessions.status, 'ACTIVE'),
        ),
        orderBy: (sessions, { desc }) => [desc(sessions.startedAt)],
      })) ?? null
    );
  }

  private actorIsAdmin(actor: ActorRow, roles?: string[]) {
    const actorRoles = actor.userRoles?.map((entry) => entry.role.name) ?? [];
    return (
      actor.status === 'ACTIVE' &&
      actor.isEmailVerified &&
      actorRoles.includes(RoleName.Admin) &&
      (!roles || roles.includes(RoleName.Admin))
    );
  }

  private isEffective(
    row: MaintenanceRow | null,
    actor: ActorRow | null,
    roles: string[] | undefined,
    now: Date,
  ) {
    return Boolean(
      this.isAvailable() &&
      row &&
      actor &&
      this.actorIsAdmin(actor, roles) &&
      row.status === 'ACTIVE' &&
      row.actorUserId === actor.id &&
      row.actorSessionVersion === actor.sessionVersion &&
      row.expiresAt.getTime() > now.getTime(),
    );
  }

  private context(row: MaintenanceRow): AdminMaintenanceContext {
    const granted = new Set<AdminMaintenanceScopeCode>(row.scopeCodes);
    return {
      active: true,
      sessionId: row.id,
      expiresAt: row.expiresAt,
      allows: (rule) => granted.has(ADMIN_MAINTENANCE_RULE_SCOPE[rule]),
      audit: (ruleCodes) => {
        const unique = [...new Set(ruleCodes)].filter((rule) =>
          granted.has(ADMIN_MAINTENANCE_RULE_SCOPE[rule]),
        );
        if (!unique.length) return undefined;
        return {
          maintenanceSessionId: row.id,
          maintenanceExpiresAt: row.expiresAt.toISOString(),
          maintenanceRuleCodes: unique,
        };
      },
    };
  }

  private async touchSession(
    row: MaintenanceRow,
    now: Date,
    db: DatabaseService['db'] = this.db,
  ) {
    return db
      .update(adminMaintenanceSessions)
      .set({ lastUsedAt: now, updatedAt: now })
      .where(
        and(
          eq(adminMaintenanceSessions.id, row.id),
          eq(adminMaintenanceSessions.actorUserId, row.actorUserId),
          eq(
            adminMaintenanceSessions.actorSessionVersion,
            row.actorSessionVersion,
          ),
          eq(adminMaintenanceSessions.status, 'ACTIVE'),
          gt(adminMaintenanceSessions.expiresAt, now),
        ),
      )
      .returning();
  }

  private invalidation(
    row: MaintenanceRow,
    actor: ActorRow | null,
    roles: string[] | undefined,
    now: Date,
  ):
    | { status: 'EXPIRED' | 'REVOKED'; action: string; cause: string }
    | undefined {
    if (row.status !== 'ACTIVE') return undefined;
    if (row.expiresAt.getTime() <= now.getTime()) {
      return {
        status: 'EXPIRED',
        action: 'ADMIN_MAINTENANCE_EXPIRED',
        cause: 'SESSION_EXPIRED',
      };
    }
    if (!actor) {
      return {
        status: 'REVOKED',
        action: 'ADMIN_MAINTENANCE_REVOKED',
        cause: 'ACTOR_UNAVAILABLE',
      };
    }
    if (row.actorSessionVersion !== actor.sessionVersion) {
      return {
        status: 'REVOKED',
        action: 'ADMIN_MAINTENANCE_REVOKED',
        cause: 'SESSION_VERSION_CHANGED',
      };
    }
    if (!this.actorIsAdmin(actor, roles)) {
      return {
        status: 'REVOKED',
        action: 'ADMIN_MAINTENANCE_REVOKED',
        cause: 'ACTOR_NO_LONGER_ELIGIBLE',
      };
    }
    return undefined;
  }

  private async persistInvalidation(
    row: MaintenanceRow | null,
    actor: ActorRow | null,
    roles: string[] | undefined,
    now: Date,
  ): Promise<MaintenanceRow | null> {
    if (!row) return null;
    const invalidation = this.invalidation(row, actor, roles, now);
    if (!invalidation) return row;
    return this.db.transaction(async (tx) => {
      const [closed] = await tx
        .update(adminMaintenanceSessions)
        .set({
          status: invalidation.status,
          closedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(adminMaintenanceSessions.id, row.id),
            eq(adminMaintenanceSessions.status, 'ACTIVE'),
          ),
        )
        .returning();
      if (!closed) return row;
      await this.auditService.log(
        {
          actorId: row.actorUserId,
          action: invalidation.action,
          targetType: 'admin_maintenance_session',
          targetId: row.id,
          metadata: {
            cause: invalidation.cause,
            expiresAt: row.expiresAt.toISOString(),
          },
        },
        tx as never,
      );
      return closed;
    });
  }

  private toStatus(
    row: MaintenanceRow | null,
    actor: ActorRow | null,
    roles: string[] | undefined,
    now: Date,
  ): AdminMaintenanceStatusDto {
    const available = this.isAvailable();
    const active = this.isEffective(row, actor, roles, now);
    const expired = Boolean(
      available &&
      row &&
      (row.status === 'EXPIRED' ||
        (row.status === 'ACTIVE' && row.expiresAt.getTime() <= now.getTime())),
    );
    return {
      available,
      active,
      state: !available
        ? 'unavailable'
        : active
          ? 'active'
          : expired
            ? 'expired'
            : 'inactive',
      sessionId: active ? row!.id : null,
      serverTime: now.toISOString(),
      startedAt: active ? row!.startedAt.toISOString() : null,
      expiresAt: active ? row!.expiresAt.toISOString() : null,
      reason: active ? row!.reason : null,
      scopeCodes: active ? [...row!.scopeCodes] : [],
      rules: ADMIN_MAINTENANCE_RULES,
      protectedRules: ADMIN_MAINTENANCE_PROTECTED_RULES,
    };
  }

  async getStatus(
    actorId: string,
    roles?: string[],
  ): Promise<AdminMaintenanceStatusDto> {
    const now = this.clock();
    try {
      const [actor, row] = await Promise.all([
        this.readActor(actorId),
        this.readSession(actorId),
      ]);
      const effectiveRow = await this.persistInvalidation(
        row,
        actor,
        roles,
        now,
      );
      return this.toStatus(effectiveRow, actor, roles, now);
    } catch (error) {
      this.logger.warn(
        `Maintenance status read failed: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      throw new ServiceUnavailableException(
        'Maintenance Access status is temporarily unavailable.',
      );
    }
  }

  private assertAcknowledgements(dto: OpenAdminMaintenanceSessionDto) {
    const supplied = new Set(dto.acknowledgements);
    if (
      supplied.size !== REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS.length ||
      !REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS.every((item) => supplied.has(item))
    ) {
      throw new BadRequestException(
        'Every Maintenance Access acknowledgement is required exactly once.',
      );
    }
  }

  async open(
    dto: OpenAdminMaintenanceSessionDto,
    actorId: string,
    roles?: string[],
  ): Promise<AdminMaintenanceStatusDto> {
    if (!this.isAvailable()) {
      throw new ServiceUnavailableException(
        'Maintenance Access is unavailable in this deployment.',
      );
    }
    this.assertAcknowledgements(dto);
    const actor = await this.readActor(actorId);
    if (!actor || !this.actorIsAdmin(actor, roles)) {
      throw new ForbiddenException('Administrator access is required.');
    }
    const passwordMatches = await (
      bcrypt.compare as unknown as (
        plainText: string,
        passwordHash: string,
      ) => Promise<boolean>
    )(dto.currentPassword, actor.password);
    if (!passwordMatches) {
      throw new ForbiddenException('Current password is incorrect.');
    }

    const resetState = await this.db.query.systemResetState?.findFirst?.({});
    if (resetState?.active) {
      throw new ServiceUnavailableException(
        'School reset maintenance is active. Maintenance Access cannot open.',
      );
    }

    const now = this.clock();
    const expiresAt = new Date(
      now.getTime() + this.durationMinutes() * 60 * 1000,
    );
    const { created, revokedSessionIds } = await this.db.transaction(
      async (tx) => {
        const revoked = await tx
          .update(adminMaintenanceSessions)
          .set({ status: 'REVOKED', closedAt: now, updatedAt: now })
          .where(
            and(
              eq(adminMaintenanceSessions.actorUserId, actorId),
              eq(adminMaintenanceSessions.status, 'ACTIVE'),
            ),
          )
          .returning({ id: adminMaintenanceSessions.id });
        const [row] = await tx
          .insert(adminMaintenanceSessions)
          .values({
            actorUserId: actorId,
            actorSessionVersion: actor.sessionVersion,
            status: 'ACTIVE',
            scopeCodes: [...ADMIN_MAINTENANCE_SCOPES],
            reason: dto.reason.trim(),
            startedAt: now,
            expiresAt,
            lastUsedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        const revokedSessionIds = revoked.map((entry) => entry.id);
        await this.auditService.log(
          {
            actorId,
            action: 'ADMIN_MAINTENANCE_OPENED',
            targetType: 'admin_maintenance_session',
            targetId: row.id,
            metadata: {
              expiresAt: row.expiresAt.toISOString(),
              scopeCodes: row.scopeCodes,
              reason: row.reason,
              revokedSessionIds,
            },
          },
          tx as never,
        );
        return {
          created: row,
          revokedSessionIds,
        };
      },
    );
    void revokedSessionIds;
    return this.toStatus(created, actor, roles, now);
  }

  async close(
    actorId: string,
    roles?: string[],
  ): Promise<AdminMaintenanceStatusDto> {
    const now = this.clock();
    const closed = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(adminMaintenanceSessions)
        .set({ status: 'CLOSED', closedAt: now, updatedAt: now })
        .where(
          and(
            eq(adminMaintenanceSessions.actorUserId, actorId),
            eq(adminMaintenanceSessions.status, 'ACTIVE'),
          ),
        )
        .returning();
      if (row) {
        await this.auditService.log(
          {
            actorId,
            action: 'ADMIN_MAINTENANCE_CLOSED',
            targetType: 'admin_maintenance_session',
            targetId: row.id,
            metadata: { expiredAt: row.expiresAt.toISOString() },
          },
          tx as never,
        );
      }
      return row;
    });
    const actor = await this.readActor(actorId);
    return this.toStatus(closed ?? null, actor, roles, now);
  }

  async resolveForActor(
    actorId: string | undefined,
    roles?: string[],
  ): Promise<AdminMaintenanceContext> {
    if (!actorId || !this.isAvailable()) return this.inactiveContext();
    if (roles && !roles.includes(RoleName.Admin)) return this.inactiveContext();
    try {
      const [actor, row] = await Promise.all([
        this.readActor(actorId),
        this.readSession(actorId),
      ]);
      const now = this.clock();
      const effectiveRow = await this.persistInvalidation(
        row,
        actor,
        roles,
        now,
      );
      if (!this.isEffective(effectiveRow, actor, roles, now)) {
        return this.inactiveContext();
      }
      const touched = await this.touchSession(effectiveRow!, now);
      if (!touched.length) return this.inactiveContext();
      return this.context(touched[0]);
    } catch (error) {
      this.logger.warn(
        `Maintenance policy read failed closed: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      return this.inactiveContext();
    }
  }

  async requireActiveSession(
    actorId: string,
    roles: string[] | undefined,
    expectedSessionId: string,
  ): Promise<AdminMaintenanceContext> {
    const [actor, row] = await Promise.all([
      this.readActor(actorId),
      this.readSession(actorId),
    ]);
    const now = this.clock();
    const effectiveRow = await this.persistInvalidation(row, actor, roles, now);
    if (
      !effectiveRow ||
      effectiveRow.id !== expectedSessionId ||
      !this.isEffective(effectiveRow, actor, roles, now)
    ) {
      throw new ForbiddenException({
        code: 'MAINTENANCE_SESSION_REQUIRED',
        message:
          'Maintenance Access expired or changed. Reauthenticate and review the current impact again.',
      });
    }
    const touched = await this.touchSession(effectiveRow, now);
    if (!touched.length) {
      throw new ForbiddenException({
        code: 'MAINTENANCE_SESSION_REQUIRED',
        message:
          'Maintenance Access expired or changed. Reauthenticate and review the current impact again.',
      });
    }
    return this.context(touched[0]);
  }
}
