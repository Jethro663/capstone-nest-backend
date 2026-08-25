import { Logger } from '@nestjs/common';

const logger = new Logger('EnvironmentValidation');

interface EnvRule {
  key: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
  validationMessage?: string;
}

const ENV_RULES: EnvRule[] = [
  // ── Critical secrets (app will not start without these) ──
  {
    key: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    validate: (v) => v.startsWith('postgres'),
    validationMessage: 'Must start with "postgres"',
  },
  {
    key: 'JWT_SECRET',
    required: true,
    description: 'JWT signing secret for access tokens',
    validate: (v) => v.length >= 32,
    validationMessage: 'Must be at least 32 characters for security',
  },
  {
    key: 'JWT_REFRESH_SECRET',
    required: true,
    description: 'JWT signing secret for refresh tokens',
    validate: (v) => v.length >= 32,
    validationMessage: 'Must be at least 32 characters for security',
  },
  {
    key: 'REDIS_URL',
    required: true,
    description: 'Redis connection URL for BullMQ and caching',
    validate: (v) => v.startsWith('redis'),
    validationMessage: 'Must start with "redis://" or "rediss://"',
  },

  // ── Required for AI pipeline ──
  {
    key: 'AI_SERVICE_URL',
    required: false,
    description: 'URL of the FastAPI AI service',
  },

  // ── Required for S3/R2 object storage (only when STORAGE_DRIVER=s3) ──
  {
    key: 'AWS_ACCESS_KEY_ID',
    required: false,
    description: 'S3-compatible access key (required when STORAGE_DRIVER=s3)',
  },
  {
    key: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    description: 'S3-compatible secret key (required when STORAGE_DRIVER=s3)',
  },

  // ── Optional but recommended ──
  {
    key: 'FRONTEND_URL',
    required: false,
    description: 'Frontend origin for CORS and cookie domain',
  },
  {
    key: 'OTP_EMAIL_USER',
    required: false,
    description: 'SMTP email for OTP delivery',
  },
  {
    key: 'OTP_EMAIL_PASS',
    required: false,
    description: 'SMTP password for OTP delivery',
  },
];

/**
 * Validate critical environment variables at application boot.
 *
 * Called from `main.ts` before `app.listen()` so that misconfigured
 * deployments fail fast with clear error messages instead of
 * crashing at runtime with opaque NestJS DI errors.
 */
export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.key];

    if (!value || value.trim() === '') {
      if (rule.required) {
        errors.push(`  ✗ ${rule.key} — ${rule.description} (REQUIRED)`);
      } else {
        warnings.push(`  ⚠ ${rule.key} — ${rule.description} (optional)`);
      }
      continue;
    }

    if (rule.validate && !rule.validate(value)) {
      errors.push(
        `  ✗ ${rule.key} — ${rule.validationMessage ?? 'Invalid value'}`,
      );
    }
  }

  // Conditional: S3 credentials required when STORAGE_DRIVER is s3/r2
  const storageDriver = (
    process.env.STORAGE_DRIVER ||
    process.env.STORAGE_PROVIDER ||
    'local'
  ).toLowerCase();
  if (storageDriver === 's3' || storageDriver === 'r2') {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      errors.push('  ✗ AWS_ACCESS_KEY_ID — Required when STORAGE_DRIVER=s3/r2');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      errors.push(
        '  ✗ AWS_SECRET_ACCESS_KEY — Required when STORAGE_DRIVER=s3/r2',
      );
    }
  }

  if (warnings.length > 0) {
    logger.warn(
      `Environment warnings (${warnings.length}):\n${warnings.join('\n')}`,
    );
  }

  if (errors.length > 0) {
    logger.error(
      `Environment validation failed (${errors.length} error(s)):\n${errors.join('\n')}`,
    );
    throw new Error(
      `Missing or invalid environment variables. Fix the errors above before starting the server.`,
    );
  }

  logger.log('Environment validation passed ✓');
}
