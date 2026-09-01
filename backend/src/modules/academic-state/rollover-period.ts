import { BadRequestException } from '@nestjs/common';
export type RolloverPeriodMapping = Partial<
  Record<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'unassigned', 'Q1' | 'Q2' | 'Q3' | 'Q4'>
>;
/** Only newly copied content is mapped. Original records and student evidence are untouched. */
export function resolveRolloverPeriod(
  source: string | null | undefined,
  mapping: RolloverPeriodMapping,
  validPeriods: readonly string[],
) {
  const destination =
    source && validPeriods.includes(source)
      ? source
      : mapping[(source || 'unassigned') as keyof RolloverPeriodMapping];
  if (!destination)
    throw new BadRequestException(
      `Choose an explicit destination period for copied assessments from ${source || 'unassigned'}`,
    );
  if (!validPeriods.includes(destination))
    throw new BadRequestException(
      `Invalid destination grading period ${destination}`,
    );
  return destination;
}
