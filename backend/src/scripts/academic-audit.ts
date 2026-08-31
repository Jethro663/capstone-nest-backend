import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { AcademicAuditService } from '../modules/academic-state/academic-audit.service';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      'Set DATABASE_URL explicitly; academic audit has no database fallback',
    );
  const args = process.argv.slice(2);
  if (args.some((arg) => !arg.startsWith('--school-year=')))
    throw new Error('Usage: npm run academic:audit -- --school-year=2026-2027');
  const year = args
    .find((arg) => arg.startsWith('--school-year='))
    ?.split('=')[1];
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
    const report = await new AcademicAuditService(database).report(year);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await database.onModuleDestroy();
  }
}
void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Academic audit failed'}\n`,
  );
  process.exitCode = 1;
});
