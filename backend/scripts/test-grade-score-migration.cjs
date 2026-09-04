const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
  quiet: true,
});

const prefix = `nexora_grade_migration_${process.pid}`;
const upgradeDatabase = `${prefix}_upgrade`;
const freshDatabase = `${prefix}_fresh`;
const migrationsDirectory = path.resolve(__dirname, '../drizzle');
const repositoryDirectory = path.resolve(__dirname, '../..');
const migrationFiles = fs
  .readdirSync(migrationsDirectory)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  // 0006 is the generated canonical replacement for the earlier hand-written
  // notification/transmutation patches. Applying both pairs to an empty
  // database repeats the same columns and table before this change is reached.
  .filter(
    (file) =>
      file !== '0004_add_notification_metadata.sql' &&
      file !== '0005_add_transmutation_tables.sql',
  )
  .sort();

function connectionUrl(database) {
  const configured =
    process.env.GRADE_MIGRATION_ADMIN_URL || process.env.DATABASE_URL;
  if (!configured) {
    throw new Error('Set DATABASE_URL or GRADE_MIGRATION_ADMIN_URL');
  }
  const url = new URL(configured);
  if (!process.env.GRADE_MIGRATION_ADMIN_URL && url.hostname === 'postgres') {
    url.hostname = '127.0.0.1';
    const container = execFileSync(
      'docker',
      ['compose', 'ps', '-q', 'postgres'],
      { cwd: repositoryDirectory, encoding: 'utf8' },
    ).trim();
    if (container) {
      url.password = execFileSync(
        'docker',
        ['exec', container, 'sh', '-lc', 'printf %s "$POSTGRES_PASSWORD"'],
        { encoding: 'utf8' },
      );
    }
  }
  url.pathname = `/${database}`;
  return url.toString();
}

async function applyMigration(client, file) {
  const sql = fs.readFileSync(path.join(migrationsDirectory, file), 'utf8');
  await client.query(sql.replaceAll('--> statement-breakpoint', ''));
}

async function withDatabase(database, action) {
  const client = new Client({ connectionString: connectionUrl(database) });
  await client.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await action(client);
  } finally {
    await client.end();
  }
}

function runAudit(database) {
  const output = execFileSync(
    process.execPath,
    [path.resolve(__dirname, '../dist/scripts/grade-invariant-audit.js')],
    {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: connectionUrl(database) },
      encoding: 'utf8',
    },
  );
  return JSON.parse(output);
}

async function seedLegacyOverflow(client) {
  await client.query(`
    INSERT INTO users (id, email, password, first_name, last_name)
    VALUES
      ('10000000-0000-0000-0000-000000000001', 'teacher.migration@example.test', 'x', 'Test', 'Teacher'),
      ('10000000-0000-0000-0000-000000000002', 'student.migration@example.test', 'x', 'Test', 'Student');
    INSERT INTO sections (id, name, grade_level, school_year)
    VALUES ('20000000-0000-0000-0000-000000000001', 'Migration Test', 'Grade 7', '2026-2027');
    INSERT INTO classes (id, subject_name, subject_code, section_id, teacher_id, school_year)
    VALUES ('30000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH-MIGRATION', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-2027');
    INSERT INTO assessments (id, title, class_id, total_points, is_published)
    VALUES ('40000000-0000-0000-0000-000000000001', 'Ten-point migration quiz', '30000000-0000-0000-0000-000000000001', 10, true);
    INSERT INTO assessment_questions (id, assessment_id, content, points)
    VALUES ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Question', 10);
    INSERT INTO assessment_attempts (id, student_id, assessment_id, score, direct_score, is_submitted)
    VALUES ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 200, 200, true);
    INSERT INTO assessment_responses (id, attempt_id, question_id, points_earned, created_at)
    VALUES
      ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 5, '2026-09-05T00:00:00Z'),
      ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 15, '2026-09-05T01:00:00Z');
    INSERT INTO performance_snapshots (id, class_id, student_id, assessment_average, blended_score, has_data)
    VALUES ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 331, 331, true);
    INSERT INTO performance_logs (id, class_id, student_id, current_is_at_risk, assessment_average, blended_score, threshold_applied, trigger_source)
    VALUES ('90000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', false, 331, 331, 331, 'migration_test');
  `);
}

async function assertUpgrade(client) {
  const response = await client.query(`
    SELECT id FROM assessment_responses
    WHERE attempt_id = '60000000-0000-0000-0000-000000000001'
  `);
  if (
    response.rowCount !== 1 ||
    response.rows[0].id !== '70000000-0000-0000-0000-000000000002'
  ) {
    throw new Error(
      '0017 did not deterministically retain the latest response',
    );
  }

  const attempt = await client.query(`
    SELECT score, direct_score, base_points_earned, possible_points_snapshot
    FROM assessment_attempts
    WHERE id = '60000000-0000-0000-0000-000000000001'
  `);
  const row = attempt.rows[0];
  if (
    row.score !== 100 ||
    row.direct_score !== 100 ||
    Number(row.base_points_earned) !== 10 ||
    Number(row.possible_points_snapshot) !== 10
  ) {
    throw new Error(
      `0017 repaired unexpected attempt evidence: ${JSON.stringify(row)}`,
    );
  }

  const evidence = await client.query(
    'SELECT count(*)::int AS count FROM grade_score_repair_evidence',
  );
  if (evidence.rows[0].count !== 4) {
    throw new Error(
      '0017 did not preserve duplicate, attempt, and projection evidence',
    );
  }

  const snapshot = await client.query(
    `SELECT count(*)::int AS count FROM performance_snapshots
     WHERE id = '80000000-0000-0000-0000-000000000001'`,
  );
  if (snapshot.rows[0].count !== 0) {
    throw new Error(
      '0017 did not remove the invalid derived snapshot for recompute',
    );
  }
  const performanceLog = await client.query(
    `SELECT assessment_average, blended_score, threshold_applied FROM performance_logs
     WHERE id = '90000000-0000-0000-0000-000000000001'`,
  );
  if (
    Number(performanceLog.rows[0].assessment_average) !== 100 ||
    Number(performanceLog.rows[0].blended_score) !== 100 ||
    Number(performanceLog.rows[0].threshold_applied) !== 100
  ) {
    throw new Error('0017 did not bound historical performance log evidence');
  }

  await expectSqlState(
    client,
    `INSERT INTO assessment_responses (attempt_id, question_id, points_earned)
     VALUES ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1)`,
    '23505',
  );
  await expectSqlState(
    client,
    `UPDATE assessment_attempts SET score = 331
     WHERE id = '60000000-0000-0000-0000-000000000001'`,
    '23514',
  );
  await expectSqlState(
    client,
    `UPDATE performance_logs SET threshold_applied = 331
     WHERE id = '90000000-0000-0000-0000-000000000001'`,
    '23514',
  );
}

async function expectSqlState(client, sql, expectedCode) {
  try {
    await client.query(sql);
  } catch (error) {
    if (error && error.code === expectedCode) return;
    throw error;
  }
  throw new Error(`Expected PostgreSQL error ${expectedCode}`);
}

async function rerunRepairs(client) {
  const migration = fs.readFileSync(
    path.join(migrationsDirectory, '0017_grade_score_invariants.sql'),
    'utf8',
  );
  const statements = migration
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(
      (statement) =>
        statement.startsWith('WITH ') ||
        statement.startsWith('INSERT INTO grade_score_repair_evidence') ||
        statement.startsWith('UPDATE ') ||
        statement.startsWith('DELETE FROM performance_snapshots'),
    );
  for (const statement of statements) await client.query(statement);
}

async function main() {
  const adminDatabase = new URL(
    process.env.GRADE_MIGRATION_ADMIN_URL || process.env.DATABASE_URL,
  ).pathname.slice(1);
  const admin = new Client({ connectionString: connectionUrl(adminDatabase) });
  await admin.connect();
  try {
    for (const database of [upgradeDatabase, freshDatabase]) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
      await admin.query(`CREATE DATABASE "${database}"`);
    }

    await withDatabase(upgradeDatabase, async (client) => {
      for (const file of migrationFiles.filter(
        (file) => !file.startsWith('0017_'),
      )) {
        await applyMigration(client, file);
      }
      await seedLegacyOverflow(client);
      await applyMigration(client, '0017_grade_score_invariants.sql');
      await assertUpgrade(client);
      const evidenceBefore = await client.query(
        'SELECT count(*)::int AS count FROM grade_score_repair_evidence',
      );
      await rerunRepairs(client);
      await assertUpgrade(client);
      const evidenceAfter = await client.query(
        'SELECT count(*)::int AS count FROM grade_score_repair_evidence',
      );
      if (evidenceBefore.rows[0].count !== evidenceAfter.rows[0].count) {
        throw new Error('Repair rerun created duplicate evidence');
      }
    });

    await withDatabase(freshDatabase, async (client) => {
      for (const file of migrationFiles) await applyMigration(client, file);
    });

    const upgradedAudit = runAudit(upgradeDatabase);
    const repeatedAudit = runAudit(upgradeDatabase);
    const freshAudit = runAudit(freshDatabase);
    if (
      upgradedAudit.totalViolations !== 0 ||
      repeatedAudit.totalViolations !== 0 ||
      freshAudit.totalViolations !== 0
    ) {
      throw new Error(
        `Grade invariant audit failed: ${JSON.stringify({ upgradedAudit, repeatedAudit, freshAudit })}`,
      );
    }
    process.stdout.write(
      'Grade migration passed: fresh, upgraded, repair rerun, constraints, and repeated audit are clean.\n',
    );
  } finally {
    for (const database of [upgradeDatabase, freshDatabase]) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    }
    await admin.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
