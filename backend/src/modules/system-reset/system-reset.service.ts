import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcrypt';
import { isDeepStrictEqual } from 'node:util';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import type { PeriodKey } from '../academic-state/academic-policy';
import {
  RESET_ACKNOWLEDGEMENTS,
  RESET_CATALOG,
  RESET_COORDINATOR_LOCK,
  RESET_IO_LOCK,
  RESET_WRITE_LOCK,
} from './system-reset.catalog';
import {
  applyResetDatabase,
  inspectResetDatabase,
  readResetTargetPolicy,
  verifyResetDatabase,
} from './system-reset.database';
import { ResetExecuteDto, ResetPreviewDto } from './system-reset.dto';
import { runResetCleanupContext } from './system-reset.context';
import {
  assertResetConfirmation,
  buildResetPreview,
  hashResetRequest,
  ResetPreview,
  verifyResetPreview,
} from './system-reset.manifest';
import { SystemResetAssets } from './system-reset.assets';
import {
  ResetQueuePauseStates,
  SystemResetQueues,
} from './system-reset.queues';
import {
  assertResetParticipants,
  resetContentCounts,
  resetPublicStatus,
  resetRetryMatches,
} from './system-reset.coordination';

const comparePassword = compare as unknown as (
  password: string,
  hash: string,
) => Promise<boolean>;

type Participant = {
  id: string;
  kind: string;
  cache_epoch: number;
  in_flight: number;
  retired: boolean;
};
type ResetStatusRow = {
  active: boolean;
  operation_id: string | null;
  phase: string | null;
  failure_code: string | null;
};
type ResetStateRow = {
  active: boolean;
  operation_id: string | null;
  epoch: number;
  storage_generation: string;
  phase?: string | null;
};
type AdvisoryLockRow = { acquired: boolean };
type Operation = {
  id: string;
  actor_id: string;
  request_hash: string;
  environment: string;
  school_year: string;
  period: PeriodKey;
  phase: string;
  manifest: ResetPreview;
  failure: string | null;
  attempts: number;
  checkpoint: {
    epoch: number;
    queueStates: ResetQueuePauseStates;
    requiredParticipants: string[];
    storageGeneration: string;
    retiredStorageGeneration?: string;
    databaseCommitted?: boolean;
    cleanupGeneration?: number;
    outcome?: 'complete' | 'aborted';
    hardRetiredParticipants?: string[];
  };
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
};
const ACK_LABELS = [
  'Every other account will be removed; only my administrator account remains.',
  'School content, enrollments, assessments, attempts and grades will be cleared.',
  'Uploaded files, indexed content, AI caches and queued jobs will be cleared.',
  'System settings and audit/repair history remain, including historical names or academic values in evidence.',
  'All sessions end after reset, including mine; I will sign in again.',
];

@Injectable()
export class SystemResetService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemResetService.name);
  private timer?: NodeJS.Timeout;
  private activeTick?: Promise<void>;
  private busy = false;
  private stopping = false;
  private nextRun = 0;

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly queues: SystemResetQueues,
    private readonly assets: SystemResetAssets,
  ) {}
  onModuleInit() {
    // Recovery is deliberately independent of new-operation availability.
    this.timer = setInterval(() => void this.tick(), 2000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.activeTick;
  }
  private environment() {
    return this.config.get<string>('SYSTEM_RESET_ENVIRONMENT') ?? '';
  }
  private secret() {
    return this.config.get<string>('jwt.secret') ?? '';
  }
  private configurationBlockers() {
    const blockers: Array<{ code: string; message: string }> = [];
    if (this.config.get<string>('SYSTEM_RESET_ENABLED') !== 'true')
      blockers.push({
        code: 'RESET_DISABLED',
        message: 'Reset is not enabled for this installation.',
      });
    if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,49}$/.test(this.environment()))
      blockers.push({
        code: 'ENVIRONMENT_REQUIRED',
        message: 'Configure an explicit reset environment label.',
      });
    if (this.secret().length < 32)
      blockers.push({
        code: 'SIGNING_UNAVAILABLE',
        message: 'Reset preview signing is not configured.',
      });
    if (
      this.config.get('SYSTEM_RESET_BACKEND_TOPOLOGY') !==
      'single-backend-shared-upload-root'
    )
      blockers.push({
        code: 'TOPOLOGY_UNVERIFIED',
        message:
          'Reset requires one backend replica with an explicitly owned upload root retained across its restarts.',
      });
    if (
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
        this.config.get<string>('SYSTEM_RESET_STORAGE_ID') ?? '',
      )
    )
      blockers.push({
        code: 'STORAGE_ID_REQUIRED',
        message:
          'Reset requires the stable UUID stored in each upload storage ownership sentinel.',
      });
    return blockers;
  }
  private async actor(client: PoolClient, actorId: string) {
    const actor = (
      await client.query<{
        id: string;
        email: string;
        displayName: string;
        password: string;
      }>(
        `SELECT u.id,u.email,concat_ws(' ',u.first_name,u.last_name) AS "displayName",u.password FROM users u WHERE u.id=$1 AND u.account_status='ACTIVE' AND u.is_email_verified=true AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.name='admin')`,
        [actorId],
      )
    ).rows[0];
    if (!actor)
      throw new ForbiddenException(
        'Reset requires an active, verified administrator.',
      );
    return actor;
  }
  private publicActor(actor: {
    id: string;
    email: string;
    displayName: string;
  }) {
    return { id: actor.id, email: actor.email, displayName: actor.displayName };
  }
  private async participants(client: PoolClient, required: string[] = []) {
    return (
      await client.query<Participant>(
        `SELECT id,kind,cache_epoch,in_flight,retired FROM system_reset_instances WHERE (retired=false AND (heartbeat_at>now()-interval '30 seconds' OR in_flight>0)) OR id=ANY($1::text[]) ORDER BY id`,
        [required],
      )
    ).rows;
  }
  private assertTopology(rows: Participant[]) {
    if (rows.some((row) => !['backend', 'ai'].includes(row.kind)))
      throw new ConflictException(
        'An unreviewed reset participant is registered.',
      );
    if (rows.filter((row) => row.kind === 'backend').length !== 1)
      throw new ConflictException(
        'Reset requires exactly one acknowledged backend replica.',
      );
    if (!rows.some((row) => row.kind === 'ai'))
      throw new ConflictException(
        'An AI service reset participant must be available.',
      );
  }
  async maintenance() {
    return this.database.withConnection(async (client) =>
      resetPublicStatus(
        (
          await client.query<ResetStatusRow>(
            'SELECT s.active,s.operation_id,o.phase,o.failure AS failure_code FROM system_reset_state s LEFT JOIN system_reset_operations o ON o.id=s.operation_id WHERE s.id=1',
          )
        ).rows[0],
      ),
    );
  }
  async capability(actorId: string) {
    return this.database.withConnection(async (client) => {
      const actor = await this.actor(client, actorId);
      const state = (
        await client.query<ResetStateRow>(
          'SELECT s.active,s.operation_id,o.phase FROM system_reset_state s LEFT JOIN system_reset_operations o ON o.id=s.operation_id WHERE s.id=1',
        )
      ).rows[0];
      const blockers = this.configurationBlockers();
      if (!state || state.active)
        blockers.push({
          code: 'MAINTENANCE_ACTIVE',
          message:
            'A reset is already running or maintenance state is unavailable.',
        });
      if (!blockers.length) {
        try {
          this.assertTopology(await this.participants(client));
        } catch {
          blockers.push({
            code: 'PARTICIPANTS_UNAVAILABLE',
            message:
              'The configured backend/AI reset participants are not ready. Verify replica ownership and health.',
          });
        }
        try {
          await inspectResetDatabase(client);
        } catch {
          blockers.push({
            code: 'DATABASE_SCOPE_UNVERIFIED',
            message:
              'Database tables, dependencies or write barriers require review before reset.',
          });
        }
        try {
          await this.assets.inspect();
        } catch {
          blockers.push({
            code: 'STORAGE_SCOPE_UNVERIFIED',
            message:
              'Owned upload storage cannot be safely inventoried. Verify storage ownership and access.',
          });
        }
        try {
          await this.queues.inspect();
        } catch {
          blockers.push({
            code: 'QUEUES_SCOPE_UNVERIFIED',
            message:
              'Owned Redis queues cannot be safely inventoried. Verify Redis ownership and access.',
          });
        }
      }
      return {
        available: blockers.length === 0,
        environment: this.environment() || 'Not configured',
        blockers,
        active: !!state?.active,
        operationId: state?.operation_id ?? null,
        phase: state?.phase ?? null,
        retainedAdmin: this.publicActor(actor),
        acknowledgements: RESET_ACKNOWLEDGEMENTS.map((code, index) => ({
          code,
          label: ACK_LABELS[index],
        })),
      };
    });
  }
  async policy(schoolYear: string) {
    return this.database.withConnection(async (client) => ({
      policy: await readResetTargetPolicy(client, schoolYear),
    }));
  }
  private assertConfigured() {
    const blockers = this.configurationBlockers();
    if (blockers.length)
      throw new ConflictException(
        blockers.map((entry) => entry.message).join(' '),
      );
  }
  async preview(input: ResetPreviewDto, actorId: string) {
    this.assertConfigured();
    return this.database.withConnection(async (client) => {
      const actor = await this.actor(client, actorId);
      const state = (
        await client.query<ResetStateRow>(
          'SELECT active,epoch FROM system_reset_state WHERE id=1',
        )
      ).rows[0];
      if (!state || state.active)
        throw new ConflictException('Maintenance is already active.');
      const participants = await this.participants(client);
      this.assertTopology(participants);
      const inventory = await inspectResetDatabase(client);
      const policy = await readResetTargetPolicy(
        client,
        input.schoolYear,
        input.period,
      );
      const external = {
        assets: await this.assets.inspect(),
        queues: await this.queues.inspect(),
        participants: participants.map(({ id, kind }) => ({ id, kind })),
      };
      const preview = buildResetPreview(
        {
          actor: this.publicActor(actor),
          environment: this.environment(),
          schoolYear: input.schoolYear,
          period: input.period,
          policy,
          schemaHash: inventory.schemaHash,
          counts: inventory.counts,
          epoch: state.epoch,
          external,
        },
        this.secret(),
      );
      return {
        ...preview,
        tables: Object.entries(inventory.counts).map(([name, count]) => ({
          name,
          ...RESET_CATALOG[name],
          count,
        })),
      };
    });
  }
  private accepted(operation: Pick<Operation, 'id' | 'phase' | 'created_at'>) {
    return {
      operationId: operation.id,
      phase: operation.phase,
      status: 'running' as const,
      acceptedAt: new Date(operation.created_at).toISOString(),
    };
  }
  async execute(input: ResetExecuteDto, actorId: string) {
    const hash = hashResetRequest(input);
    return this.database.withConnection(async (client) => {
      // A replay cannot accidentally create a second operation when a response
      // was lost, even if its original preview expired or availability changed.
      const existing = (
        await client.query<Operation>(
          'SELECT * FROM system_reset_operations WHERE idempotency_key=$1',
          [input.idempotencyKey],
        )
      ).rows[0];
      if (resetRetryMatches(existing, actorId, hash))
        return this.accepted(existing);
      this.assertConfigured();
      const preview = verifyResetPreview(
        input.previewToken,
        this.secret(),
        actorId,
        this.environment(),
      );
      assertResetConfirmation(preview, input);
      const actor = await this.actor(client, actorId);
      if (!(await comparePassword(input.currentPassword, actor.password)))
        throw new UnauthorizedException(
          'The current administrator password is incorrect.',
        );
      const external = await this.assets.inspect();
      if (!isDeepStrictEqual(external, preview.external.assets))
        throw new ConflictException(
          'Uploaded files changed after preview. Generate a fresh preview.',
        );
      const queueStates = await this.queues.capturePauseStates();
      await client.query('BEGIN');
      try {
        await client.query('SELECT pg_advisory_xact_lock($1)', [
          RESET_COORDINATOR_LOCK,
        ]);
        const raced = (
          await client.query<Operation>(
            'SELECT * FROM system_reset_operations WHERE idempotency_key=$1',
            [input.idempotencyKey],
          )
        ).rows[0];
        if (resetRetryMatches(raced, actorId, hash)) {
          await client.query('COMMIT');
          return this.accepted(raced);
        }
        await client.query('SELECT pg_advisory_xact_lock($1)', [
          RESET_WRITE_LOCK,
        ]);
        const state = (
          await client.query<ResetStateRow>(
            'SELECT * FROM system_reset_state WHERE id=1 FOR UPDATE',
          )
        ).rows[0];
        if (!state || state.active || state.epoch !== preview.epoch)
          throw new ConflictException('Reset state changed after preview.');
        // Revalidate identity/password after obtaining the write barrier.
        const currentActor = await this.actor(client, actorId);
        if (currentActor.password !== actor.password)
          throw new ConflictException(
            'Administrator credentials changed after confirmation.',
          );
        const inventory = await inspectResetDatabase(client);
        if (
          inventory.schemaHash !== preview.schemaHash ||
          !isDeepStrictEqual(
            resetContentCounts(inventory.counts),
            resetContentCounts(preview.counts),
          )
        )
          throw new ConflictException(
            'School data or schema changed after preview.',
          );
        if (
          !isDeepStrictEqual(
            await readResetTargetPolicy(
              client,
              preview.schoolYear,
              preview.period,
            ),
            preview.policy,
          )
        )
          throw new ConflictException(
            'School-year policy changed after preview.',
          );
        const participants = await this.participants(client);
        this.assertTopology(participants);
        const { previewToken: _token, ...manifest } = preview;
        const checkpoint = {
          epoch: state.epoch + 1,
          queueStates,
          requiredParticipants: participants.map((row) => row.id),
          storageGeneration: state.storage_generation,
        };
        const operation = (
          await client.query<Operation>(
            `INSERT INTO system_reset_operations(id,idempotency_key,actor_id,actor_email,environment,school_year,period,reason,request_hash,manifest,checkpoint) VALUES($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [
              input.idempotencyKey,
              actorId,
              actor.email,
              preview.environment,
              preview.schoolYear,
              preview.period,
              input.reason.trim(),
              hash,
              manifest,
              checkpoint,
            ],
          )
        ).rows[0];
        await client.query(
          'UPDATE system_reset_state SET active=true,operation_id=$1,epoch=epoch+1,updated_at=now() WHERE id=1',
          [operation.id],
        );
        await client.query('COMMIT');
        this.nextRun = 0;
        return this.accepted(operation);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }
  async operation(id: string, actorId: string) {
    return this.database.withConnection(async (client) => {
      const operation = (
        await client.query<Operation>(
          'SELECT * FROM system_reset_operations WHERE id=$1 AND actor_id=$2',
          [id, actorId],
        )
      ).rows[0];
      if (!operation) throw new NotFoundException('Reset operation not found.');
      return {
        operationId: operation.id,
        phase: operation.phase,
        status:
          operation.phase === 'complete'
            ? 'completed'
            : operation.phase === 'aborted'
              ? 'aborted'
              : 'running',
        createdAt: operation.created_at,
        updatedAt: operation.updated_at,
        completedAt: operation.completed_at,
        failureCode: operation.failure,
        retrying:
          !!operation.failure &&
          !['complete', 'aborted'].includes(operation.phase),
        schoolYear: operation.school_year,
        period: operation.period,
      };
    });
  }
  private async phase(
    client: PoolClient,
    id: string,
    phase: string,
    checkpoint: Record<string, unknown> = {},
  ) {
    await client.query(
      'UPDATE system_reset_operations SET phase=$2,checkpoint=checkpoint || $3::jsonb,failure=NULL,updated_at=now() WHERE id=$1',
      [id, phase, JSON.stringify(checkpoint)],
    );
  }
  private async acknowledgements(client: PoolClient, operation: Operation) {
    const participants = await this.participants(
      client,
      operation.checkpoint.requiredParticipants,
    );
    assertResetParticipants(
      operation.checkpoint.requiredParticipants,
      participants,
      operation.checkpoint.epoch,
    );
    if (participants.some((row) => row.in_flight !== 0))
      throw new ServiceUnavailableException(
        'Waiting for unfinished reset participants.',
      );
  }
  private async retireHardLostParticipants(
    client: PoolClient,
    operation: Operation,
  ) {
    // The caller already owns RESET_IO_LOCK exclusively. Therefore an expired
    // idle participant cannot still have admitted physical work. Never infer
    // process death for a durable busy marker: a DB partition can drop its
    // advisory lease while an upload or external AI call continues.
    const updated = (
      await client.query<{ checkpoint: Operation['checkpoint'] }>(
        `WITH retired AS (
           UPDATE system_reset_instances
           SET retired=true
           WHERE id=ANY($1::text[]) AND retired=false
             AND in_flight=0
             AND heartbeat_at<=now()-interval '30 seconds'
           RETURNING id
         ), ids AS (
           SELECT jsonb_array_elements_text(
             COALESCE((SELECT checkpoint->'hardRetiredParticipants'
                       FROM system_reset_operations WHERE id=$2),'[]'::jsonb)
           ) AS id
           UNION
           SELECT id FROM retired
         )
         UPDATE system_reset_operations
         SET checkpoint=jsonb_set(
               checkpoint,
               '{hardRetiredParticipants}',
               COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM ids),'[]'::jsonb),
               true
             ),
             updated_at=now()
         WHERE id=$2 AND EXISTS(SELECT 1 FROM retired)
         RETURNING checkpoint`,
        [operation.checkpoint.requiredParticipants, operation.id],
      )
    ).rows[0];
    if (updated) operation.checkpoint = updated.checkpoint;
  }
  private assertAssetTargets(expected: unknown, current: unknown) {
    const targets = (value: unknown) => {
      if (!value || typeof value !== 'object') return [];
      const inventory = value as { primary?: unknown; local?: unknown };
      const local = Array.isArray(inventory.local)
        ? (inventory.local as unknown[])
        : [];
      const items: unknown[] = [inventory.primary, ...local];
      return items.map((item) => {
        const entry =
          item && typeof item === 'object'
            ? (item as Record<string, unknown>)
            : {};
        return {
          driver: entry.driver,
          targetHash: entry.targetHash,
          ownershipHash: entry.ownershipHash,
        };
      });
    };
    if (!isDeepStrictEqual(targets(expected), targets(current)))
      throw new ConflictException(
        'Reset storage configuration changed; recovery requires its original owned targets.',
      );
  }
  private async restore(client: PoolClient, operation: Operation) {
    if (operation.checkpoint.cleanupGeneration !== undefined) {
      await this.queues.closeCleanup({
        epoch: operation.checkpoint.epoch,
        generation: operation.checkpoint.cleanupGeneration,
      });
    }
    await this.queues.restore(operation.checkpoint.queueStates);
    await client.query('BEGIN');
    try {
      await client.query('SELECT pg_advisory_xact_lock($1)', [
        RESET_WRITE_LOCK,
      ]);
      const outcome = operation.checkpoint.databaseCommitted
        ? 'complete'
        : 'aborted';
      await client.query(
        'UPDATE system_reset_operations SET phase=$2,completed_at=now(),updated_at=now() WHERE id=$1',
        [operation.id, outcome],
      );
      const result = await client.query(
        'UPDATE system_reset_state SET active=false,updated_at=now() WHERE id=1 AND active=true AND operation_id=$1',
        [operation.id],
      );
      if (result.rowCount !== 1)
        throw new ConflictException('Reset maintenance ownership changed.');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  /** Durable, restart-safe phase runner. It never relies on the queues it clears. */
  async tick() {
    if (this.busy || this.stopping || Date.now() < this.nextRun) return;
    const activeTick = this.runTick();
    this.activeTick = activeTick;
    try {
      await activeTick;
    } finally {
      if (this.activeTick === activeTick) this.activeTick = undefined;
    }
  }

  private async runTick() {
    this.busy = true;
    try {
      await this.database.withConnection(async (client) => {
        let coordinatorLocked = false,
          ioLocked = false,
          damaged = false;
        let operation: Operation | undefined;
        const onError = () => {
          damaged = true;
        };
        const assertOwned = async () => {
          if (damaged || !operation || !coordinatorLocked)
            throw new ServiceUnavailableException(
              'Reset coordinator ownership was lost.',
            );
          const state = (
            await client.query<ResetStateRow>(
              'SELECT active,operation_id,epoch FROM system_reset_state WHERE id=1',
            )
          ).rows[0];
          if (
            damaged ||
            !state?.active ||
            state.operation_id !== operation.id ||
            state.epoch !== operation.checkpoint.epoch
          )
            throw new ServiceUnavailableException(
              'Reset coordinator ownership was lost.',
            );
        };
        const owned = async <T>(work: () => Promise<T>): Promise<T> => {
          await assertOwned();
          const result = await runResetCleanupContext(assertOwned, work);
          await assertOwned();
          return result;
        };
        client.on('error', onError);
        try {
          coordinatorLocked = (
            await client.query<AdvisoryLockRow>(
              'SELECT pg_try_advisory_lock($1) AS acquired',
              [RESET_COORDINATOR_LOCK],
            )
          ).rows[0].acquired;
          if (!coordinatorLocked) return;
          operation = (
            await client.query<Operation>(
              'SELECT o.* FROM system_reset_state s JOIN system_reset_operations o ON o.id=s.operation_id WHERE s.id=1 AND s.active=true',
            )
          ).rows[0];
          if (!operation) return;
          if (operation.phase === 'restoring') {
            await assertOwned();
            await runResetCleanupContext(assertOwned, () =>
              this.restore(client, operation!),
            );
            return;
          }
          await this.queues.pause();
          if (operation.phase === 'draining') {
            const timeout =
              Date.now() - new Date(operation.created_at).getTime() > 300000;
            try {
              if (!(await this.queues.drained()))
                throw new ServiceUnavailableException('Workers still active.');
              ioLocked = (
                await client.query<AdvisoryLockRow>(
                  'SELECT pg_try_advisory_lock($1) AS acquired',
                  [RESET_IO_LOCK],
                )
              ).rows[0].acquired;
              if (!ioLocked)
                throw new ServiceUnavailableException(
                  'External work is still active.',
                );
              await this.retireHardLostParticipants(client, operation);
              await this.acknowledgements(client, operation);
            } catch (error) {
              if (!timeout) return;
              throw error;
            }
            const inventory = await inspectResetDatabase(client);
            if (
              !isDeepStrictEqual(
                resetContentCounts(inventory.counts),
                resetContentCounts(operation.manifest.counts),
              )
            )
              throw new ConflictException(
                'School data changed while draining.',
              );
            if (
              !isDeepStrictEqual(
                await owned(() => this.assets.inspect()),
                operation.manifest.external.assets,
              )
            )
              throw new ConflictException('Files changed while draining.');
            await applyResetDatabase(client, {
              operationId: operation.id,
              actorId: operation.actor_id,
              schoolYear: operation.school_year,
              period: operation.period,
              policy: operation.manifest.policy,
              expectedSchemaHash: operation.manifest.schemaHash,
            });
            operation = (
              await client.query<Operation>(
                'SELECT * FROM system_reset_operations WHERE id=$1',
                [operation.id],
              )
            ).rows[0];
          }
          if (!operation.checkpoint.databaseCommitted)
            throw new ConflictException('Unrecognized reset phase.');
          if (!ioLocked)
            ioLocked = (
              await client.query<AdvisoryLockRow>(
                'SELECT pg_try_advisory_lock($1) AS acquired',
                [RESET_IO_LOCK],
              )
            ).rows[0].acquired;
          if (!ioLocked)
            throw new ServiceUnavailableException(
              'Waiting for external cleanup ownership.',
            );
          await this.retireHardLostParticipants(client, operation);
          await this.acknowledgements(client, operation);
          operation = (
            await client.query<Operation>(
              "UPDATE system_reset_operations SET checkpoint=jsonb_set(checkpoint,'{cleanupGeneration}',to_jsonb(COALESCE((checkpoint->>'cleanupGeneration')::int,0)+1)),updated_at=now() WHERE id=$1 RETURNING *",
              [operation.id],
            )
          ).rows[0];
          const cleanupLease = {
            epoch: operation.checkpoint.epoch,
            generation: operation.checkpoint.cleanupGeneration!,
          };
          await owned(() => this.queues.openCleanup(cleanupLease));
          this.assertAssetTargets(
            operation.manifest.external.assets,
            await owned(() => this.assets.inspect()),
          );
          await owned(() =>
            this.assets.purge(operation!.checkpoint.storageGeneration),
          );
          await owned(() => this.queues.purge(cleanupLease));
          await this.phase(client, operation.id, 'verifying');
          const verified = await verifyResetDatabase(
            client,
            operation.actor_id,
            operation.school_year,
            operation.period,
          );
          if (verified.schemaHash !== operation.manifest.schemaHash)
            throw new ConflictException(
              'Schema changed during reset verification.',
            );
          await owned(() => this.assets.verify());
          await owned(() => this.queues.verify());
          await this.acknowledgements(client, operation);
          if (damaged)
            throw new ServiceUnavailableException(
              'Reset coordinator connection was lost.',
            );
          await this.phase(client, operation.id, 'restoring', {
            outcome: 'complete',
          });
          await assertOwned();
          await runResetCleanupContext(assertOwned, () =>
            this.restore(client, operation!),
          );
        } catch {
          // Re-read the durable commit checkpoint; a lost COMMIT response must
          // never be interpreted as a pre-commit abort.
          if (operation && !damaged) {
            const current = (
              await client.query<Operation>(
                'SELECT * FROM system_reset_operations WHERE id=$1',
                [operation.id],
              )
            ).rows[0];
            const phase =
              current.phase === 'restoring'
                ? 'restoring'
                : current.checkpoint.databaseCommitted
                  ? 'cleanup'
                  : 'restoring';
            const failure = current.checkpoint.databaseCommitted
              ? 'CLEANUP_PENDING'
              : 'RESET_ABORTED_BEFORE_COMMIT';
            await client.query(
              'UPDATE system_reset_operations SET phase=$2,failure=$3,attempts=attempts+1,updated_at=now() WHERE id=$1',
              [operation.id, phase, failure],
            );
            this.nextRun =
              Date.now() + Math.min(30000, 2000 * (current.attempts + 1));
            this.logger.warn(
              `Reset ${operation.id}: ${failure}; recovery remains active.`,
            );
          }
        } finally {
          if (!damaged) {
            if (ioLocked)
              await client.query('SELECT pg_advisory_unlock($1)', [
                RESET_IO_LOCK,
              ]);
            if (coordinatorLocked)
              await client.query('SELECT pg_advisory_unlock($1)', [
                RESET_COORDINATOR_LOCK,
              ]);
          }
          client.removeListener('error', onError);
        }
      });
    } catch {
      this.nextRun = Date.now() + 10000;
      this.logger.warn(
        'Reset recovery could not reach its durable coordinator; retrying.',
      );
    } finally {
      this.busy = false;
    }
  }
}
