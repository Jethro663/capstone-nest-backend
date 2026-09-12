import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  applyResetDatabase,
  inspectResetDatabase,
  readResetTargetPolicy,
  verifyResetDatabase,
} from '../src/modules/system-reset/system-reset.database';
import { getDefaultAcademicPolicy } from '../src/modules/academic-state/academic-policy';
import { withResetIoFence } from '../src/modules/system-reset/system-reset.fence';

const url = process.env.RESET_TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'RESET_TEST_DATABASE_URL must point to a disposable local database.',
  );
const target = new URL(url);
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
  !/^\/nexora_reset_test_[a-z0-9_]+$/.test(target.pathname)
) {
  throw new Error(
    'Refusing reset fixtures outside a local nexora_reset_test_* database.',
  );
}
const pool = new Pool({
  connectionString: url,
  max: 5,
  statement_timeout: 5000,
});
const WRITE_LOCK = 78766903;
const resetId = randomUUID();

async function beginMaintenance(client: PoolClient) {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock($1)', [WRITE_LOCK]);
  await client.query(
    'UPDATE system_reset_state SET active=true, operation_id=$1, epoch=epoch+1 WHERE id=1',
    [resetId],
  );
  await client.query('COMMIT');
}

describe('system reset real PostgreSQL write barrier', () => {
  beforeAll(async () => {
    await pool.query(
      "UPDATE system_reset_state SET active=false,operation_id=null,storage_generation='legacy' WHERE id=1",
    );
    // Only fixtures in the positively identified disposable database above.
    await pool.query(
      'TRUNCATE users,roles,academic_system_states,academic_year_policies,app_versions,system_reset_evidence,system_reset_operations RESTART IDENTITY CASCADE',
    );
  });
  beforeEach(async () => {
    await pool.query(
      "UPDATE system_reset_state SET active=false,operation_id=null,storage_generation='legacy' WHERE id=1",
    );
    await pool.query('DELETE FROM roles');
  });
  afterAll(async () => {
    await pool.query('UPDATE system_reset_state SET active=false WHERE id=1');
    await pool.end();
  });

  it('has enabled statement barriers on every domain table', async () => {
    const { rows } =
      await pool.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname <> '_applied_migrations'
      AND c.relname NOT IN ('system_reset_state','system_reset_operations','system_reset_instances')
      AND NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND t.tgname='nexora_reset_write_barrier' AND t.tgenabled='O')`);
    expect(rows).toEqual([]);
  });

  it('blocks an incoming foreign key from an unowned schema before deleting anything', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userId = randomUUID();
      await client.query(
        "INSERT INTO users(id,email,password,first_name,last_name) VALUES($1,'external-fixture@example.test','fixture','External','Fixture')",
        [userId],
      );
      await client.query('CREATE SCHEMA reset_foreign_fixture');
      await client.query(
        'CREATE TABLE reset_foreign_fixture.saved_rows(user_id uuid REFERENCES public.users(id) ON DELETE CASCADE)',
      );
      await client.query(
        'INSERT INTO reset_foreign_fixture.saved_rows VALUES($1)',
        [userId],
      );
      await expect(inspectResetDatabase(client)).rejects.toThrow(
        'Unreviewed cross-schema reference',
      );
      expect(
        (
          await client.query(
            'SELECT count(*)::int AS count FROM reset_foreign_fixture.saved_rows',
          )
        ).rows[0].count,
      ).toBe(1);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('fails closed when a public materialized view could retain school data', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("INSERT INTO roles(name) VALUES('matview-fixture')");
      await client.query(
        'CREATE MATERIALIZED VIEW reset_retained_fixture AS SELECT id,name FROM roles',
      );
      await expect(inspectResetDatabase(client)).rejects.toThrow(
        'materialized views require explicit reset classification',
      );
      expect(
        (
          await client.query(
            'SELECT count(*)::int AS count FROM reset_retained_fixture',
          )
        ).rows[0].count,
      ).toBe(1);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('allows normal writes, then denies INSERT, UPDATE, DELETE and TRUNCATE during maintenance', async () => {
    await pool.query("INSERT INTO roles (name) VALUES ('admin')");
    const client = await pool.connect();
    try {
      await beginMaintenance(client);
    } finally {
      client.release();
    }
    for (const statement of [
      "INSERT INTO roles (name) VALUES ('teacher')",
      "UPDATE roles SET name='teacher'",
      'DELETE FROM roles',
      'TRUNCATE roles',
    ]) {
      // TRUNCATE also has FK checks, so test its barrier on the independent receipt table below.
      if (statement === 'TRUNCATE roles') continue;
      await expect(pool.query(statement)).rejects.toMatchObject({
        code: '55000',
      });
    }
    await expect(
      pool.query('TRUNCATE system_reset_evidence'),
    ).rejects.toMatchObject({ code: '55000' });
  });

  it('allows only the matching operation-scoped transaction bypass', async () => {
    const client = await pool.connect();
    try {
      await beginMaintenance(client);
      await client.query('BEGIN');
      await client.query("SELECT set_config('nexora.system_reset', $1, true)", [
        randomUUID(),
      ]);
      await expect(
        client.query("INSERT INTO roles (name) VALUES ('admin')"),
      ).rejects.toMatchObject({ code: '55000' });
      await client.query('ROLLBACK');
      await client.query('BEGIN');
      await client.query("SELECT set_config('nexora.system_reset', $1, true)", [
        resetId,
      ]);
      await client.query("INSERT INTO roles (name) VALUES ('admin')");
      await client.query('COMMIT');
      await expect(client.query('DELETE FROM roles')).rejects.toMatchObject({
        code: '55000',
      });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('waits for an existing writer before marking maintenance active', async () => {
    const writer = await pool.connect();
    const coordinator = await pool.connect();
    try {
      await writer.query('BEGIN');
      await writer.query("INSERT INTO roles (name) VALUES ('admin')");
      const started = beginMaintenance(coordinator);
      // Inspect PostgreSQL locks rather than assuming that a timer proves ordering.
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const result = await pool.query(
          "SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted AND objid=$1",
          [WRITE_LOCK],
        );
        if (result.rowCount) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      expect(
        (await pool.query('SELECT active FROM system_reset_state WHERE id=1'))
          .rows[0].active,
      ).toBe(false);
      await writer.query('COMMIT');
      await started;
      await expect(writer.query('DELETE FROM roles')).rejects.toMatchObject({
        code: '55000',
      });
    } finally {
      await writer.query('ROLLBACK');
      await coordinator.query('ROLLBACK');
      writer.release();
      coordinator.release();
    }
  });

  it('does not let a repeatable-read snapshot bypass the new maintenance state', async () => {
    const stale = await pool.connect();
    const coordinator = await pool.connect();
    try {
      await stale.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      expect(
        (await stale.query('SELECT active FROM system_reset_state WHERE id=1'))
          .rows[0].active,
      ).toBe(false);
      await beginMaintenance(coordinator);
      await expect(
        stale.query("INSERT INTO roles (name) VALUES ('admin')"),
      ).rejects.toMatchObject({ code: '40001' });
    } finally {
      await stale.query('ROLLBACK');
      stale.release();
      coordinator.release();
    }
  });

  it('rejects a stale AI request epoch even after maintenance has ended', async () => {
    const request = await pool.connect();
    const coordinator = await pool.connect();
    try {
      const epoch = (
        await request.query('SELECT epoch FROM system_reset_state WHERE id=1')
      ).rows[0].epoch;
      await request.query('BEGIN');
      await request.query("SELECT set_config('nexora.reset_epoch',$1,true)", [
        String(epoch),
      ]);
      await beginMaintenance(coordinator);
      await coordinator.query(
        'UPDATE system_reset_state SET active=false WHERE id=1',
      );
      await expect(
        request.query("INSERT INTO roles (name) VALUES ('admin')"),
      ).rejects.toMatchObject({ code: '55000' });
      await request.query('ROLLBACK');
      await request.query('BEGIN');
      await request.query("SELECT set_config('nexora.reset_epoch',$1,true)", [
        String(epoch + 1),
      ]);
      await request.query("INSERT INTO roles (name) VALUES ('admin')");
      await request.query('COMMIT');
    } finally {
      await request.query('ROLLBACK');
      request.release();
      coordinator.release();
    }
  });

  it('retains an I/O lease until an in-flight handler settles and rejects new work in maintenance', async () => {
    let finish!: () => void, entered!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const handler = withResetIoFence(pool, async () => {
      entered();
      await pending;
    });
    const coordinator = await pool.connect();
    try {
      await started;
      expect(
        (
          await coordinator.query(
            'SELECT pg_try_advisory_lock(78766904) AS acquired',
          )
        ).rows[0].acquired,
      ).toBe(false);
      await beginMaintenance(coordinator);
      const lateWork = jest.fn();
      await expect(withResetIoFence(pool, lateWork)).rejects.toThrow(
        'School data reset',
      );
      expect(lateWork).not.toHaveBeenCalled();
      finish();
      await handler;
      expect(
        (
          await coordinator.query(
            'SELECT pg_try_advisory_lock(78766904) AS acquired',
          )
        ).rows[0].acquired,
      ).toBe(true);
      await coordinator.query('SELECT pg_advisory_unlock(78766904)');
    } finally {
      finish();
      await handler;
      coordinator.release();
    }
  });

  it('resets real content and vectors while keeping credentials, configuration, receipts and exact legacy evidence', async () => {
    const client = await pool.connect();
    try {
      const admin = randomUUID(),
        student = randomUUID(),
        section = randomUUID(),
        cls = randomUUID(),
        record = randomUUID(),
        legacy = randomUUID(),
        file = randomUUID(),
        chunk = randomUUID();
      await client.query(
        "INSERT INTO roles (name) VALUES ('admin'),('teacher'),('student')",
      );
      await client.query(
        `INSERT INTO users (id,email,password,first_name,last_name,is_email_verified) VALUES ($1,'retained@example.invalid','same-password-hash','Retained','Admin',true),($2,'removed@example.invalid','other-hash','Test','Student',true)`,
        [admin, student],
      );
      await client.query(
        "INSERT INTO user_roles (user_id,role_id,assigned_by) SELECT $1,id,'TEST' FROM roles WHERE name IN ('admin','teacher')",
        [admin],
      );
      await client.query(
        "INSERT INTO user_roles (user_id,role_id,assigned_by) SELECT $1,id,'TEST' FROM roles WHERE name='student'",
        [student],
      );
      await client.query(
        "INSERT INTO sections (id,name,grade_level,school_year) VALUES ($1,'Disposable','7','2026-2027')",
        [section],
      );
      await client.query(
        "INSERT INTO classes (id,subject_name,subject_code,section_id,school_year) VALUES ($1,'Math','TEST-MATH',$2,'2026-2027')",
        [cls, section],
      );
      await client.query(
        "INSERT INTO class_records (id,class_id,teacher_id,grading_period) VALUES ($1,$2,$3,'Q1')",
        [record, cls, admin],
      );
      await client.query(
        "INSERT INTO academic_legacy_grade_evidence (id,source_final_grade_id,class_record_id,student_id,school_year,period,source_snapshot) VALUES ($1,$2,$3,$4,'2026-2027','Q1',$5)",
        [
          legacy,
          randomUUID(),
          record,
          student,
          { grade: 81, studentName: 'Original Student' },
        ],
      );
      const legacyBefore = (
        await client.query(
          'SELECT to_jsonb(e) AS snapshot FROM academic_legacy_grade_evidence e WHERE id=$1',
          [legacy],
        )
      ).rows[0].snapshot;
      await client.query(
        "INSERT INTO audit_logs (actor_id,action,target_type,target_id,metadata) VALUES ($1,'TEST_BEFORE_RESET','user',$1,$2)",
        [student, { proof: 'keep me' }],
      );
      await client.query(
        "INSERT INTO uploaded_files (id,teacher_id,original_name,stored_name,mime_type,size_bytes,file_path) VALUES ($1,$2,'source.txt','source.txt','text/plain',10,'uploads/source.txt')",
        [file, admin],
      );
      await client.query(
        "INSERT INTO content_chunks (id,source_type,source_id,library_file_id,chunk_text,chunk_order,token_count,content_hash) VALUES ($1,'library_file',$2,$2,'Remove this indexed text',0,5,'test-hash')",
        [chunk, file],
      );
      await client.query(
        "INSERT INTO content_chunk_embeddings (chunk_id,embedding,embedding_model) VALUES ($1,$2,'test-model')",
        [chunk, `[${Array(768).fill(0).join(',')}]`],
      );
      await client.query(
        "INSERT INTO refresh_tokens (user_id,token_hash,revoked,expires_at) VALUES ($1,'test-refresh-hash',false,now()+interval '1 day')",
        [admin],
      );
      await client.query(
        'INSERT INTO admin_demo_mode_states (id,enabled) VALUES ($1,true)',
        [randomUUID()],
      );
      const policy = {
        ...getDefaultAcademicPolicy('2026-2027'),
        passingGrade: 80,
      };
      await client.query(
        'INSERT INTO academic_year_policies (school_year,policy_id,policy) VALUES ($1,$2,$3)',
        [policy.schoolYear, policy.id, policy],
      );
      expect(await readResetTargetPolicy(client, '2026-2027', 'Q2')).toEqual(
        policy,
      );
      expect(
        (await readResetTargetPolicy(client, '2028-2029')).schoolYear,
      ).toBe('2028-2029');
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS count FROM academic_year_policies WHERE school_year='2028-2029'",
          )
        ).rows[0].count,
      ).toBe(0);
      await client.query(
        "INSERT INTO academic_system_states (school_year,quarter,version) VALUES ('2025-2026','Q3',13)",
      );
      await client.query(
        "INSERT INTO app_versions (version_code,min_supported_version_code,native_version,ota_runtime_version,apk_download_url) VALUES (33,30,'0.1.32','0.1.32','https://example.invalid/app.apk')",
      );
      const releaseBefore = (
        await client.query('SELECT to_jsonb(a) AS snapshot FROM app_versions a')
      ).rows;
      const migrationCount = (
        await client.query('SELECT count(*) FROM _applied_migrations')
      ).rows[0].count;
      const inventory = await inspectResetDatabase(client);
      await client.query(
        "INSERT INTO system_reset_operations (id,idempotency_key,actor_id,actor_email,environment,school_year,period,reason,request_hash,manifest) VALUES ($1,$2,$3,'retained@example.invalid','disposable-test','2026-2027','Q2','Integration rehearsal','test-hash','{}')",
        [resetId, randomUUID(), admin],
      );
      await beginMaintenance(client);
      const input = {
        operationId: resetId,
        actorId: admin,
        schoolYear: '2026-2027',
        period: 'Q2' as const,
        policy,
        expectedSchemaHash: inventory.schemaHash,
      };
      await expect(
        applyResetDatabase(client, { ...input, expectedSchemaHash: 'changed' }),
      ).rejects.toThrow('schema changed');
      expect(
        (
          await client.query(
            'SELECT storage_generation FROM system_reset_state WHERE id=1',
          )
        ).rows[0].storage_generation,
      ).toBe('legacy');
      expect(
        (await client.query('SELECT count(*)::int AS count FROM users')).rows[0]
          .count,
      ).toBe(2);
      await expect(
        applyResetDatabase(client, {
          ...input,
          policy: { ...policy, passingGrade: 75 },
        }),
      ).rejects.toThrow('policy changed');
      await expect(applyResetDatabase(client, input)).resolves.toEqual({
        nextVersion: 14,
      });
      expect(
        (
          await client.query(
            'SELECT storage_generation FROM system_reset_state WHERE id=1',
          )
        ).rows[0].storage_generation,
      ).toBe(`g-${resetId}`);
      const verified = await verifyResetDatabase(
        client,
        admin,
        '2026-2027',
        'Q2',
      );
      expect(verified.counts.content_chunks).toBe(0);
      expect(verified.counts.content_chunk_embeddings).toBe(0);
      expect(verified.counts.refresh_tokens).toBe(0);
      expect(verified.counts.admin_demo_mode_states).toBe(0);
      expect(
        (await client.query('SELECT id,password,session_version FROM users'))
          .rows,
      ).toEqual([
        { id: admin, password: 'same-password-hash', session_version: 1 },
      ]);
      expect(
        (await client.query('SELECT policy FROM academic_year_policies'))
          .rows[0].policy,
      ).toEqual(policy);
      expect(
        (
          await client.query(
            'SELECT to_jsonb(a) AS snapshot FROM app_versions a',
          )
        ).rows,
      ).toEqual(releaseBefore);
      expect(
        (await client.query('SELECT count(*) FROM _applied_migrations')).rows[0]
          .count,
      ).toBe(migrationCount);
      expect(
        (
          await client.query(
            "SELECT snapshot FROM system_reset_evidence WHERE source_table='academic_legacy_grade_evidence'",
          )
        ).rows[0].snapshot,
      ).toEqual(legacyBefore);
      expect(
        (
          await client.query(
            "SELECT snapshot FROM system_reset_evidence WHERE source_table='audit_logs'",
          )
        ).rows[0].snapshot.actor_id,
      ).toBe(student);
      expect(
        (
          await client.query(
            "SELECT metadata FROM audit_logs WHERE action='TEST_BEFORE_RESET'",
          )
        ).rows[0].metadata,
      ).toEqual({ proof: 'keep me' });
      expect(
        (
          await client.query(
            'SELECT phase,checkpoint FROM system_reset_operations WHERE id=$1',
            [resetId],
          )
        ).rows[0],
      ).toMatchObject({
        phase: 'cleanup',
        checkpoint: { databaseCommitted: true, academicVersion: 14 },
      });
      expect(
        (await client.query('SELECT active FROM system_reset_state WHERE id=1'))
          .rows[0].active,
      ).toBe(true);
      await expect(applyResetDatabase(client, input)).rejects.toThrow(
        'already completed',
      );
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
