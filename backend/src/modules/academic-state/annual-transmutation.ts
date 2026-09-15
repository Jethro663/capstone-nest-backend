import { createHash } from 'node:crypto';
import type { TransmutationBand } from '../../drizzle/schema/transmutation.schema';
import {
  LEGACY_BANDS,
  type AcademicPolicy,
  type AnnualGradePolicySnapshot,
  type AnnualTransmutationSnapshot,
  type PeriodContribution,
} from './academic-policy';

export const SYSTEM_DEFAULT_TRANSMUTATION_TITLE =
  'DepEd Order No. 8 s. 2015 Transmutation Table (System Default)';

export const DEFAULT_DEPED_TRANSMUTATION_BANDS: TransmutationBand[] =
  LEGACY_BANDS.map((band, index, bands) => ({
    ...band,
    maxInitialGrade:
      index === 0
        ? 100
        : Math.round((bands[index - 1].minInitialGrade - 0.01) * 100) / 100,
  }));

export function validateAnnualTransmutationBands(
  bands: readonly TransmutationBand[],
): TransmutationBand[] {
  if (!bands.length) throw new Error('Transmutation table cannot be empty');
  const normalized = bands.map((band) => ({
    minInitialGrade: Number(band.minInitialGrade),
    maxInitialGrade: Number(band.maxInitialGrade),
    transmutedGrade: Number(band.transmutedGrade),
  }));
  for (const band of normalized) {
    if (
      !Number.isFinite(band.minInitialGrade) ||
      !Number.isFinite(band.maxInitialGrade) ||
      !Number.isInteger(band.transmutedGrade) ||
      band.minInitialGrade < 0 ||
      band.maxInitialGrade > 100 ||
      band.minInitialGrade > band.maxInitialGrade ||
      band.transmutedGrade < 0 ||
      band.transmutedGrade > 100
    ) {
      throw new Error(
        'Each transmutation band must contain valid 0 to 100 ranges and a whole-number result',
      );
    }
  }
  for (let grade = 0; grade <= 100; grade += 1) {
    const matches = normalized.filter(
      (band) => grade >= band.minInitialGrade && grade <= band.maxInitialGrade,
    );
    if (matches.length !== 1) {
      throw new Error(
        `Transmutation table must cover rounded grade ${grade} exactly once`,
      );
    }
  }
  return normalized.sort((a, b) => b.minInitialGrade - a.minInitialGrade);
}

export function withAnnualTransmutation(
  policy: AcademicPolicy,
  table: {
    id: string;
    title: string;
    updatedAt: Date;
    bands: readonly TransmutationBand[];
  },
): AnnualGradePolicySnapshot {
  const snapshot: AnnualTransmutationSnapshot = {
    tableId: table.id,
    title: table.title,
    updatedAt: table.updatedAt.toISOString(),
    bands: validateAnnualTransmutationBands(table.bands),
  };
  return { ...policy, annualTransmutation: snapshot };
}

export function annualGradeFingerprint(
  policy: AnnualGradePolicySnapshot,
  components: readonly PeriodContribution[],
): string {
  return createHash('sha256')
    .update(JSON.stringify({ policy, components }))
    .digest('hex');
}
