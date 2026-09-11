import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  ADMIN_DEMO_MODE_STATE_ID,
  adminDemoModeStates,
  users,
} from '../../drizzle/schema';
import { RoleName } from '../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import {
  REQUIRED_DEMO_ACKNOWLEDGEMENTS,
  type ActivateAdminDemoModeDto,
  type AdminDemoModeStatusDto,
  type DeactivateAdminDemoModeDto,
} from './DTO/admin-demo-mode.dto';
import {
  ADMIN_DEMO_MODE_PROTECTED_RULES,
  ADMIN_DEMO_MODE_RELAXED_RULES,
  type AdminDemoModeRelaxedRuleCode,
} from './admin-demo-mode.policy';

export const ADMIN_DEMO_MODE_CLOCK = Symbol('ADMIN_DEMO_MODE_CLOCK');

type DemoModeRow = typeof adminDemoModeStates.$inferSelect;

export interface AdminDemoModeContext {
  active: boolean;
  version: number;
  expiresAt: Date | null;
  allows: (rule: AdminDemoModeRelaxedRuleCode) => boolean;
  audit: (bypassedRules: readonly AdminDemoModeRelaxedRuleCode[]) =>
    | {
        demoModeVersion: number;
        demoModeExpiresAt: string;
        bypassedRules: AdminDemoModeRelaxedRuleCode[];
      }
    | undefined;
}

@Injectable()
export class AdminDemoModeService {
  private readonly logger = new Logger(AdminDemoModeService.name);
  private readonly relaxedCodes = new Set<AdminDemoModeRelaxedRuleCode>(
    ADMIN_DEMO_MODE_RELAXED_RULES.map((rule) => rule.code),
  );

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(ADMIN_DEMO_MODE_CLOCK) private readonly clock: () => Date,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAvailable() {
    return this.configService.get<boolean>('adminDemoMode.available', false);
  }

  private inactiveContext(version = 0): AdminDemoModeContext {
    return {
      active: false,
      version,
      expiresAt: null,
      allows: () => false,
      audit: () => undefined,
    };
  }

  private effectiveContext(row: DemoModeRow): AdminDemoModeContext {
    const expiresAt = row.expiresAt;
    const version = row.version;
    return {
      active: true,
      version,
      expiresAt,
      allows: (rule) => this.relaxedCodes.has(rule),
      audit: (bypassedRules) => {
        const unique = [...new Set(bypassedRules)].filter((rule) =>
          this.relaxedCodes.has(rule),
        );
        if (unique.length === 0 || !expiresAt) return undefined;
        return {
          demoModeVersion: version,
          demoModeExpiresAt: expiresAt.toISOString(),
          bypassedRules: unique,
        };
      },
    };
  }

  private isEffective(row: DemoModeRow | null, now: Date) {
    return Boolean(
      this.isAvailable() &&
      row?.enabled &&
      row.expiresAt &&
      row.expiresAt.getTime() > now.getTime(),
    );
  }

  private async actorSummary(actorId: string | null) {
    if (!actorId) return null;
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, actorId),
      columns: { id: true, firstName: true, lastName: true },
    });
    if (!actor) return null;
    return {
      id: actor.id,
      displayName: `${actor.firstName} ${actor.lastName}`.trim(),
    };
  }

  private async toStatus(
    row: DemoModeRow | null,
    now: Date,
  ): Promise<AdminDemoModeStatusDto> {
    const available = this.isAvailable();
    const active = this.isEffective(row, now);
    const state = !available
      ? 'unavailable'
      : active
        ? 'active'
        : row?.enabled &&
            row.expiresAt &&
            row.expiresAt.getTime() <= now.getTime()
          ? 'expired'
          : 'disabled';

    return {
      available,
      active,
      state,
      version: row?.version ?? 0,
      serverTime: now.toISOString(),
      activatedAt: row?.activatedAt?.toISOString() ?? null,
      expiresAt: row?.expiresAt?.toISOString() ?? null,
      reason: row?.reason ?? null,
      activatedBy: await this.actorSummary(row?.activatedBy ?? null),
      relaxedRules: ADMIN_DEMO_MODE_RELAXED_RULES,
      protectedRules: ADMIN_DEMO_MODE_PROTECTED_RULES,
    };
  }

  private async readState(): Promise<DemoModeRow | null> {
    return (
      (await this.db.query.adminDemoModeStates.findFirst({
        where: eq(adminDemoModeStates.id, ADMIN_DEMO_MODE_STATE_ID),
      })) ?? null
    );
  }

  async getStatus(): Promise<AdminDemoModeStatusDto> {
    const now = this.clock();
    try {
      return await this.toStatus(await this.readState(), now);
    } catch (error) {
      this.logger.warn(
        `Demo mode status read failed: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      throw new ServiceUnavailableException(
        'Demo mode status is temporarily unavailable.',
      );
    }
  }

  private assertCompleteAcknowledgements(dto: ActivateAdminDemoModeDto) {
    const supplied = new Set(dto.acknowledgements);
    const complete =
      supplied.size === REQUIRED_DEMO_ACKNOWLEDGEMENTS.length &&
      REQUIRED_DEMO_ACKNOWLEDGEMENTS.every((item) => supplied.has(item));
    if (!complete) {
      throw new BadRequestException(
        'Every Demo mode acknowledgement is required exactly once.',
      );
    }
  }

  private async verifyPassword(actorId: string, currentPassword: string) {
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, actorId),
      columns: {
        id: true,
        password: true,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const comparePassword = bcrypt.compare as unknown as (
      plainText: string,
      passwordHash: string,
    ) => Promise<boolean>;
    const passwordMatches = actor
      ? await comparePassword(currentPassword, actor.password)
      : false;
    if (!actor || !passwordMatches) {
      throw new ForbiddenException('Current password is incorrect.');
    }
  }

  async activate(
    dto: ActivateAdminDemoModeDto,
    actorId: string,
  ): Promise<AdminDemoModeStatusDto> {
    if (!this.isAvailable()) {
      throw new ServiceUnavailableException(
        'Demo mode activation is unavailable in this deployment.',
      );
    }
    this.assertCompleteAcknowledgements(dto);
    await this.verifyPassword(actorId, dto.currentPassword);

    const now = this.clock();
    const expiresAt = new Date(now.getTime() + dto.durationMinutes * 60 * 1000);
    const nextVersion = dto.expectedVersion + 1;
    const updated = await this.db.transaction(async (tx) => {
      await tx
        .insert(adminDemoModeStates)
        .values({ id: ADMIN_DEMO_MODE_STATE_ID })
        .onConflictDoNothing();
      const [row] = await tx
        .update(adminDemoModeStates)
        .set({
          enabled: true,
          expiresAt,
          reason: dto.reason.trim(),
          activatedBy: actorId,
          activatedAt: now,
          deactivatedBy: null,
          deactivatedAt: null,
          version: nextVersion,
          updatedAt: now,
        })
        .where(
          and(
            eq(adminDemoModeStates.id, ADMIN_DEMO_MODE_STATE_ID),
            eq(adminDemoModeStates.version, dto.expectedVersion),
          ),
        )
        .returning();
      if (!row) {
        throw new ConflictException(
          'Demo mode changed. Refresh and review the latest status.',
        );
      }
      return row;
    });

    await this.auditService.log({
      actorId,
      action: 'ADMIN_DEMO_MODE_ACTIVATED',
      targetType: 'admin_demo_mode',
      targetId: ADMIN_DEMO_MODE_STATE_ID,
      metadata: {
        version: updated.version,
        expiresAt: expiresAt.toISOString(),
        durationMinutes: dto.durationMinutes,
        reason: dto.reason.trim(),
      },
    });
    return this.toStatus(updated, now);
  }

  async deactivate(
    dto: DeactivateAdminDemoModeDto,
    actorId: string,
  ): Promise<AdminDemoModeStatusDto> {
    const now = this.clock();
    const nextVersion = dto.expectedVersion + 1;
    const updated = await this.db.transaction(async (tx) => {
      await tx
        .insert(adminDemoModeStates)
        .values({ id: ADMIN_DEMO_MODE_STATE_ID })
        .onConflictDoNothing();
      const [row] = await tx
        .update(adminDemoModeStates)
        .set({
          enabled: false,
          expiresAt: null,
          deactivatedBy: actorId,
          deactivatedAt: now,
          version: nextVersion,
          updatedAt: now,
        })
        .where(
          and(
            eq(adminDemoModeStates.id, ADMIN_DEMO_MODE_STATE_ID),
            eq(adminDemoModeStates.version, dto.expectedVersion),
          ),
        )
        .returning();
      if (!row) {
        throw new ConflictException(
          'Demo mode changed. Refresh and review the latest status.',
        );
      }
      return row;
    });

    await this.auditService.log({
      actorId,
      action: 'ADMIN_DEMO_MODE_DEACTIVATED',
      targetType: 'admin_demo_mode',
      targetId: ADMIN_DEMO_MODE_STATE_ID,
      metadata: { version: updated.version },
    });
    return this.toStatus(updated, now);
  }

  async resolveForActor(
    actorId: string | undefined,
    roles?: string[],
  ): Promise<AdminDemoModeContext> {
    if (!actorId || !this.isAvailable()) return this.inactiveContext();

    try {
      let actorRoles = roles;
      if (!actorRoles) {
        const actor = await this.db.query.users.findFirst({
          where: eq(users.id, actorId),
          columns: { id: true },
          with: {
            userRoles: {
              columns: {},
              with: { role: { columns: { name: true } } },
            },
          },
        });
        actorRoles = actor?.userRoles.map((entry) => entry.role.name) ?? [];
      }
      if (!actorRoles.includes(RoleName.Admin)) return this.inactiveContext();

      const row = await this.readState();
      const now = this.clock();
      if (!row || !this.isEffective(row, now)) {
        return this.inactiveContext(row?.version ?? 0);
      }
      return this.effectiveContext(row);
    } catch (error) {
      this.logger.warn(
        `Demo mode policy read failed closed: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      return this.inactiveContext();
    }
  }
}
