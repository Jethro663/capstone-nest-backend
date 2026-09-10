import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  adminLifecycleOperations,
  users,
  type AdminLifecycleAction,
  type LifecycleActorSnapshot,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  ExecuteClassLifecycleDto,
  ExecutePurgeLifecycleDto,
  ExecuteSectionLifecycleDto,
  ExecuteStudentLifecycleDto,
  PreviewClassLifecycleDto,
  PreviewPurgeLifecycleDto,
  PreviewSectionLifecycleDto,
  PreviewStudentLifecycleDto,
} from './DTO/admin-lifecycle.dto';
import {
  hashAdminLifecycleManifestForExpiry,
  hashAdminLifecycleRequest,
} from './admin-lifecycle.manifest';
import type {
  AdminLifecycleExecutionResult,
  AdminLifecycleManifest,
} from './admin-lifecycle.types';
import {
  ClassLifecycleService,
  type ClassLifecyclePrepared,
} from './class-lifecycle.service';
import {
  PurgeLifecycleService,
  type PurgeLifecyclePrepared,
} from './purge-lifecycle.service';
import {
  SectionLifecycleService,
  type SectionLifecyclePrepared,
} from './section-lifecycle.service';
import {
  StudentLifecycleService,
  type LifecycleExecutionContext,
  type StudentLifecyclePrepared,
} from './student-lifecycle.service';

type ExecutionDto =
  | ExecuteStudentLifecycleDto
  | ExecuteClassLifecycleDto
  | ExecuteSectionLifecycleDto
  | ExecutePurgeLifecycleDto;

interface ApplyResult {
  changed: Array<{ entityType: string; entityId: string; outcome: string }>;
  preserved: string[];
  affectedUserIds: string[];
}

interface ExecutionDomain<P> {
  action: AdminLifecycleAction;
  targetType: string;
  targetId: string;
  preview: Record<string, unknown>;
  prepare: () => Promise<P & { manifest: AdminLifecycleManifest }>;
  apply: (
    prepared: P,
    context: LifecycleExecutionContext,
  ) => Promise<ApplyResult>;
}

@Injectable()
export class AdminLifecycleService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly studentLifecycleService: StudentLifecycleService,
    private readonly classLifecycleService: ClassLifecycleService,
    private readonly sectionLifecycleService: SectionLifecycleService,
    private readonly purgeLifecycleService: PurgeLifecycleService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  executionRequestHash(dto: ExecutionDto): string {
    return hashAdminLifecycleRequest(dto as unknown as Record<string, unknown>);
  }

  private studentPreview(dto: PreviewStudentLifecycleDto) {
    return {
      studentId: dto.studentId,
      sectionId: dto.sectionId,
      resolution: dto.resolution,
      classId: dto.classId,
      destinationSectionId: dto.destinationSectionId,
      destinationClassId: dto.destinationClassId,
      effectivePeriod: dto.effectivePeriod,
    } satisfies PreviewStudentLifecycleDto;
  }

  private classPreview(dto: PreviewClassLifecycleDto) {
    return {
      classId: dto.classId,
      resolution: dto.resolution,
      replacementClassId: dto.replacementClassId,
      effectivePeriod: dto.effectivePeriod,
    } satisfies PreviewClassLifecycleDto;
  }

  private sectionPreview(dto: PreviewSectionLifecycleDto) {
    return {
      sectionId: dto.sectionId,
      effectivePeriod: dto.effectivePeriod,
      studentResolutions: dto.studentResolutions.map((entry) => ({ ...entry })),
    } satisfies PreviewSectionLifecycleDto;
  }

  private purgePreview(dto: PreviewPurgeLifecycleDto) {
    return {
      targetType: dto.targetType,
      targetId: dto.targetId,
    } satisfies PreviewPurgeLifecycleDto;
  }

  async previewStudent(dto: PreviewStudentLifecycleDto) {
    const preview = this.studentPreview(dto);
    return this.db.transaction(
      (tx) => this.studentLifecycleService.prepare(preview, tx as never),
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async previewClass(dto: PreviewClassLifecycleDto) {
    const preview = this.classPreview(dto);
    return this.db.transaction(
      (tx) => this.classLifecycleService.prepare(preview, tx as never),
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async previewSection(dto: PreviewSectionLifecycleDto) {
    const preview = this.sectionPreview(dto);
    return this.db.transaction(
      (tx) => this.sectionLifecycleService.prepare(preview, tx as never),
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async previewPurge(dto: PreviewPurgeLifecycleDto) {
    const preview = this.purgePreview(dto);
    return this.db.transaction(
      (tx) => this.purgeLifecycleService.prepare(preview, tx as never),
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async executeStudent(dto: ExecuteStudentLifecycleDto, actorId: string) {
    const preview = this.studentPreview(dto);
    return this.execute<StudentLifecyclePrepared>(dto, actorId, {
      action: 'STUDENT_RESOLUTION',
      targetType: 'student',
      targetId: dto.studentId,
      preview,
      prepare: () => this.studentLifecycleService.prepare(preview),
      apply: (prepared, context) =>
        this.studentLifecycleService.apply(preview, prepared, context),
    });
  }

  async executeClass(dto: ExecuteClassLifecycleDto, actorId: string) {
    const preview = this.classPreview(dto);
    return this.execute<ClassLifecyclePrepared>(dto, actorId, {
      action: 'ARCHIVE_CLASS',
      targetType: 'class',
      targetId: dto.classId,
      preview,
      prepare: () => this.classLifecycleService.prepare(preview),
      apply: (prepared, context) =>
        this.classLifecycleService.apply(preview, prepared, context),
    });
  }

  async executeSection(dto: ExecuteSectionLifecycleDto, actorId: string) {
    const preview = this.sectionPreview(dto);
    return this.execute<SectionLifecyclePrepared>(dto, actorId, {
      action: 'ARCHIVE_SECTION',
      targetType: 'section',
      targetId: dto.sectionId,
      preview,
      prepare: () => this.sectionLifecycleService.prepare(preview),
      apply: (prepared, context) =>
        this.sectionLifecycleService.apply(preview, prepared, context),
    });
  }

  async executePurge(dto: ExecutePurgeLifecycleDto, actorId: string) {
    const preview = this.purgePreview(dto);
    return this.execute<PurgeLifecyclePrepared>(dto, actorId, {
      action: dto.targetType === 'CLASS' ? 'PURGE_CLASS' : 'PURGE_SECTION',
      targetType: dto.targetType.toLowerCase(),
      targetId: dto.targetId,
      preview,
      prepare: () => this.purgeLifecycleService.prepare(preview),
      apply: (prepared, context) =>
        this.purgeLifecycleService.apply(preview, prepared, context),
    });
  }

  private async verifyActor(
    actorId: string,
    currentPassword: string,
  ): Promise<LifecycleActorSnapshot> {
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, actorId),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true,
      },
    });
    if (!actor || !(await bcrypt.compare(currentPassword, actor.password))) {
      throw new ForbiddenException('Current password is incorrect.');
    }
    return {
      userId: actor.id,
      email: actor.email,
      firstName: actor.firstName,
      lastName: actor.lastName,
    };
  }

  private assertExecutionEvidence(
    dto: ExecutionDto,
    manifest: AdminLifecycleManifest,
  ) {
    if (new Date(dto.manifestExpiresAt).getTime() <= Date.now()) {
      throw new ConflictException(
        'Lifecycle preview expired. Refresh and review the new effects.',
      );
    }
    const { manifestHash: _manifestHash, ...unsignedManifest } = manifest;
    const recomputedHash = hashAdminLifecycleManifestForExpiry(
      unsignedManifest,
      dto.manifestExpiresAt,
    );
    if (recomputedHash !== dto.manifestHash) {
      throw new ConflictException(
        'Lifecycle dependencies changed. Refresh and review a new preview.',
      );
    }
    if (!manifest.safeToExecute || manifest.blockers.length > 0) {
      throw new ConflictException({
        message: 'Lifecycle operation remains blocked.',
        blockers: manifest.blockers,
      });
    }
    const supplied = [...new Set(dto.confirmations)].sort();
    const required = [...new Set(manifest.requiredConfirmations)].sort();
    if (
      supplied.length !== required.length ||
      supplied.some((entry, index) => entry !== required[index])
    ) {
      throw new BadRequestException(
        'Confirm every reviewed lifecycle effect exactly once.',
      );
    }
  }

  private async claimOperation(
    dto: ExecutionDto,
    actorId: string,
    actorSnapshot: LifecycleActorSnapshot,
    domain: Pick<
      ExecutionDomain<unknown>,
      'action' | 'targetType' | 'targetId'
    >,
  ) {
    const requestHash = this.executionRequestHash(dto);
    const existing = await this.db.query.adminLifecycleOperations.findFirst({
      where: eq(adminLifecycleOperations.idempotencyKey, dto.idempotencyKey),
    });
    if (existing) {
      if (
        existing.actorId !== actorId ||
        existing.requestHash !== requestHash
      ) {
        throw new ConflictException(
          'Idempotency key was already used for a different lifecycle request.',
        );
      }
      if (existing.status === 'completed') {
        return { operation: existing, replayed: true as const };
      }
      if (
        existing.status === 'executing' &&
        existing.updatedAt.getTime() > Date.now() - 10 * 60 * 1000
      ) {
        throw new ConflictException(
          'Lifecycle operation is already executing.',
        );
      }
      const [retried] = await this.db
        .update(adminLifecycleOperations)
        .set({
          status: 'executing',
          failure: null,
          attemptCount: existing.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(adminLifecycleOperations.id, existing.id))
        .returning();
      return { operation: retried ?? existing, replayed: false as const };
    }

    try {
      const [created] = await this.db
        .insert(adminLifecycleOperations)
        .values({
          action: domain.action,
          targetType: domain.targetType,
          targetId: domain.targetId,
          status: 'executing',
          actorId,
          actorSnapshot,
          idempotencyKey: dto.idempotencyKey,
          requestHash,
          manifestHash: dto.manifestHash,
          reasonCode: dto.reasonCode,
          notes: dto.notes,
        })
        .returning();
      return { operation: created, replayed: false as const };
    } catch (error: unknown) {
      if ((error as { code?: string })?.code !== '23505') throw error;
      const raced = await this.db.query.adminLifecycleOperations.findFirst({
        where: eq(adminLifecycleOperations.idempotencyKey, dto.idempotencyKey),
      });
      if (
        raced?.actorId === actorId &&
        raced.requestHash === requestHash &&
        raced.status === 'completed'
      ) {
        return { operation: raced, replayed: true as const };
      }
      throw new ConflictException(
        'Lifecycle request with this idempotency key is already in progress.',
      );
    }
  }

  private async execute<P>(
    dto: ExecutionDto,
    actorId: string,
    domain: ExecutionDomain<P>,
  ): Promise<AdminLifecycleExecutionResult> {
    if (!this.configService.get<boolean>('adminLifecycle.enabled')) {
      throw new ServiceUnavailableException(
        'Governed lifecycle execution is not enabled. Preview remains available.',
      );
    }
    const actorSnapshot = await this.verifyActor(actorId, dto.currentPassword);
    const claimed = await this.claimOperation(
      dto,
      actorId,
      actorSnapshot,
      domain,
    );
    if (claimed.replayed) {
      return {
        ...(claimed.operation
          .result as unknown as AdminLifecycleExecutionResult),
        replayed: true,
      };
    }
    const operationId = claimed.operation.id;
    try {
      return await this.databaseService.academicTransaction(async () => {
        const prepared = await domain.prepare();
        this.assertExecutionEvidence(dto, prepared.manifest);
        const context: LifecycleExecutionContext = {
          operationId,
          actorId,
          actorSnapshot,
          reasonCode: dto.reasonCode,
          notes: dto.notes,
        };
        const applied = await domain.apply(prepared, context);
        const notificationInputs = [
          ...new Set(applied.affectedUserIds.filter((id) => id !== actorId)),
        ].map((userId) => ({
          userId,
          type: 'academic_lifecycle_changed' as const,
          referenceId: operationId,
          title: 'Academic membership updated',
          body: 'An administrator completed a reviewed academic lifecycle change.',
          metadata: {
            action: domain.action,
            targetType: domain.targetType,
            targetId: domain.targetId,
          },
        }));
        await this.notificationsService.createBulkDeduped(notificationInputs);
        const audit = await this.auditService.log({
          actorId,
          action: `admin.lifecycle.${domain.action.toLowerCase()}`,
          targetType: domain.targetType,
          targetId: domain.targetId,
          metadata: {
            operationId,
            actorSnapshot,
            reasonCode: dto.reasonCode,
            notes: dto.notes,
            manifestHash: dto.manifestHash,
            changed: applied.changed,
            preserved: applied.preserved,
          },
        });
        const result: AdminLifecycleExecutionResult = {
          operationId,
          action: domain.action,
          targetType: domain.targetType,
          targetId: domain.targetId,
          replayed: false,
          changed: applied.changed,
          preserved: applied.preserved,
          auditLogId: audit.id,
        };
        await this.db
          .update(adminLifecycleOperations)
          .set({
            status: 'completed',
            result: result as unknown as Record<string, unknown>,
            auditLogId: audit.id,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(adminLifecycleOperations.id, operationId));
        return result;
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Unknown failure';
      await this.db
        .update(adminLifecycleOperations)
        .set({ status: 'failed', failure: message, updatedAt: new Date() })
        .where(eq(adminLifecycleOperations.id, operationId));
      throw error;
    }
  }

  async getOperation(operationId: string) {
    const operation = await this.db.query.adminLifecycleOperations.findFirst({
      where: eq(adminLifecycleOperations.id, operationId),
      columns: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        status: true,
        actorSnapshot: true,
        manifestHash: true,
        reasonCode: true,
        notes: true,
        attemptCount: true,
        result: true,
        failure: true,
        auditLogId: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    });
    if (!operation)
      throw new NotFoundException('Lifecycle operation not found');
    return operation;
  }
}
