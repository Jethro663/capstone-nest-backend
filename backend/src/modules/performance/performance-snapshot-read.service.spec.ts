import { DatabaseService } from '../../database/database.service';
import { PerformanceSnapshotReadService } from './performance-snapshot-read.service';

describe('PerformanceSnapshotReadService', () => {
  it('loads all student/class snapshots in one batched query', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'snapshot-1',
        studentId: 'student-1',
        classId: 'class-1',
        assessmentAverage: '82.5',
        classRecordAverage: '78',
        blendedScore: '80.25',
        assessmentSampleSize: 3,
        classRecordSampleSize: 4,
        hasData: true,
        isAtRisk: false,
        thresholdApplied: '74',
        lastComputedAt: new Date('2026-07-13T00:00:00Z'),
      },
      {
        id: 'snapshot-2',
        studentId: 'student-1',
        classId: 'class-2',
        assessmentAverage: null,
        classRecordAverage: null,
        blendedScore: null,
        assessmentSampleSize: 0,
        classRecordSampleSize: 0,
        hasData: false,
        isAtRisk: false,
        thresholdApplied: '74',
        lastComputedAt: new Date('2026-07-13T00:00:00Z'),
      },
    ]);
    const databaseService = {
      db: { query: { performanceSnapshots: { findMany } } },
    } as unknown as DatabaseService;
    const service = new PerformanceSnapshotReadService(databaseService);

    const snapshots = await service.findForStudentClasses('student-1', [
      'class-1',
      'class-2',
    ]);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(snapshots.get('class-1')).toEqual(
      expect.objectContaining({
        blendedScore: 80.25,
        thresholdApplied: 74,
      }),
    );
    expect(snapshots.get('class-2')?.blendedScore).toBeNull();
  });

  it('does not query for an empty class set', async () => {
    const findMany = jest.fn();
    const databaseService = {
      db: { query: { performanceSnapshots: { findMany } } },
    } as unknown as DatabaseService;
    const service = new PerformanceSnapshotReadService(databaseService);

    await expect(
      service.findForStudentClasses('student-1', []),
    ).resolves.toEqual(new Map());
    expect(findMany).not.toHaveBeenCalled();
  });
});
