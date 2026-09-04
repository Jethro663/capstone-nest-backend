import { GradeInvariantAuditService } from './grade-invariant-audit.service';

describe('GradeInvariantAuditService', () => {
  it('normalizes database counts and reports a deterministic total', async () => {
    const execute = jest.fn().mockResolvedValue({
      rows: [
        {
          duplicateResponseGroups: '1',
          invalidAttemptDenominators: '2',
          outOfRangeAttempts: '3',
          invalidClassRecordScores: '4',
          outOfRangeFinalGrades: '5',
          outOfRangePerformanceSnapshots: '6',
          outOfRangePerformanceLogs: '7',
          ambiguousLegacyAttempts: '8',
        },
      ],
    });
    const service = new GradeInvariantAuditService({ db: { execute } } as any);

    await expect(service.report()).resolves.toEqual({
      duplicateResponseGroups: 1,
      invalidAttemptDenominators: 2,
      outOfRangeAttempts: 3,
      invalidClassRecordScores: 4,
      outOfRangeFinalGrades: 5,
      outOfRangePerformanceSnapshots: 6,
      outOfRangePerformanceLogs: 7,
      ambiguousLegacyAttempts: 8,
      totalViolations: 36,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
