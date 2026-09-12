import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { PoolClient } from 'pg';
import type {
  AcademicPolicy,
  PeriodKey,
} from '../academic-state/academic-policy';
import { getDefaultAcademicPolicy } from '../academic-state/academic-policy';
import {
  assertResetCatalog,
  RESET_CATALOG,
  RESET_WRITE_LOCK,
  resetTargetPolicy,
} from './system-reset.catalog';

type ForeignKey = {
  table: string;
  target: string;
  columns: string[];
  nullable: boolean;
  definition: string;
};
type ResetStateRow = {
  active: boolean;
  operation_id: string | null;
  storage_generation: string;
};
type ColumnInventoryRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
};
type GradeBandRow = {
  bands: Array<{ minInitialGrade: number; transmutedGrade: number }>;
};
const CONTROL_TABLES = new Set([
  'system_reset_state',
  'system_reset_operations',
  'system_reset_instances',
]);
const DETACH_COLUMNS: Record<string, readonly string[]> = {
  audit_logs: ['actor_id'],
  admin_lifecycle_operations: ['actor_id'],
  enrollment_lifecycle_events: [
    'enrollment_id',
    'student_id',
    'class_id',
    'section_id',
    'destination_class_id',
    'destination_section_id',
    'actor_id',
  ],
  transmutation_tables: ['updated_by'],
};

export function resetIdentifier(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name))
    throw new ConflictException('Invalid reset catalog identifier');
  return `"${name}"`;
}

export function resetDeleteOrder(
  tables: string[],
  keys: Array<{ table: string; target: string }>,
): string[] {
  const remaining = new Set(tables);
  const order: string[] = [];
  while (remaining.size) {
    const ready = [...remaining]
      .filter(
        (table) =>
          !keys.some(
            (key) =>
              key.table !== table &&
              key.target === table &&
              remaining.has(key.table),
          ),
      )
      .sort();
    if (!ready.length)
      throw new ConflictException('Reset dependency cycle requires review.');
    for (const table of ready) {
      remaining.delete(table);
      order.push(table);
    }
  }
  return order;
}

/** Preview is read-only: unlike forYear(), it must not initialize a policy. */
export async function readResetTargetPolicy(
  client: PoolClient,
  schoolYear: string,
  period?: PeriodKey,
): Promise<AcademicPolicy> {
  let defaults: AcademicPolicy;
  try {
    defaults = getDefaultAcademicPolicy(schoolYear);
  } catch {
    throw new ConflictException('Choose a consecutive school year.');
  }
  const existing = (
    await client.query<{ policy: AcademicPolicy }>(
      'SELECT policy FROM academic_year_policies WHERE school_year=$1',
      [schoolYear],
    )
  ).rows[0]?.policy;
  const bands =
    !existing && defaults.gradeMethod === 'legacy_transmutation'
      ? (
          await client.query<GradeBandRow>(
            'SELECT bands FROM transmutation_tables WHERE is_active=true ORDER BY updated_at DESC LIMIT 1',
          )
        ).rows[0]?.bands?.map(
          (band: { minInitialGrade: number; transmutedGrade: number }) => ({
            minInitialGrade: band.minInitialGrade,
            transmutedGrade: band.transmutedGrade,
          }),
        )
      : undefined;
  return resetTargetPolicy(
    schoolYear,
    period ?? existing?.periods?.[0]?.key ?? defaults.periods[0].key,
    existing,
    bands,
  );
}

export async function inspectResetDatabase(client: PoolClient) {
  const materializedViews = (
    await client.query<{ name: string; definition: string }>(
      `SELECT c.relname AS name,pg_get_viewdef(c.oid,true) AS definition FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='m' ORDER BY c.relname`,
    )
  ).rows;
  if (materializedViews.length)
    throw new ConflictException(
      `Public materialized views require explicit reset classification: ${materializedViews
        .map((view) => view.name)
        .join(', ')}`,
    );
  const tables = (
    await client.query<{ name: string }>(
      `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','f') ORDER BY c.relname`,
    )
  ).rows.map((row) => row.name);
  assertResetCatalog(tables);
  const outsideReferences = (
    await client.query<{
      source: string;
      target: string;
    }>(`SELECT ns.nspname || '.' || src.relname AS source, nt.nspname || '.' || dest.relname AS target
    FROM pg_constraint con JOIN pg_class src ON src.oid=con.conrelid JOIN pg_namespace ns ON ns.oid=src.relnamespace
    JOIN pg_class dest ON dest.oid=con.confrelid JOIN pg_namespace nt ON nt.oid=dest.relnamespace
    WHERE con.contype='f' AND ns.nspname<>nt.nspname AND (ns.nspname='public' OR nt.nspname='public')`)
  ).rows;
  if (outsideReferences.length)
    throw new ConflictException(
      'Unreviewed cross-schema reference blocks reset.',
    );
  const barriers = (
    await client.query<{ table: string; definition: string }>(
      `SELECT c.relname AS "table", pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND t.tgname='nexora_reset_write_barrier' AND t.tgenabled='O' ORDER BY c.relname`,
    )
  ).rows;
  const uncovered = tables.filter(
    (name) =>
      name !== '_applied_migrations' &&
      !CONTROL_TABLES.has(name) &&
      !barriers.some(
        (barrier) =>
          barrier.table === name &&
          barrier.definition.includes(
            'BEFORE INSERT OR DELETE OR UPDATE OR TRUNCATE',
          ) &&
          barrier.definition.includes(
            'FOR EACH STATEMENT EXECUTE FUNCTION nexora_reset_write_barrier()',
          ),
      ),
  );
  if (uncovered.length)
    throw new ConflictException(
      `Reset write barrier is missing or changed: ${uncovered.join(', ')}`,
    );
  const keys = (
    await client.query<ForeignKey>(`SELECT src.relname AS "table", dest.relname AS target,
    array_agg(a.attname::text ORDER BY u.ord) AS columns, bool_and(NOT a.attnotnull) AS nullable, pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con JOIN pg_class src ON src.oid=con.conrelid JOIN pg_namespace n ON n.oid=src.relnamespace JOIN pg_class dest ON dest.oid=con.confrelid
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY u(attnum,ord) JOIN pg_attribute a ON a.attrelid=src.oid AND a.attnum=u.attnum
    WHERE con.contype='f' AND n.nspname='public' GROUP BY con.oid,src.relname,dest.relname ORDER BY src.relname,con.oid`)
  ).rows;
  const deletions = tables.filter(
    (name) => RESET_CATALOG[name].action !== 'preserve',
  );
  const detaches = keys.filter(
    (key) =>
      RESET_CATALOG[key.table].action === 'preserve' &&
      deletions.includes(key.target),
  );
  for (const key of detaches) {
    if (
      !key.nullable ||
      key.columns.length !== 1 ||
      !DETACH_COLUMNS[key.table]?.includes(key.columns[0])
    )
      throw new ConflictException(
        `Unreviewed retained reference: ${key.table} → ${key.target}`,
      );
  }
  const columns = (
    await client.query<ColumnInventoryRow>(
      `SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`,
    )
  ).rows;
  const counts = Object.fromEntries(
    (
      await client.query<{ name: string; count: string }>(
        tables
          .map(
            (name) =>
              `SELECT '${name}' AS name, count(*)::text AS count FROM public.${resetIdentifier(name)}`,
          )
          .join(' UNION ALL '),
      )
    ).rows.map((row) => [row.name, Number(row.count)]),
  );
  const barrierFunction = (
    await client.query<{ definition: string }>(
      "SELECT pg_get_functiondef('public.nexora_reset_write_barrier()'::regprocedure) AS definition",
    )
  ).rows[0]?.definition;
  const schemaHash = createHash('sha256')
    .update(
      JSON.stringify({ tables, keys, columns, barriers, barrierFunction }),
    )
    .digest('hex');
  return {
    counts,
    schemaHash,
    deleteOrder: resetDeleteOrder(deletions, keys),
    detaches,
  };
}

/** Caller has already claimed durable maintenance and drained external writers. */
export async function applyResetDatabase(
  client: PoolClient,
  input: {
    operationId: string;
    actorId: string;
    schoolYear: string;
    period: PeriodKey;
    policy: AcademicPolicy;
    expectedSchemaHash: string;
  },
) {
  resetTargetPolicy(input.schoolYear, input.period, input.policy);
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock($1)', [RESET_WRITE_LOCK]);
    const state = (
      await client.query<ResetStateRow>(
        'SELECT * FROM system_reset_state WHERE id=1 FOR UPDATE',
      )
    ).rows[0];
    if (!state?.active || state.operation_id !== input.operationId)
      throw new ConflictException('Reset operation does not own maintenance.');
    const operation = (
      await client.query<{ phase: string }>(
        'SELECT phase FROM system_reset_operations WHERE id=$1 FOR UPDATE',
        [input.operationId],
      )
    ).rows[0];
    if (!operation || operation.phase !== 'draining')
      throw new ConflictException(
        'Database reset phase has already completed or is unavailable.',
      );
    const inventory = await inspectResetDatabase(client);
    if (inventory.schemaHash !== input.expectedSchemaHash)
      throw new ConflictException('Database schema changed after preview.');
    const targetPolicy = await readResetTargetPolicy(
      client,
      input.schoolYear,
      input.period,
    );
    if (!isDeepStrictEqual(targetPolicy, input.policy))
      throw new ConflictException('School-year policy changed after preview.');
    const actor = (
      await client.query<{ id: string }>(
        `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      WHERE u.id=$1 AND u.account_status='ACTIVE' AND u.is_email_verified=true AND r.name='admin' FOR UPDATE OF u`,
        [input.actorId],
      )
    ).rows[0];
    if (!actor)
      throw new ConflictException(
        'The retained account must still be an active, verified administrator.',
      );
    const nextVersion = Number(
      (
        await client.query<{ version: string | number }>(
          'SELECT COALESCE(MAX(version),0)+1 AS version FROM academic_system_states',
        )
      ).rows[0].version,
    );
    await client.query("SELECT set_config('nexora.system_reset', $1, true)", [
      input.operationId,
    ]);

    // Restrictive evidence is copied verbatim, including original entity IDs.
    await client.query(
      `INSERT INTO system_reset_evidence (operation_id,source_table,source_id,snapshot)
      SELECT $1,'academic_legacy_grade_evidence',id,to_jsonb(e) FROM academic_legacy_grade_evidence e`,
      [input.operationId],
    );
    // Retain exact historical references in a receipt before nullable live FKs
    // are detached. This does not change any ordinary deletion policy.
    for (const table of [
      ...new Set(inventory.detaches.map((key) => key.table)),
    ]) {
      const keys = inventory.detaches.filter((key) => key.table === table);
      const condition = keys
        .map(
          (key) =>
            `${resetIdentifier(key.columns[0])} IS NOT NULL${key.target === 'users' ? ` AND ${resetIdentifier(key.columns[0])} <> $2` : ''}`,
        )
        .map((clause) => `(${clause})`)
        .join(' OR ');
      const params = keys.some((key) => key.target === 'users')
        ? [input.operationId, input.actorId]
        : [input.operationId];
      await client.query(
        `INSERT INTO system_reset_evidence (operation_id,source_table,source_id,snapshot) SELECT $1,'${table}',id,to_jsonb(e) FROM ${resetIdentifier(table)} e WHERE ${condition}`,
        params,
      );
      for (const key of keys) {
        const column = resetIdentifier(key.columns[0]);
        await client.query(
          `UPDATE ${resetIdentifier(table)} SET ${column}=NULL WHERE ${column} IS NOT NULL${key.target === 'users' ? ` AND ${column} <> $1` : ''}`,
          key.target === 'users' ? [input.actorId] : [],
        );
      }
    }
    for (const table of inventory.deleteOrder) {
      if (table === 'users')
        await client.query('DELETE FROM users WHERE id<>$1', [input.actorId]);
      else await client.query(`DELETE FROM public.${resetIdentifier(table)}`);
    }
    await client.query(
      'UPDATE users SET session_version=session_version+1,last_login_at=NULL,updated_at=now() WHERE id=$1',
      [input.actorId],
    );
    await client.query(
      "INSERT INTO user_roles (user_id,role_id,assigned_by) SELECT $1,id,'SYSTEM_RESET' FROM roles WHERE name='admin'",
      [input.actorId],
    );
    await client.query(
      'INSERT INTO academic_year_policies (school_year,policy_id,policy) VALUES ($1,$2,$3) ON CONFLICT (school_year) DO NOTHING',
      [input.schoolYear, input.policy.id, input.policy],
    );
    await client.query(
      `INSERT INTO academic_system_states (id,school_year,quarter,version,updated_by) VALUES ('00000000-0000-0000-0000-000000000001',$1,$2,$3,$4)`,
      [input.schoolYear, input.period, nextVersion, input.actorId],
    );
    await client.query(
      `INSERT INTO audit_logs (actor_id,action,target_type,target_id,metadata) VALUES ($1,'SYSTEM_RESET_DATABASE_COMMITTED','system_reset',$2,$3)`,
      [
        input.actorId,
        input.operationId,
        {
          schoolYear: input.schoolYear,
          period: input.period,
          counts: inventory.counts,
        },
      ],
    );
    const storageGeneration = `g-${input.operationId}`;
    const generationUpdate = await client.query(
      'UPDATE system_reset_state SET storage_generation=$2,updated_at=now() WHERE id=1 AND active=true AND operation_id=$1',
      [input.operationId, storageGeneration],
    );
    if (generationUpdate.rowCount !== 1) {
      throw new Error('System reset storage generation ownership was lost');
    }
    await client.query(
      "UPDATE system_reset_operations SET phase='cleanup',checkpoint=checkpoint || $2::jsonb,updated_at=now() WHERE id=$1",
      [
        input.operationId,
        JSON.stringify({
          databaseCommitted: true,
          academicVersion: nextVersion,
          retiredStorageGeneration: state.storage_generation,
          storageGeneration,
        }),
      ],
    );
    await client.query('COMMIT');
    return { nextVersion };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function verifyResetDatabase(
  client: PoolClient,
  actorId: string,
  schoolYear: string,
  period: PeriodKey,
) {
  const inventory = await inspectResetDatabase(client);
  const remaining = Object.entries(inventory.counts).filter(
    ([table, count]) =>
      ['clear', 'archive'].includes(RESET_CATALOG[table].action) && count !== 0,
  );
  if (
    remaining.length ||
    inventory.counts.users !== 1 ||
    inventory.counts.user_roles !== 1 ||
    inventory.counts.academic_system_states !== 1
  )
    throw new ConflictException(
      'Reset verification found residual school data.',
    );
  const actor = (
    await client.query<{ id: string }>(
      "SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=$1 AND r.name='admin' AND u.account_status='ACTIVE' AND u.is_email_verified=true",
      [actorId],
    )
  ).rows[0];
  const calendar = (
    await client.query<{ school_year: string; quarter: PeriodKey }>(
      'SELECT school_year,quarter FROM academic_system_states',
    )
  ).rows[0];
  if (
    !actor ||
    calendar.school_year !== schoolYear ||
    calendar.quarter !== period
  )
    throw new ConflictException(
      'Reset account or calendar verification failed.',
    );
  return inventory;
}
