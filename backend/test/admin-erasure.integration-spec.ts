import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/drizzle/schema';
import { PurgeLifecycleService } from '../src/modules/admin-lifecycle/purge-lifecycle.service';
import { AdminErasureService } from '../src/modules/admin-lifecycle/admin-erasure.service';
import { AuditService } from '../src/modules/audit/audit.service';

const url = process.env.RESET_TEST_DATABASE_URL;
if (!url) throw new Error('RESET_TEST_DATABASE_URL is required.');
const target = new URL(url);
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
  !/^\/nexora_reset_test_[a-z0-9_]+$/.test(target.pathname)
) {
  throw new Error(
    'Refusing erasure fixtures outside a disposable local database.',
  );
}

const pool = new Pool({
  connectionString: url,
  max: 5,
  statement_timeout: 15_000,
});
const rootDb = drizzle(pool, { schema });
let transactionDb: typeof rootDb | null = null;
let afterCommitEffects: Array<() => unknown> = [];
const database = {
  get db() {
    return transactionDb ?? rootDb;
  },
  async academicTransaction<T>(work: () => Promise<T>) {
    afterCommitEffects = [];
    const result = await rootDb.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(78766901)`);
      transactionDb = tx as unknown as typeof rootDb;
      try {
        return await work();
      } finally {
        transactionDb = null;
      }
    });
    for (const effect of afterCommitEffects) await effect();
    afterCommitEffects = [];
    return result;
  },
  async afterAcademicCommit(effect: () => unknown) {
    if (transactionDb) afterCommitEffects.push(effect);
    else await effect();
  },
};
const config = {
  get: (key: string) =>
    key === 'adminLifecycle.cascadeEraseEnabled' ? true : undefined,
};
const purge = new PurgeLifecycleService(database as never);
const audit = new AuditService(database as never);
const erasure = new AdminErasureService(
  database as never,
  config as never,
  purge,
  audit,
);

const actorId = randomUUID();
const actorSnapshot = {
  userId: actorId,
  email: 'erasure-admin@example.test',
  firstName: 'Erasure',
  lastName: 'Admin',
};

async function seedActor() {
  const roleId = randomUUID();
  await pool.query(
    `INSERT INTO users(id,email,password,first_name,last_name,account_status)
     VALUES($1,$2,'fixture','Erasure','Admin','ACTIVE')`,
    [actorId, actorSnapshot.email],
  );
  await pool.query(`INSERT INTO roles(id,name) VALUES($1,'admin')`, [roleId]);
  await pool.query(
    `INSERT INTO user_roles(user_id,role_id,assigned_by) VALUES($1,$2,'SYSTEM')`,
    [actorId, roleId],
  );
}

async function seedArchivedClass(
  index: number,
  teacherId: string | null = actorId,
) {
  const sectionId = randomUUID();
  const classId = randomUUID();
  await pool.query(
    `INSERT INTO sections(id,name,grade_level,school_year,is_active,is_archived)
     VALUES($1,$2,'10','2025-2026',false,true)`,
    [sectionId, `Erasure Section ${index}`],
  );
  await pool.query(
    `INSERT INTO classes(id,subject_name,subject_code,section_id,teacher_id,school_year,is_active)
     VALUES($1,$2,$3,$4,$5,'2025-2026',false)`,
    [classId, `Subject ${index}`, `ERASE-${index}`, sectionId, teacherId],
  );
  return { classId, sectionId };
}

describe('admin cascade erasure on real PostgreSQL', () => {
  beforeEach(async () => {
    await pool.query(
      'TRUNCATE admin_erasure_operations, users, roles, sections RESTART IDENTITY CASCADE',
    );
    await seedActor();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deletes all 33 reviewed classes atomically and preserves a durable receipt', async () => {
    const seeded = await Promise.all(
      Array.from({ length: 33 }, (_, index) => seedArchivedClass(index + 1)),
    );
    await pool.query(
      `INSERT INTO lessons(title,class_id) VALUES('Retained lesson',$1)`,
      [seeded[0].classId],
    );
    await pool.query(
      `INSERT INTO uploaded_files(
        teacher_id,class_id,original_name,stored_name,mime_type,size_bytes,file_path,storage_key
      ) VALUES($1,$2,'evidence.pdf','evidence.pdf','application/pdf',24,'uploads/evidence.pdf','classes/evidence.pdf')`,
      [actorId, seeded[0].classId],
    );
    const targetIds = seeded.map((entry) => entry.classId);
    const preview = await erasure.prepare(
      { targetType: 'CLASS', targetIds, purgeMode: 'CASCADE_ERASE' },
      actorId,
    );
    expect(preview.canExecute).toBe(true);
    expect(preview.targets).toHaveLength(33);
    expect(preview.totals.lessons).toBe(1);
    expect(preview.confirmationText).toBe('ERASE 33 CLASSES');

    const execution = {
      targetType: 'CLASS' as const,
      targetIds,
      purgeMode: 'CASCADE_ERASE' as const,
      manifestHash: preview.manifestHash,
      manifestExpiresAt: preview.manifestExpiresAt,
      reasonCode: 'TEST_OR_EMPTY_RECORD' as const,
      notes: 'Disposable batch rehearsal fixture.',
      confirmation: preview.confirmationText,
      idempotencyKey: randomUUID(),
    };
    const result = await erasure.execute(execution, actorId, actorSnapshot);
    expect(result.deletedCount).toBe(33);
    expect(result.status).toBe('cleanup_pending');
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM classes')).rows[0]
        .count,
    ).toBe(0);
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM lessons')).rows[0]
        .count,
    ).toBe(0);
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM admin_erasure_items WHERE operation_id=$1',
          [result.operationId],
        )
      ).rows[0].count,
    ).toBe(33);
    await expect(
      erasure.execute(execution, actorId, actorSnapshot),
    ).resolves.toMatchObject({
      operationId: result.operationId,
      deletedCount: 33,
      replayed: true,
    });
  });

  it('rolls back every target when one class deletion fails', async () => {
    const seeded = await Promise.all(
      Array.from({ length: 3 }, (_, index) => seedArchivedClass(index + 101)),
    );
    const targetIds = seeded.map((entry) => entry.classId);
    const preview = await erasure.prepare(
      { targetType: 'CLASS', targetIds, purgeMode: 'CASCADE_ERASE' },
      actorId,
    );
    await pool.query(
      `CREATE OR REPLACE FUNCTION block_erasure_fixture() RETURNS trigger AS $$
       BEGIN
         IF OLD.id = '${seeded[1].classId}'::uuid THEN
           RAISE EXCEPTION 'fixture delete failure';
         END IF;
         RETURN OLD;
       END; $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      'CREATE TRIGGER block_erasure_fixture BEFORE DELETE ON classes FOR EACH ROW EXECUTE FUNCTION block_erasure_fixture()',
    );
    try {
      let failure: unknown;
      try {
        await erasure.execute(
          {
            targetType: 'CLASS',
            targetIds,
            purgeMode: 'CASCADE_ERASE',
            manifestHash: preview.manifestHash,
            manifestExpiresAt: preview.manifestExpiresAt,
            reasonCode: 'OTHER',
            notes: 'Force a transaction rollback.',
            confirmation: preview.confirmationText,
            idempotencyKey: randomUUID(),
          },
          actorId,
          actorSnapshot,
        );
      } catch (error: unknown) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error & { cause?: Error }).cause?.message).toContain(
        'fixture delete failure',
      );
    } finally {
      await pool.query(
        'DROP TRIGGER IF EXISTS block_erasure_fixture ON classes',
      );
      await pool.query('DROP FUNCTION IF EXISTS block_erasure_fixture()');
    }
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM classes')).rows[0]
        .count,
    ).toBe(3);
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM admin_erasure_items',
        )
      ).rows[0].count,
    ).toBe(0);
  });

  it('erases a deleted teacher account while retaining its authored class', async () => {
    const targetUserId = randomUUID();
    await pool.query(
      `INSERT INTO users(id,email,password,first_name,last_name,account_status)
       VALUES($1,$2,'fixture','Former','Teacher','DELETED')`,
      [targetUserId, `former-${targetUserId}@example.test`],
    );
    const { classId } = await seedArchivedClass(201, targetUserId);
    const preview = await erasure.prepare(
      {
        targetType: 'USER',
        targetIds: [targetUserId],
        purgeMode: 'CASCADE_ERASE',
      },
      actorId,
    );
    expect(preview.canExecute).toBe(true);
    const result = await erasure.execute(
      {
        targetType: 'USER',
        targetIds: [targetUserId],
        purgeMode: 'CASCADE_ERASE',
        manifestHash: preview.manifestHash,
        manifestExpiresAt: preview.manifestExpiresAt,
        reasonCode: 'OTHER',
        notes: 'Former staff account erasure rehearsal.',
        confirmation: preview.confirmationText,
        idempotencyKey: randomUUID(),
      },
      actorId,
      actorSnapshot,
    );
    expect(result.deletedCount).toBe(1);
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM users WHERE id=$1',
          [targetUserId],
        )
      ).rows[0].count,
    ).toBe(0);
    const retainedClass = (
      await pool.query('SELECT teacher_id FROM classes WHERE id=$1', [classId])
    ).rows[0];
    expect(retainedClass).toEqual({ teacher_id: null });
  });
});
