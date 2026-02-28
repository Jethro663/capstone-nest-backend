const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:200411@localhost:5432/capstone';

const client = new Client({ connectionString });

const DRIZZLE_DIR = path.join(__dirname, 'drizzle');
const JOURNAL_PATH = path.join(DRIZZLE_DIR, 'meta', '_journal.json');

// Files added outside drizzle-kit (not in the journal) — applied after journal entries
// Keep in strict numeric order so FK dependencies are satisfied.
const EXTRA_MIGRATIONS = [
  '0018_add_archived_users.sql',
  '0019_add_refresh_tokens.sql',
  '0020_fix_column_types.sql',
  '0021_partial_unique_enrollment.sql',
  '0022_add_class_schedules.sql',
  '0023_add_performance_and_integrity_indexes.sql',
  '0023_move_student_id_to_lrn.sql',
  '0024_otp_hash_and_used_at.sql',
  '0025_otp_partial_unique_index.sql',
  '0026_add_uploaded_files.sql',
  '0027_add_pending_roster.sql',
  '0028_drop_redundant_roles_name_idx.sql',
  '0029_add_gradebook_module.sql',
  '0030_add_announcements.sql',
  '0031_add_notifications.sql'

];

async function applyMigrationFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  // Drizzle uses '--> statement-breakpoint' to separate statements
  const statements = sql
    .split(/--> statement-breakpoint/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (err) {
      // Skip "already exists" errors so partial re-runs don't break
      const alreadyExists =
        err.code === '42710' || // duplicate_object (type/constraint)
        err.code === '42P07' || // duplicate_table
        err.code === '42701';   // duplicate_column
      // Skip "does not exist" errors — can happen when CASCADE already dropped
      // a constraint/index before an explicit DROP statement runs, or when an
      // old FK/constraint references a column that was removed in a later
      // migration (e.g. subject_id after subjects were denormalised into classes).
      const doesNotExist =
        err.code === '42704' || // undefined_object (constraint/index)
        err.code === '42P01' || // undefined_table
        err.code === '42703';   // undefined_column (old FK refs removed column)

      if (alreadyExists || doesNotExist) {
        console.log(`  ⚠ Skipped (${err.code}): ${err.message.split('\n')[0]}`);
      } else {
        throw err;
      }
    }
  }
}

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Build ordered list of migration files from the journal
    const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf-8'));
    const migrationFiles = journal.entries.map((entry) =>
      path.join(DRIZZLE_DIR, `${entry.tag}.sql`),
    );

    // Append extra migrations not tracked by drizzle-kit
    for (const extra of EXTRA_MIGRATIONS) {
      const extraPath = path.join(DRIZZLE_DIR, extra);
      if (fs.existsSync(extraPath)) {
        migrationFiles.push(extraPath);
      }
    }

    for (const filePath of migrationFiles) {
      const fileName = path.basename(filePath);
      console.log(`▶ Applying: ${fileName}`);
      await applyMigrationFile(filePath);
      console.log(`  ✓ Done`);
    }

    console.log('\n✅ All migrations applied successfully!');
  } catch (err) {
    console.error('\n❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
