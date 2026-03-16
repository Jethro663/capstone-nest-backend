import { BadRequestException } from '@nestjs/common';

export function parsePositiveIntQuery(
  value: string | undefined,
  name: string,
): number | undefined {
  if (value === undefined) return undefined;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(
      `Invalid "${name}" query parameter. Expected a positive integer.`,
    );
  }

  return parsed;
}
