import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  adminErasureItems,
  adminErasureOperations,
  archivedUsers,
  classes,
  sections,
  users,
  type LifecycleActorSnapshot,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  ExecutePurgeBatchDto,
  PreviewPurgeBatchDto,
  PurgeTargetType,
} from './DTO/admin-lifecycle.dto';
import {
  ADMIN_ERASURE_CATALOG_VERSION,
  ADMIN_ERASURE_RESTRICT_RULES,
  findUnclassifiedErasureReferences,
  normalizeErasureTargetIds,
  requiredErasureConfirmation,
  type ErasureForeignKeyReference,
} from './admin-erasure.catalog';
import { hashAdminLifecycleRequest } from './admin-lifecycle.manifest';
import type {
  AdminLifecycleBlocker,
  AdminLifecycleWarning,
} from './admin-lifecycle.types';
import { PurgeLifecycleService } from './purge-lifecycle.service';

export interface AdminErasureImpactGroup {
  code: string;
  label: string;
  rowCount: number;
  action: 'DELETE' | 'DETACH' | 'PRESERVE_RECEIPT';
}

export interface AdminErasureTargetPreview {
  id: string;
  displayName: string;
  lifecycleState: 'ACTIVE' | 'ARCHIVED' | 'SOFT_DELETED' | 'MISSING';
  impactGroups: AdminErasureImpactGroup[];
  storageObjectCount: number;
  storageBytes: number | null;
  warnings: AdminLifecycleWarning[];
  blockers: AdminLifecycleBlocker[];
  canExecute: boolean;
}

export interface AdminErasureBatchPreview {
  schemaVersion: 3;
  targetType: PurgeTargetType;
  targetIds: string[];
  purgeMode: 'EMPTY_ONLY' | 'CASCADE_ERASE';
  targets: AdminErasureTargetPreview[];
  totals: Record<string, number>;
  warnings: AdminLifecycleWarning[];
  blockers: AdminLifecycleBlocker[];
  globalBlockers: AdminLifecycleBlocker[];
  canExecute: boolean;
  confirmationText: string;
  catalogVersion: number;
  databaseSchemaHash: string;
  manifestHash: string;
  manifestExpiresAt: string;
}

export interface AdminErasureExecutionResult {
  operationId: string;
  status: 'cleanup_pending' | 'completed';
  targetType: PurgeTargetType;
  targetIds: string[];
  deletedCount: number;
  cleanupStatus: 'pending' | 'not_required';
  replayed: boolean;
}

type ErasureDb = DatabaseService['db'];
type AdminErasureOperation = typeof adminErasureOperations.$inferSelect;

interface SchemaReferenceRow
  extends ErasureForeignKeyReference, Record<string, unknown> {
  definition: string;
}

interface StorageRow extends Record<string, unknown> {
  targetId: string;
  storageKey: string | null;
  sizeBytes: number | string | null;
}

const impactLabels: Record<string, string> = {
  enrollmentHistory: 'Enrollment history',
  lifecycleEvents: 'Lifecycle events',
  classRecords: 'Class records',
  classRecordParticipants: 'Class-record participants',
  legacyGradeEvidence: 'Legacy grade evidence',
  gradeRevisions: 'Period grade revisions',
  draftParticipants: 'Draft class-record participants',
  finalizedParticipants: 'Finalized class-record participants',
  scores: 'Scores and grades',
  attempts: 'Assessment attempts',
  assessments: 'Assessments',
  lessons: 'Lessons',
  linkedClasses: 'Linked or authored classes',
};

function uniqueByCode<T extends { code: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.code, item])).values()];
}

interface SafeAdminErasureFailure {
  operationId: string;
  code: string;
  databaseCode?: string;
  constraint?: string;
  table?: string;
}

const safeFailureCodePattern = /^[A-Z0-9_]{1,80}$/;
const safeDatabaseIdentifierPattern = /^[A-Za-z0-9_.-]{1,160}$/;

function safeString(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === 'string' && pattern.test(value) ? value : undefined;
}

function nestedDatabaseDetails(error: unknown) {
  const details: Pick<
    SafeAdminErasureFailure,
    'databaseCode' | 'constraint' | 'table'
  > = {};
  const visited = new Set<unknown>();
  let current: unknown = error;

  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (visited.has(current) || typeof current !== 'object') break;
    visited.add(current);
    const candidate = current as Record<string, unknown>;
    details.databaseCode ??= safeString(candidate.code, safeFailureCodePattern);
    details.constraint ??= safeString(
      candidate.constraint,
      safeDatabaseIdentifierPattern,
    );
    details.table ??= safeString(
      candidate.table,
      safeDatabaseIdentifierPattern,
    );
    current =
      candidate.cause ?? candidate.originalError ?? candidate.driverError;
  }

  return details;
}

export function normalizeAdminErasureFailure(
  error: unknown,
  operationId: string,
) {
  const response = error instanceof HttpException ? error.getResponse() : null;
  const responseCode =
    response && typeof response === 'object'
      ? safeString(
          (response as Record<string, unknown>).code,
          safeFailureCodePattern,
        )
      : undefined;
  const code =
    responseCode ??
    (error instanceof ForbiddenException
      ? 'ERASURE_FORBIDDEN'
      : 'ERASURE_EXECUTION_FAILED');
  const databaseDetails = nestedDatabaseDetails(error);
  const summary: SafeAdminErasureFailure = {
    operationId,
    code,
    ...databaseDetails,
  };
  const record = {
    failureCode: code,
    failureMessage: JSON.stringify(summary),
  };

  if (error instanceof HttpException) {
    return { record, exception: error };
  }

  return {
    record,
    exception: new InternalServerErrorException({
      operationId,
      code,
      message: 'Permanent deletion failed. Use the operation ID for support.',
    }),
  };
}

export function assertAdminErasureExecution(
  dto: {
    manifestHash: string;
    manifestExpiresAt: string;
    confirmation: string;
  },
  preview: Pick<
    AdminErasureBatchPreview,
    | 'manifestHash'
    | 'manifestExpiresAt'
    | 'confirmationText'
    | 'canExecute'
    | 'blockers'
  >,
) {
  if (new Date(dto.manifestExpiresAt).getTime() <= Date.now()) {
    throw new ConflictException({
      code: 'ERASURE_MANIFEST_STALE',
      message: 'The erasure preview expired. Review the current impact again.',
    });
  }
  if (
    dto.manifestExpiresAt !== preview.manifestExpiresAt ||
    dto.manifestHash !== preview.manifestHash
  ) {
    throw new ConflictException({
      code: 'ERASURE_MANIFEST_STALE',
      message: 'The selected records or their dependencies changed.',
    });
  }
  if (!preview.canExecute || preview.blockers.length > 0) {
    throw new ConflictException({
      code: preview.blockers[0]?.code ?? 'INVALID_ERASURE_REQUEST',
      message: 'Permanent deletion remains blocked.',
      blockers: preview.blockers,
    });
  }
  if (dto.confirmation !== preview.confirmationText) {
    throw new BadRequestException({
      code: 'INVALID_ERASURE_REQUEST',
      message: 'Enter the exact batch confirmation shown in the preview.',
    });
  }
}

@Injectable()
export class AdminErasureService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly purgeLifecycleService: PurgeLifecycleService,
    private readonly auditService?: AuditService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional()
    @InjectQueue('admin-erasure-cleanup')
    private readonly cleanupQueue?: Queue,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private async inspectSchema(db: ErasureDb) {
    const result = await db.execute<SchemaReferenceRow>(sql`
      WITH RECURSIVE roots AS (
        SELECT relation.oid
        FROM pg_class relation
        JOIN pg_namespace relation_namespace
          ON relation_namespace.oid = relation.relnamespace
        WHERE relation_namespace.nspname = 'public'
          AND relation.relname IN ('classes', 'sections', 'users')
      ), cascade_reachable AS (
        SELECT roots.oid AS table_oid,
               ARRAY[roots.oid] AS visited,
               0 AS depth
        FROM roots
        UNION ALL
        SELECT constraint_row.conrelid AS table_oid,
               cascade_reachable.visited || constraint_row.conrelid,
               cascade_reachable.depth + 1
        FROM cascade_reachable
        JOIN pg_constraint constraint_row
          ON constraint_row.confrelid = cascade_reachable.table_oid
         AND constraint_row.contype = 'f'
         AND constraint_row.confdeltype = 'c'
        JOIN pg_class cascade_child ON cascade_child.oid = constraint_row.conrelid
        JOIN pg_namespace cascade_child_namespace
          ON cascade_child_namespace.oid = cascade_child.relnamespace
        WHERE cascade_child_namespace.nspname = 'public'
          AND NOT constraint_row.conrelid = ANY(cascade_reachable.visited)
          AND cascade_reachable.depth < 20
      ), reachable_relationships AS (
        SELECT DISTINCT constraint_row.oid
        FROM cascade_reachable
        JOIN pg_constraint constraint_row
          ON constraint_row.confrelid = cascade_reachable.table_oid
         AND constraint_row.contype = 'f'
      )
      SELECT src.relname AS "table",
             source_column.attname AS "column",
             target.relname AS "targetTable",
             CASE constraint_row.confdeltype
               WHEN 'c' THEN 'CASCADE'
               WHEN 'n' THEN 'SET NULL'
               WHEN 'r' THEN 'RESTRICT'
               WHEN 'a' THEN 'NO ACTION'
               ELSE constraint_row.confdeltype::text
             END AS "onDelete",
             pg_get_constraintdef(constraint_row.oid) AS definition
      FROM pg_constraint constraint_row
      JOIN reachable_relationships
        ON reachable_relationships.oid = constraint_row.oid
      JOIN pg_class src ON src.oid = constraint_row.conrelid
      JOIN pg_namespace source_namespace ON source_namespace.oid = src.relnamespace
      JOIN pg_class target ON target.oid = constraint_row.confrelid
      CROSS JOIN LATERAL unnest(constraint_row.conkey)
        WITH ORDINALITY source_key(attnum, ord)
      JOIN pg_attribute source_column
        ON source_column.attrelid = src.oid
       AND source_column.attnum = source_key.attnum
      WHERE constraint_row.contype = 'f'
        AND source_namespace.nspname = 'public'
      ORDER BY src.relname, source_column.attname, target.relname
    `);
    const references = [...result.rows];
    const databaseSchemaHash = hashAdminLifecycleRequest({
      catalogVersion: ADMIN_ERASURE_CATALOG_VERSION,
      references,
    });
    return {
      references,
      databaseSchemaHash,
      unclassified: findUnclassifiedErasureReferences(references),
    };
  }

  private async collectStorage(
    db: ErasureDb,
    targetType: PurgeTargetType,
    targetIds: string[],
  ): Promise<StorageRow[]> {
    if (targetType === 'CLASS') {
      const result = await db.execute<StorageRow>(sql`
        SELECT class_id AS "targetId", storage_key AS "storageKey",
               size_bytes AS "sizeBytes"
        FROM uploaded_files
        WHERE class_id IN (${sql.join(
          targetIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}) AND storage_key IS NOT NULL
      `);
      return result.rows;
    }
    if (targetType === 'SECTION') {
      const result = await db.execute<StorageRow>(sql`
        SELECT classes.section_id AS "targetId",
               uploaded_files.storage_key AS "storageKey",
               uploaded_files.size_bytes AS "sizeBytes"
        FROM uploaded_files
        JOIN classes ON classes.id = uploaded_files.class_id
        WHERE classes.section_id IN (${sql.join(
          targetIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}) AND uploaded_files.storage_key IS NOT NULL
      `);
      return result.rows;
    }
    const result = await db.execute<StorageRow>(sql`
      SELECT teacher_id AS "targetId", storage_key AS "storageKey",
             size_bytes AS "sizeBytes"
      FROM uploaded_files
      WHERE teacher_id IN (${sql.join(
        targetIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}) AND class_id IS NULL AND storage_key IS NOT NULL
    `);
    return result.rows;
  }

  async prepare(
    dto: PreviewPurgeBatchDto,
    actorId: string,
    options: { db?: ErasureDb; manifestExpiresAt?: string } = {},
  ): Promise<AdminErasureBatchPreview> {
    const db = options.db ?? this.db;
    const targetIds = normalizeErasureTargetIds(dto.targetIds);
    const schema = await this.inspectSchema(db);
    const storageRows = await this.collectStorage(
      db,
      dto.targetType,
      targetIds,
    );
    const targets: AdminErasureTargetPreview[] = [];
    const globalBlockers: AdminLifecycleBlocker[] = [];
    const targetBlockers: AdminLifecycleBlocker[] = [];
    const warnings: AdminLifecycleWarning[] = [];
    const totals: Record<string, number> = {};

    if (
      dto.purgeMode === 'CASCADE_ERASE' &&
      !this.configService.get<boolean>('adminLifecycle.cascadeEraseEnabled')
    ) {
      globalBlockers.push({
        code: 'CAPABILITY_UNAVAILABLE',
        message: 'Cascade erasure is not enabled for this environment.',
        resolvable: false,
      });
    }
    if (schema.unclassified.length > 0) {
      globalBlockers.push({
        code: 'UNCLASSIFIED_DEPENDENCY',
        message: `A new database dependency must be reviewed before deletion: ${schema.unclassified
          .map((entry) => `${entry.table}.${entry.column}`)
          .join(', ')}`,
        resolvable: false,
      });
    }
    if (dto.targetType === 'USER' && targetIds.includes(actorId)) {
      globalBlockers.push({
        code: 'SELF_ACCOUNT_ERASURE_FORBIDDEN',
        message:
          'You cannot permanently delete your own administrator account.',
        resolvable: false,
      });
    }
    if (dto.targetType === 'USER') {
      try {
        await this.assertLastAdminBoundary(db, dto.targetType, targetIds);
      } catch (error: unknown) {
        if (!(error instanceof ForbiddenException)) throw error;
        const response = error.getResponse();
        const detail =
          typeof response === 'object' && response
            ? (response as { code?: string; message?: string })
            : {};
        globalBlockers.push({
          code: detail.code ?? 'LAST_ADMIN_ERASURE_FORBIDDEN',
          message:
            detail.message ??
            'At least one active administrator account must remain.',
          resolvable: false,
        });
      }
    }

    for (const targetId of targetIds) {
      try {
        const prepared = await this.purgeLifecycleService.prepare(
          {
            targetType: dto.targetType,
            targetId,
            purgeMode: dto.purgeMode,
          },
          db,
        );
        const impactGroups = Object.entries(prepared.snapshot.evidence)
          .filter(([, count]) => Number(count) > 0)
          .map(([code, count]) => ({
            code,
            label: impactLabels[code] ?? code,
            rowCount: Number(count),
            action:
              dto.targetType === 'USER' && code === 'linkedClasses'
                ? ('DETACH' as const)
                : ('DELETE' as const),
          }));
        for (const impact of impactGroups) {
          totals[impact.code] = (totals[impact.code] ?? 0) + impact.rowCount;
        }
        const targetStorage = storageRows.filter(
          (row) => row.targetId === targetId,
        );
        const blockers = uniqueByCode(prepared.manifest.blockers);
        const targetWarnings = uniqueByCode(prepared.manifest.warnings);
        targets.push({
          id: targetId,
          displayName: prepared.snapshot.targetName,
          lifecycleState: prepared.snapshot.isActive
            ? 'ACTIVE'
            : dto.targetType === 'USER'
              ? 'SOFT_DELETED'
              : 'ARCHIVED',
          impactGroups,
          storageObjectCount: targetStorage.length,
          storageBytes: targetStorage.reduce(
            (sum, row) => sum + Number(row.sizeBytes ?? 0),
            0,
          ),
          warnings: targetWarnings,
          blockers,
          canExecute: blockers.length === 0,
        });
        targetBlockers.push(...blockers);
        warnings.push(...targetWarnings);
      } catch (error: unknown) {
        if (!(error instanceof NotFoundException)) throw error;
        const missingBlocker: AdminLifecycleBlocker = {
          code: 'ERASURE_TARGET_NOT_FOUND',
          message: `Target ${targetId} no longer exists.`,
          resolvable: false,
        };
        targets.push({
          id: targetId,
          displayName: 'Missing target',
          lifecycleState: 'MISSING',
          impactGroups: [],
          storageObjectCount: 0,
          storageBytes: 0,
          warnings: [],
          blockers: [missingBlocker],
          canExecute: false,
        });
        targetBlockers.push(missingBlocker);
      }
    }

    const manifestExpiresAt =
      options.manifestExpiresAt ??
      new Date(Date.now() + 10 * 60_000).toISOString();
    const confirmationText = requiredErasureConfirmation(
      dto.targetType,
      targetIds.length,
    );
    const unsigned = {
      schemaVersion: 3 as const,
      targetType: dto.targetType,
      targetIds,
      purgeMode: dto.purgeMode,
      targets,
      totals,
      catalogVersion: ADMIN_ERASURE_CATALOG_VERSION,
      databaseSchemaHash: schema.databaseSchemaHash,
      confirmationText,
      manifestExpiresAt,
    };
    const manifestHash = hashAdminLifecycleRequest(unsigned);
    const uniqueGlobalBlockers = uniqueByCode(globalBlockers);
    const uniqueBlockers = uniqueByCode([
      ...uniqueGlobalBlockers,
      ...targetBlockers,
    ]);
    return {
      ...unsigned,
      warnings: uniqueByCode(warnings),
      blockers: uniqueBlockers,
      globalBlockers: uniqueGlobalBlockers,
      canExecute:
        uniqueGlobalBlockers.length === 0 &&
        targets.every((target) => target.canExecute),
      manifestHash,
    };
  }

  private async assertLastAdminBoundary(
    db: ErasureDb,
    targetType: PurgeTargetType,
    targetIds: string[],
  ) {
    if (targetType !== 'USER') return;
    const result = await db.execute<{
      target_admin_count: string;
      active_admin_count: string;
    }>(sql`
      SELECT
        count(*) FILTER (
          WHERE users.id IN (${sql.join(
            targetIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}) AND users.account_status = 'ACTIVE'
        )::text AS target_admin_count,
        count(*) FILTER (WHERE users.account_status = 'ACTIVE')::text AS active_admin_count
      FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      JOIN roles ON roles.id = user_roles.role_id
      WHERE roles.name = 'admin'
    `);
    const row = result.rows[0];
    if (
      Number(row?.target_admin_count ?? 0) > 0 &&
      Number(row?.active_admin_count ?? 0) -
        Number(row?.target_admin_count ?? 0) <
        1
    ) {
      throw new ForbiddenException({
        code: 'LAST_ADMIN_ERASURE_FORBIDDEN',
        message: 'At least one active administrator account must remain.',
      });
    }
  }

  private async claimOperation(
    dto: ExecutePurgeBatchDto,
    actorId: string,
    actorSnapshot: LifecycleActorSnapshot,
    preview: AdminErasureBatchPreview,
  ) {
    const requestHash = this.requestHash(dto);
    const existing = await this.db.query.adminErasureOperations.findFirst({
      where: eq(adminErasureOperations.idempotencyKey, dto.idempotencyKey),
    });
    if (existing) return this.resolveExistingOperation(existing, requestHash);
    const [operation] = await this.db
      .insert(adminErasureOperations)
      .values({
        idempotencyKey: dto.idempotencyKey,
        targetType: dto.targetType,
        purgeMode: dto.purgeMode,
        actorId,
        actorSnapshot,
        requestHash,
        manifestHash: dto.manifestHash,
        databaseSchemaHash: preview.databaseSchemaHash,
        catalogVersion: preview.catalogVersion,
        reasonCode: dto.reasonCode,
        notes: dto.notes ?? '',
        targetCount: preview.targetIds.length,
        impactSummary: preview.totals,
      })
      .onConflictDoNothing({ target: adminErasureOperations.idempotencyKey })
      .returning();
    if (operation) return { operation, result: null };
    const raced = await this.db.query.adminErasureOperations.findFirst({
      where: eq(adminErasureOperations.idempotencyKey, dto.idempotencyKey),
    });
    if (!raced) {
      throw new ConflictException({
        code: 'ERASURE_ALREADY_EXECUTING',
        message: 'The erasure request could not be claimed. Retry its status.',
      });
    }
    return this.resolveExistingOperation(raced, requestHash);
  }

  private requestHash(dto: ExecutePurgeBatchDto) {
    return hashAdminLifecycleRequest({
      targetType: dto.targetType,
      targetIds: normalizeErasureTargetIds(dto.targetIds),
      purgeMode: dto.purgeMode,
      reasonCode: dto.reasonCode,
      notes: dto.notes ?? '',
    });
  }

  private resolveExistingOperation(
    existing: AdminErasureOperation,
    requestHash: string,
  ) {
    if (existing.requestHash !== requestHash) {
      throw new ConflictException({
        code: 'INVALID_ERASURE_REQUEST',
        message: 'This idempotency key belongs to a different request.',
      });
    }
    if (existing.status === 'executing') {
      throw new ConflictException({
        code: 'ERASURE_ALREADY_EXECUTING',
        operationId: existing.id,
        message: 'This erasure batch is already executing.',
      });
    }
    if (existing.result) {
      return {
        operation: existing,
        result: {
          ...(existing.result as unknown as AdminErasureExecutionResult),
          replayed: true,
        },
      };
    }
    throw new ConflictException({
      code: 'ERASURE_PREVIOUSLY_FAILED',
      operationId: existing.id,
      message: 'This erasure request failed previously. Review its receipt.',
    });
  }

  private async lockTargets(
    db: ErasureDb,
    targetType: PurgeTargetType,
    targetIds: string[],
  ) {
    const table =
      targetType === 'CLASS'
        ? 'classes'
        : targetType === 'SECTION'
          ? 'sections'
          : 'users';
    await db.execute(
      sql.raw(
        `SELECT id FROM public.${table} WHERE id IN (${targetIds
          .map((id) => `'${id.replaceAll("'", "''")}'::uuid`)
          .join(',')}) ORDER BY id FOR UPDATE`,
      ),
    );
  }

  private async applyCatalogDeletion(
    db: ErasureDb,
    targetType: PurgeTargetType,
    targetIds: string[],
    actorId: string,
  ) {
    if (targetType === 'CLASS' || targetType === 'SECTION') {
      if (targetType === 'CLASS') {
        await db.execute(sql`
          DELETE FROM academic_period_grade_revisions
          WHERE class_id IN (${sql.join(
            targetIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})
             OR class_record_id IN (
               SELECT id FROM class_records
               WHERE class_id IN (${sql.join(
                 targetIds.map((id) => sql`${id}::uuid`),
                 sql`, `,
               )})
             )
        `);
        await db.execute(sql`
          DELETE FROM academic_legacy_grade_evidence
          WHERE class_record_id IN (
            SELECT id FROM class_records
            WHERE class_id IN (${sql.join(
              targetIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )})
          )
        `);
        await db.execute(sql`
          DELETE FROM class_record_participants
          WHERE class_record_id IN (
            SELECT id FROM class_records
            WHERE class_id IN (${sql.join(
              targetIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )})
          )
        `);
      } else {
        await db.execute(sql`
          DELETE FROM academic_period_grade_revisions
          WHERE class_id IN (
            SELECT id FROM classes
            WHERE section_id IN (${sql.join(
              targetIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )})
          )
             OR class_record_id IN (
               SELECT class_records.id
               FROM class_records
               JOIN classes ON classes.id = class_records.class_id
               WHERE classes.section_id IN (${sql.join(
                 targetIds.map((id) => sql`${id}::uuid`),
                 sql`, `,
               )})
             )
        `);
        await db.execute(sql`
          DELETE FROM academic_legacy_grade_evidence
          WHERE class_record_id IN (
            SELECT class_records.id
            FROM class_records
            JOIN classes ON classes.id = class_records.class_id
            WHERE classes.section_id IN (${sql.join(
              targetIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )})
          )
        `);
        await db.execute(sql`
          DELETE FROM class_record_participants
          WHERE class_record_id IN (
            SELECT class_records.id
            FROM class_records
            JOIN classes ON classes.id = class_records.class_id
            WHERE classes.section_id IN (${sql.join(
              targetIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )})
          )
        `);
      }
    } else {
      const authorRules = ADMIN_ERASURE_RESTRICT_RULES.filter(
        (rule) => rule.targetTypes.includes('USER') && rule.action === 'DETACH',
      );
      const participantRules = ADMIN_ERASURE_RESTRICT_RULES.filter(
        (rule) => rule.targetTypes.includes('USER') && rule.action === 'DELETE',
      );
      for (const rule of authorRules) {
        const preserveClassFiles =
          rule.table === 'uploaded_files' ? ' AND class_id IS NOT NULL' : '';
        await db.execute(
          sql.raw(
            `UPDATE public.${rule.table} SET ${rule.column} = '${actorId.replaceAll("'", "''")}'::uuid WHERE ${rule.column} IN (${targetIds
              .map((id) => `'${id.replaceAll("'", "''")}'::uuid`)
              .join(',')})${preserveClassFiles}`,
          ),
        );
      }
      for (const rule of participantRules) {
        await db.execute(
          sql.raw(
            `DELETE FROM public.${rule.table} WHERE ${rule.column} IN (${targetIds
              .map((id) => `'${id.replaceAll("'", "''")}'::uuid`)
              .join(',')})`,
          ),
        );
      }
      await db
        .update(archivedUsers)
        .set({ purgedAt: new Date() })
        .where(inArray(archivedUsers.originalUserId, targetIds));
    }
    if (targetType === 'CLASS') {
      await db.delete(classes).where(inArray(classes.id, targetIds));
    } else if (targetType === 'SECTION') {
      await db.delete(sections).where(inArray(sections.id, targetIds));
    } else {
      await db.delete(users).where(inArray(users.id, targetIds));
    }
  }

  async execute(
    dto: ExecutePurgeBatchDto,
    actorId: string,
    actorSnapshot: LifecycleActorSnapshot,
  ): Promise<AdminErasureExecutionResult> {
    const existing = await this.db.query.adminErasureOperations.findFirst({
      where: eq(adminErasureOperations.idempotencyKey, dto.idempotencyKey),
    });
    if (existing) {
      const replay = this.resolveExistingOperation(
        existing,
        this.requestHash(dto),
      );
      if (replay.result) return replay.result;
    }
    const initialPreview = await this.prepare(dto, actorId, {
      manifestExpiresAt: dto.manifestExpiresAt,
    });
    assertAdminErasureExecution(dto, initialPreview);
    await this.assertLastAdminBoundary(
      this.db,
      dto.targetType,
      initialPreview.targetIds,
    );
    const claimed = await this.claimOperation(
      dto,
      actorId,
      actorSnapshot,
      initialPreview,
    );
    if (claimed.result) return claimed.result;
    const operationId = claimed.operation.id;

    try {
      const result = await this.databaseService.academicTransaction(
        async () => {
          const db = this.db;
          await this.lockTargets(db, dto.targetType, initialPreview.targetIds);
          const reviewed = await this.prepare(dto, actorId, {
            db,
            manifestExpiresAt: dto.manifestExpiresAt,
          });
          assertAdminErasureExecution(dto, reviewed);
          await this.assertLastAdminBoundary(
            db,
            dto.targetType,
            reviewed.targetIds,
          );
          const storageRows = await this.collectStorage(
            db,
            dto.targetType,
            reviewed.targetIds,
          );
          await db.insert(adminErasureItems).values(
            reviewed.targets.map((target) => ({
              operationId,
              targetId: target.id,
              targetSnapshot: {
                id: target.id,
                displayName: target.displayName,
                lifecycleState: target.lifecycleState,
              },
              status: storageRows.some((row) => row.targetId === target.id)
                ? ('cleanup_pending' as const)
                : ('completed' as const),
              impactCounts: Object.fromEntries(
                target.impactGroups.map((impact) => [
                  impact.code,
                  impact.rowCount,
                ]),
              ),
              storageObjects: storageRows
                .filter((row) => row.targetId === target.id && row.storageKey)
                .map((row) => ({
                  key: row.storageKey!,
                  bytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
                })),
              result: { deleted: true },
            })),
          );
          await this.applyCatalogDeletion(
            db,
            dto.targetType,
            reviewed.targetIds,
            actorId,
          );
          const hasCleanup = storageRows.some((row) => Boolean(row.storageKey));
          const executionResult: AdminErasureExecutionResult = {
            operationId,
            status: hasCleanup ? 'cleanup_pending' : 'completed',
            targetType: dto.targetType,
            targetIds: reviewed.targetIds,
            deletedCount: reviewed.targetIds.length,
            cleanupStatus: hasCleanup ? 'pending' : 'not_required',
            replayed: false,
          };
          if (this.auditService) {
            await this.auditService.log(
              {
                actorId,
                action: 'admin.erasure.batch_completed',
                targetType: dto.targetType.toLowerCase(),
                targetId: operationId,
                metadata: {
                  operationId,
                  targetCount: reviewed.targetIds.length,
                  purgeMode: dto.purgeMode,
                  reasonCode: dto.reasonCode,
                  manifestHash: dto.manifestHash,
                  catalogVersion: reviewed.catalogVersion,
                  databaseSchemaHash: reviewed.databaseSchemaHash,
                  cleanupStatus: executionResult.cleanupStatus,
                },
              },
              db,
            );
          }
          await db
            .update(adminErasureOperations)
            .set({
              status: executionResult.status,
              cleanupSummary: {
                objectCount: storageRows.length,
                pendingCount: storageRows.length,
              },
              result: executionResult as unknown as Record<string, unknown>,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(adminErasureOperations.id, operationId));
          if (this.notificationsService) {
            const adminRows = await db.execute<{ user_id: string }>(sql`
            SELECT DISTINCT users.id AS user_id
            FROM users
            JOIN user_roles ON user_roles.user_id = users.id
            JOIN roles ON roles.id = user_roles.role_id
            WHERE roles.name = 'admin'
              AND users.account_status = 'ACTIVE'
              AND users.id <> ${actorId}::uuid
          `);
            await this.databaseService.afterAcademicCommit(() =>
              this.notificationsService!.createBulkDeduped(
                adminRows.rows.map((row) => ({
                  userId: row.user_id,
                  type: 'academic_lifecycle_changed' as const,
                  referenceId: operationId,
                  title: 'Permanent deletion completed',
                  body: `An administrator permanently deleted ${reviewed.targetIds.length} reviewed ${dto.targetType.toLowerCase()} record${reviewed.targetIds.length === 1 ? '' : 's'}.`,
                  metadata: {
                    operationId,
                    targetType: dto.targetType,
                    targetCount: reviewed.targetIds.length,
                    reasonCode: dto.reasonCode,
                  },
                })),
              ),
            );
          }
          if (hasCleanup) {
            await this.databaseService.afterAcademicCommit(() =>
              this.enqueueCleanup(operationId),
            );
          }
          return executionResult;
        },
      );
      return result;
    } catch (error: unknown) {
      const failure = normalizeAdminErasureFailure(error, operationId);
      await this.db
        .update(adminErasureOperations)
        .set({
          status: 'failed',
          ...failure.record,
          updatedAt: new Date(),
        })
        .where(eq(adminErasureOperations.id, operationId));
      throw failure.exception;
    }
  }

  async getOperation(id: string) {
    const operation = await this.db.query.adminErasureOperations.findFirst({
      where: eq(adminErasureOperations.id, id),
      with: { items: true },
    });
    if (!operation) throw new NotFoundException('Erasure operation not found');
    return operation;
  }

  private async enqueueCleanup(operationId: string) {
    if (!this.cleanupQueue) return;
    await this.cleanupQueue.add(
      'cleanup-operation',
      { operationId },
      {
        jobId: `admin-erasure-${operationId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  async retryCleanup(operationId: string) {
    const operation = await this.getOperation(operationId);
    if (
      operation.status !== 'cleanup_pending' &&
      operation.status !== 'completed_with_cleanup_errors'
    ) {
      return {
        operationId,
        status: operation.status,
        cleanupStatus:
          operation.status === 'completed' ? 'completed' : 'not_retryable',
      };
    }
    if (!this.cleanupQueue) {
      throw new ConflictException({
        code: 'CLEANUP_QUEUE_UNAVAILABLE',
        message: 'Cleanup cannot be queued in this environment.',
      });
    }
    await this.cleanupQueue.add(
      'cleanup-operation',
      { operationId },
      {
        jobId: `admin-erasure-retry-${operationId}-${Date.now()}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    await this.db
      .update(adminErasureOperations)
      .set({ status: 'cleanup_pending', updatedAt: new Date() })
      .where(eq(adminErasureOperations.id, operationId));
    return { operationId, status: 'cleanup_pending', cleanupStatus: 'pending' };
  }
}
