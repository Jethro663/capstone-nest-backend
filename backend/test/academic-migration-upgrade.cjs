// Run only against a NEW, EMPTY disposable local nexora_academic_test database.
// Recreates the pre-lifecycle schema (through 0010), seeds legacy evidence,
// then uses the supported migration runner to apply and replay the upgrade.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
const { isHarmlessMigrationError } = require('../migration-error-policy');

async function main() {
  const connectionString = process.env.ACADEMIC_TEST_DATABASE_URL;
  const url = new URL(connectionString);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert(url.pathname.startsWith('/nexora_academic_test'));
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const tables = await client.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
    assert.equal(tables.rows[0].count, 0, 'Refusing to seed a nonempty database');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query('CREATE TABLE _applied_migrations (id serial PRIMARY KEY, filename text NOT NULL UNIQUE, applied_at timestamptz NOT NULL DEFAULT now())');
    const root = path.resolve(__dirname, '..');
    const journal = JSON.parse(fs.readFileSync(path.join(root, 'drizzle/meta/_journal.json'), 'utf8'));
    for (const entry of journal.entries.filter(e => e.idx <= 10)) {
      const filename = `${entry.tag}.sql`;
      await client.query('BEGIN');
      for (const statement of fs.readFileSync(path.join(root, 'drizzle', filename), 'utf8').split('--> statement-breakpoint').filter(s => s.trim())) {
        await client.query('SAVEPOINT migration_statement');
        try { await client.query(statement); }
        catch (error) {
          if (!isHarmlessMigrationError(error)) throw error;
          await client.query('ROLLBACK TO SAVEPOINT migration_statement');
        }
        await client.query('RELEASE SAVEPOINT migration_statement');
      }
      await client.query('INSERT INTO _applied_migrations(filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
    }
    const student = (await client.query("INSERT INTO users(email,password,first_name,last_name) VALUES ('migration@example.test','invented-test-only','Legacy','Learner') RETURNING id")).rows[0].id;
    const section = (await client.query("INSERT INTO sections(name,grade_level,school_year) VALUES ('Upgrade fixture','8','2026-2027') RETURNING id")).rows[0].id;
    const cls = (await client.query("INSERT INTO classes(section_id,subject_name,subject_code,subject_grade_level,school_year) VALUES ($1,'Mathematics','MATH8','8','2026-2027') RETURNING id", [section])).rows[0].id;
    const record = (await client.query("INSERT INTO class_records(class_id,grading_period,status) VALUES ($1,'Q4','finalized') RETURNING id", [cls])).rows[0].id;
    const grade = (await client.query("INSERT INTO class_record_final_grades(gradebook_id,student_id,final_percentage,remarks) VALUES ($1,$2,74.125,'For Intervention') RETURNING id", [record, student])).rows[0].id;
    const category = (await client.query("INSERT INTO class_record_categories(gradebook_id,name,weight_percentage) VALUES ($1,'Written Works',30) RETURNING id", [record])).rows[0].id;
    const item = (await client.query("INSERT INTO class_record_items(gradebook_id,category_id,title,max_score) VALUES ($1,$2,'Legacy zero',10) RETURNING id", [record, category])).rows[0].id;
    await client.query('INSERT INTO class_record_scores(gradebook_item_id,student_id,score) VALUES ($1,$2,0)', [item, student]);
    await client.query("INSERT INTO academic_system_states(school_year,quarter) VALUES ('2026-2027','Q4'),('2026-2027','Q3')");
    const runner = () => execFileSync(process.execPath, ['run-migrations.js'], { cwd: root, env: { ...process.env, DATABASE_URL: connectionString, MIGRATION_BASELINE_STAMP_ONLY: 'false' }, stdio: 'pipe' });
    runner();
    runner();
    const archived = (await client.query('SELECT source_snapshot FROM academic_legacy_grade_evidence WHERE source_final_grade_id=$1', [grade])).rows;
    assert.equal(archived.length, 1);
    assert.equal(archived[0].source_snapshot.finalGrade.final_percentage, 74.125);
    assert.equal(archived[0].source_snapshot.trusted, false);
    assert.equal((await client.query('SELECT final_percentage FROM class_record_final_grades WHERE id=$1', [grade])).rows[0].final_percentage, '74.125');
    assert.deepEqual((await client.query('SELECT grading_period, revision, roster_confirmed_at FROM class_records WHERE id=$1', [record])).rows[0], { grading_period: 'Q4', revision: 0, roster_confirmed_at: null });
    assert.deepEqual((await client.query('SELECT score,status FROM class_record_scores')).rows[0], { score: '0.00', status: 'recorded' });
    assert.equal((await client.query('SELECT count(*)::int AS count FROM academic_system_states')).rows[0].count, 2);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM subject_annual_grades')).rows[0].count, 0);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM academic_year_policies')).rows[0].count, 0);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM _applied_migrations')).rows[0].count, journal.entries.length);
    console.log('Upgrade and replay passed: exact legacy grade, explicit zero, incompatible Q4, duplicate state and unknown roster preserved; no annual result fabricated.');
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
