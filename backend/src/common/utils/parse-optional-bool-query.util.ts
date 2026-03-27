import { BadRequestException } from '@nestjs/common';

export function parseOptionalBoolQuery(
  value: string | undefined,
  name: string,
): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  throw new BadRequestException(
    `Invalid "${name}" query parameter. Expected "true" or "false".`,
  );
}
