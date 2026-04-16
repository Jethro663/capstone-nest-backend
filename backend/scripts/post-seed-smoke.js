import { Client } from 'pg';
import { config } from 'dotenv';

config();

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:200411@postgres:5432/capstone';

const checks = [
  { label: 'submitted attempts', query: "SELECT COUNT(*)::int AS total FROM assessment_attempts WHERE is_submitted = true" },
  { label: 'incorrect responses', query: 'SELECT COUNT(*)::int AS total FROM assessment_responses WHERE is_correct = false' },
  { label: 'content chunks', query: 'SELECT COUNT(*)::int AS total FROM content_chunks' },
  { label: 'chunk embeddings', query: 'SELECT COUNT(*)::int AS total FROM content_chunk_embeddings' },
  { label: 'performance snapshots', query: 'SELECT COUNT(*)::int AS total FROM performance_snapshots' },
  { label: 'performance logs', query: 'SELECT COUNT(*)::int AS total FROM performance_logs' },
  { label: 'intervention cases', query: 'SELECT COUNT(*)::int AS total FROM intervention_cases' },
  { label: 'pending intervention cases', query: "SELECT COUNT(*)::int AS total FROM intervention_cases WHERE status = 'pending'" },
  { label: 'completed intervention cases', query: "SELECT COUNT(*)::int AS total FROM intervention_cases WHERE status = 'completed'" },
  { label: 'concept mastery rows', query: 'SELECT COUNT(*)::int AS total FROM student_concept_mastery' },
];

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    let hasFailure = false;
    for (const check of checks) {
      const result = await client.query(check.query);
      const total = Number(result.rows[0]?.total ?? 0);
      const pass = total > 0;
      const prefix = pass ? '[PASS]' : '[FAIL]';
      console.log(`${prefix} ${check.label}: ${total}`);
      if (!pass) hasFailure = true;
    }

    if (hasFailure) {
      process.exitCode = 1;
      throw new Error('Post-seed smoke validation failed.');
    }

    console.log('[PASS] post-seed smoke validation complete');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

