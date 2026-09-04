import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { GradeInvariantAuditService } from '../modules/academic-state/grade-invariant-audit.service';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      'Set DATABASE_URL explicitly; grade invariant audit has no database fallback',
    );
  if (process.argv.slice(2).length > 0)
    throw new Error('Usage: npm run grade:audit');
  Logger.overrideLogger(false);
  const database = new DatabaseService(
    new ConfigService({
      database: {
        url,
        poolMax: 1,
        connectionTimeout: 5000,
        statementTimeout: 30000,
      },
      NODE_ENV: 'test',
    }),
  );
  try {
    await database.onModuleInit();
    const report = await new GradeInvariantAuditService(database).report();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.totalViolations > 0) process.exitCode = 2;
  } finally {
    await database.onModuleDestroy();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Grade invariant audit failed'}\n`,
  );
  process.exitCode = 1;
});
