const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:200411@localhost:5432/capstone';

const client = new Client({
  connectionString,
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'apply-migrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      const trimmedStmt = statement.trim();
      if (trimmedStmt) {
        console.log(`Executing: ${trimmedStmt.substring(0, 50)}...`);
        try {
          await client.query(trimmedStmt);
          console.log('✓ Success');
        } catch (err) {
          // If it's an "already exists" error, that's OK - migration may be partial
          if ((err.code === '42710' || err.code === '42P07') && err.message.includes('already exists')) {
            console.log('⚠ Already exists (skipped)');
          } else {
            throw err;
          }
        }
      }
    }

    console.log('\n✅ Migrations applied successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
