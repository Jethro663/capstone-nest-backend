const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('dotenv');
const { isHarmlessMigrationError } = require('./migration-error-policy');
env.config(); // Load .env if present

// ─── Config ──────────────────────────────────────────────────────────────────
// Reads DATABASE_URL from env, falls back to the local dev default.
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:200411@marcdustin:5432/capstone';

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

async function ensureVectorExtension() {
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }

    console.warn(
      `⚠️  pgvector is unavailable in this local PostgreSQL instance; ` +
        `continuing with core migrations. Vector-backed RAG features will remain disabled.`,
    );
    return false;
  }
}

/**
 * Discovers ALL .sql migration files and returns them in the correct order:
 *   1. Journal-tracked files first (from drizzle-kit, in journal order)
 *   2. All other .sql files sorted by filename (manual / extra migrations)
 *
 * No more hardcoded EXTRA_MIGRATIONS list — just drop a .sql file in
 * the drizzle/ folder and it gets picked up automatically.
 */
/**
 * Discovers ALL .sql migration files from Drizzle Kit's journal.
 * Enforces strict adherence to meta/_journal.json.
 */
function discoverMigrationFiles() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    throw new Error(`Migration journal not found at ${JOURNAL_PATH}. Cannot proceed.`);
  }
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf-8'));
  const journalFiles = journal.entries.map((e) => `${e.tag}.sql`);
  const journalSet = new Set(journalFiles);

  // Collect ALL .sql files on disk
  const allFiles = fs
    .readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith('.sql'));

  // Check for unregistered extras (hard guardrail against split-brain migrations)
  const extras = allFiles.filter((f) => !journalSet.has(f));
  if (extras.length > 0) {
    throw new Error(
      `Unregistered migration files found in drizzle/: ${extras.join(', ')}. ` +
      `All active DB changes must come from generated migrations registered in meta/_journal.json.`
    );
  }

  return journalFiles;
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

function containsEnumAddValue(statements) {
  return statements.some((stmt) =>
    /\bALTER\s+TYPE\b[\s\S]*\bADD\s+VALUE\b/i.test(stmt),
  );
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
  const requiresNonTransactionalExecution = containsEnumAddValue(statements);

  if (statements.length === 0) return;

  if (requiresNonTransactionalExecution) {
    console.log(
      '  ℹ Running in non-transaction mode (enum ADD VALUE requires commit before reuse)',
    );

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (err) {
        if (isHarmlessMigrationError(err)) {
          console.log(`  ⚠ Skipped (${err.code}): ${err.message.split('\n')[0]}`);
        } else {
          throw err;
        }
      }
    }

    return;
  }

  await client.query('BEGIN');

  for (const statement of statements) {
    try {
      await client.query('SAVEPOINT sp');
      await client.query(statement);
      await client.query('RELEASE SAVEPOINT sp');
    } catch (err) {
      if (isHarmlessMigrationError(err)) {
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
    const vectorExtensionAvailable = await ensureVectorExtension();

    // Check what's already been applied
    const applied = await getAppliedMigrations();
    if (applied.size > 0) {
      console.log(`📋 ${applied.size} migration(s) already applied — checking baseline state.\n`);
    }

    const STAMP_TAG = process.env.MIGRATION_BASELINE_STAMP_TAG || '0000_baseline_nexora.sql';
    const STAMP_ONLY = process.env.MIGRATION_BASELINE_STAMP_ONLY === 'true';

    // Phase D3 / F2: Explicit baseline stamp mode
    if (STAMP_ONLY) {
      console.log(`⚡ MIGRATION_BASELINE_STAMP_ONLY=true detected. Running in explicit stamp mode for ${STAMP_TAG}...`);
      
      // Check if DB is populated (either has existing applied migrations or user tables)
      const { rows: tableRows } = await client.query(
        "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name != '_applied_migrations'"
      );
      const tableCount = parseInt(tableRows[0].count, 10);

      if (applied.size === 0 && tableCount === 0) {
        throw new Error(
          `MIGRATION_BASELINE_STAMP_ONLY=true was passed, but the database appears to be completely empty (0 tables, 0 applied migrations)! Stamp mode must only be run against an existing, populated database.`
        );
      }

      if (applied.has(STAMP_TAG)) {
        console.log(`✅ Baseline migration '${STAMP_TAG}' is already stamped in _applied_migrations. Nothing to do.`);
      } else {
        await recordMigration(STAMP_TAG);
        console.log(`✅ Successfully stamped baseline migration '${STAMP_TAG}' into _applied_migrations without running DDL!`);
      }
      return;
    }

    // Discover all migration files from journal (strict order)
    const allFiles = discoverMigrationFiles();

    // Automatic legacy transition failsafe:
    // If the baseline is NOT applied, but we detect legacy applied migrations (e.g. from before the squash)
    // or pre-existing user tables, automatically stamp the baseline so we don't replay DDL on an existing DB.
    if (allFiles.length > 0 && allFiles[0] === STAMP_TAG && !applied.has(STAMP_TAG)) {
      const { rows: tableRows } = await client.query(
        "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name != '_applied_migrations'"
      );
      const tableCount = parseInt(tableRows[0].count, 10);

      if (applied.size > 0 || tableCount > 0) {
        console.log(`⚡ Detected existing populated database (${applied.size} legacy migration records, ${tableCount} public tables).`);
        console.log(`⚡ Automatically stamping baseline '${STAMP_TAG}' into _applied_migrations without replaying DDL...`);
        await recordMigration(STAMP_TAG);
        applied.add(STAMP_TAG);
        console.log(`✅ Baseline stamped successfully.\n`);
      }
    }

    let newCount = 0;

    for (const filename of allFiles) {
      if (applied.has(filename)) {
        // Already applied — skip silently
        continue;
      }

      if (
        filename === '0003_enable_pgvector.sql' &&
        !vectorExtensionAvailable
      ) {
        console.warn(
          `⚠️  Skipping ${filename} because pgvector is not installed locally.`,
        );
        continue;
      }

      const filePath = path.join(DRIZZLE_DIR, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file: ${filename} (listed in _journal.json but not found on disk at ${filePath})`);
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
