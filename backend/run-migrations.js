const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('dotenv');
env.config(); // Load .env if present

// ─── Config ──────────────────────────────────────────────────────────────────
// Reads DATABASE_URL from env, falls back to the local dev default.
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:200411@postgres:5432/capstone';

const client = new Client({ connectionString });

const DRIZZLE_DIR = path.join(__dirname, 'drizzle');
const JOURNAL_PATH = path.join(DRIZZLE_DIR, 'meta', '_journal.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates the migration tracking table if it doesn't exist.
 * This table records which .sql files have already been applied so we
 * never re-run them.  Presentation day? Just add a new file and run —
 * no need to nuke the database.
 */
async function ensureTrackingTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _applied_migrations (
      id            SERIAL PRIMARY KEY,
      filename      TEXT NOT NULL UNIQUE,
      applied_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/**
 * Returns a Set of filenames that have already been applied.
 */
async function getAppliedMigrations() {
  const { rows } = await client.query(
    'SELECT filename FROM _applied_migrations ORDER BY id',
  );
  return new Set(rows.map((r) => r.filename));
}

/**
 * Marks a migration file as applied (records it in the tracking table).
 */
async function recordMigration(filename) {
  await client.query(
    'INSERT INTO _applied_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
    [filename],
  );
}

/**
 * Discovers ALL .sql migration files and returns them in the correct order:
 *   1. Journal-tracked files first (from drizzle-kit, in journal order)
 *   2. All other .sql files sorted by filename (manual / extra migrations)
 *
 * No more hardcoded EXTRA_MIGRATIONS list — just drop a .sql file in
 * the drizzle/ folder and it gets picked up automatically.
 */
function discoverMigrationFiles() {
  // 1. Collect journal-tracked filenames (in order)
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf-8'));
  const journalFiles = journal.entries.map((e) => `${e.tag}.sql`);
  const journalSet = new Set(journalFiles);

  // 2. Collect ALL .sql files on disk
  const allFiles = fs
    .readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // Numeric prefix gives correct order: 0000, 0001, …

  // 3. Separate into "journal first" + "extras after" (preserving order)
  const extras = allFiles.filter((f) => !journalSet.has(f));

  // Final order: journal entries (their intended order) → extras (sorted)
  return [...journalFiles, ...extras];
}

/**
 * Splits raw SQL into individual statements, respecting:
 *   - drizzle-kit's `--> statement-breakpoint` separator
 *   - `DO $$ ... END$$;` PL/pgSQL blocks (`;` inside $$ is NOT a boundary)
 *   - `--` line comments
 */
function splitStatements(sql) {
  // If the file uses drizzle-kit's separator, prefer that
  if (sql.includes('--> statement-breakpoint')) {
    return sql
      .split(/--> statement-breakpoint/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Otherwise, split on `;` but keep $$ blocks intact
  const statements = [];
  let current = '';
  let inDollarBlock = false;

  for (let i = 0; i < sql.length; i++) {
    const rest = sql.substring(i);

    // Toggle $$ block tracking
    if (rest.startsWith('$$')) {
      current += '$$';
      i += 1;
      inDollarBlock = !inDollarBlock;
      continue;
    }

    // Skip line comments (outside $$ blocks)
    if (rest.startsWith('--') && !inDollarBlock) {
      const nl = sql.indexOf('\n', i);
      if (nl === -1) { current += sql.substring(i); break; }
      current += sql.substring(i, nl + 1);
      i = nl;
      continue;
    }

    // Statement boundary — only outside $$ blocks
    if (sql[i] === ';' && !inDollarBlock) {
      current += ';';
      const trimmed = current.trim();
      if (trimmed.length > 1) statements.push(trimmed);
      current = '';
      continue;
    }

    current += sql[i];
  }

  const remaining = current.trim();
  if (remaining.length > 0) statements.push(remaining);
  return statements;
}

/**
 * Returns true if a statement is just a bare transaction control command
 * (BEGIN; / COMMIT; / ROLLBACK;) — we handle transactions ourselves.
 */
function isTransactionControl(stmt) {
  return /^\s*(BEGIN|COMMIT|ROLLBACK)\s*;?\s*$/i.test(stmt);
}

/**
 * Applies a single .sql file.
 *
 * Wraps execution in our own transaction with savepoints so that
 * harmless "already exists" errors are skipped without aborting
 * the rest of the file — even for files that contain their own
 * BEGIN/COMMIT blocks (common in manual migrations).
 */
async function applyMigrationFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const statements = splitStatements(sql).filter((s) => !isTransactionControl(s));

  if (statements.length === 0) return;

  await client.query('BEGIN');

  for (const statement of statements) {
    try {
      await client.query('SAVEPOINT sp');
      await client.query(statement);
      await client.query('RELEASE SAVEPOINT sp');
    } catch (err) {
      const harmless = [
        '42710', // duplicate_object  (type/constraint already exists)
        '42P07', // duplicate_table
        '42701', // duplicate_column
        '42704', // undefined_object  (constraint/index already dropped)
        '42P01', // undefined_table
        '42703', // undefined_column  (old FK refs removed column)
      ];

      if (harmless.includes(err.code)) {
        await client.query('ROLLBACK TO SAVEPOINT sp');
        console.log(`  ⚠ Skipped (${err.code}): ${err.message.split('\n')[0]}`);
      } else {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  }

  await client.query('COMMIT');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function runMigrations() {
  try {
    await client.connect();
    console.log(`Connected to database`);
    console.log(`  ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

    // Create tracking table on first run
    await ensureTrackingTable();

    // Check what's already been applied
    const applied = await getAppliedMigrations();
    if (applied.size > 0) {
      console.log(`📋 ${applied.size} migration(s) already applied — skipping those.\n`);
    }

    // Discover all migration files (journal + extras, auto-sorted)
    const allFiles = discoverMigrationFiles();
    let newCount = 0;

    for (const filename of allFiles) {
      if (applied.has(filename)) {
        // Already applied — skip silently
        continue;
      }

      const filePath = path.join(DRIZZLE_DIR, filename);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠ Missing file: ${filename} (in journal but not on disk) — skipping`);
        continue;
      }

      console.log(`▶ Applying: ${filename}`);
      await applyMigrationFile(filePath);
      await recordMigration(filename);
      console.log(`  ✓ Done`);
      newCount++;
    }

    if (newCount === 0) {
      console.log('✅ Database is up to date — no new migrations to apply.');
    } else {
      console.log(`\n✅ Applied ${newCount} new migration(s) successfully!`);
    }
  } catch (err) {
    console.error('\n❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
