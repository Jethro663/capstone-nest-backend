const fs = require('fs');
const path = require('path');

const DRIZZLE_DIR = path.join(__dirname, '..', 'drizzle');
const JOURNAL_PATH = path.join(DRIZZLE_DIR, 'meta', '_journal.json');
const ARCHIVE_DIR = path.join(__dirname, '..', 'drizzle-archive');

console.log('==> Checking Drizzle migration integrity...');

// 1. Verify journal exists
if (!fs.existsSync(JOURNAL_PATH)) {
  console.error(`❌ ERROR: Migration journal not found at ${JOURNAL_PATH}`);
  process.exit(1);
}

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf-8'));
const journalTags = journal.entries.map((e) => e.tag);
const journalFiles = new Set(journalTags.map((tag) => `${tag}.sql`));

// 2. Check all .sql files on disk in drizzle/
const allFiles = fs
  .readdirSync(DRIZZLE_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

// Rule G3.1: Fails if active .sql files exist outside the active journal contract
const extras = allFiles.filter((f) => !journalFiles.has(f));
if (extras.length > 0) {
  console.error(`❌ ERROR: Found unregistered migration files in drizzle/:`);
  extras.forEach((f) => console.error(`   - ${f}`));
  console.error(`\nAll active database migrations MUST be generated via drizzle-kit and listed in meta/_journal.json.`);
  process.exit(1);
}

// Rule G3.2: Fails if any journal entry is missing on disk
for (const tag of journalTags) {
  const expectedFile = path.join(DRIZZLE_DIR, `${tag}.sql`);
  if (!fs.existsSync(expectedFile)) {
    console.error(`❌ ERROR: Journal entry '${tag}' is missing its SQL file: ${expectedFile}`);
    process.exit(1);
  }
}

// Rule G3.3: Fails if duplicate active migration numeric prefixes appear
const prefixes = {};
for (const tag of journalTags) {
  const prefixMatch = tag.match(/^(\d+)_/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    prefixes[prefix] = (prefixes[prefix] || []);
    prefixes[prefix].push(tag);
  }
}

const duplicates = Object.entries(prefixes).filter(([_, tags]) => tags.length > 1);
if (duplicates.length > 0) {
  console.error(`❌ ERROR: Duplicate migration sequence numbers detected in journal:`);
  duplicates.forEach(([prefix, tags]) => {
    console.error(`   Prefix [${prefix}] -> used by: ${tags.join(', ')}`);
  });
  console.error(`\nDuplicate prefixes cause ordering conflicts. Re-generate migrations to maintain a single linear sequence.`);
  process.exit(1);
}

// Rule G3.4: Fails if archive files are somehow copied back into active drizzle/
if (fs.existsSync(ARCHIVE_DIR)) {
  const checkArchiveRecursive = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        checkArchiveRecursive(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.sql')) {
        if (journalFiles.has(entry.name) || allFiles.includes(entry.name)) {
          console.error(`❌ ERROR: Archived migration file '${entry.name}' is also present in active drizzle/ folder!`);
          process.exit(1);
        }
      }
    }
  };
  checkArchiveRecursive(ARCHIVE_DIR);
}

console.log(`✅ Migration integrity check passed! (${allFiles.length} linear active migrations verified)`);
process.exit(0);
