import { BadRequestException } from '@nestjs/common';

export function parseDateQuery(
  value: string | undefined,
  name: string,
): Date | undefined {
  if (value === undefined) return undefined;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(
      `Invalid "${name}" query parameter. Expected an ISO date string.`,
    );
  }

  return parsed;
}
