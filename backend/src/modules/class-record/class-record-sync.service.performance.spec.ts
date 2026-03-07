import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassRecordSyncService } from './class-record-sync.service';
import { DatabaseService } from '../../database/database.service';
import { ClassRecordScoresUpdatedEvent } from '../../common/events';

function buildMockDb() {
  return {
    query: {
      classRecordItems: { findFirst: jest.fn() },
      assessmentAttempts: { findMany: jest.fn() },
    },
    insert: jest.fn(),
  };
}

function mockScoreUpsert(db: any) {
  const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
  db.insert.mockReturnValueOnce({ values });
}

describe('ClassRecordSyncService performance events', () => {
  let service: ClassRecordSyncService;
  let db: any;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    db = buildMockDb();
    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRecordSyncService,
        { provide: DatabaseService, useValue: { db } },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ClassRecordSyncService>(ClassRecordSyncService);
  });

  it('syncFromAssessment should emit class-record.scores.updated after sync', async () => {
    db.query.classRecordItems.findFirst
      .mockResolvedValueOnce({
        id: 'item-1',
        assessmentId: 'assessment-1',
        classRecord: { teacherId: 'teacher-1', status: 'draft' },
      })
      .mockResolvedValueOnce({
        id: 'item-1',
        maxScore: '20',
        classRecord: { classId: 'class-1' },
      });

    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        score: 70,
        submittedAt: new Date('2026-03-07T10:00:00Z'),
      },
    ]);

    mockScoreUpsert(db);

    const result = await service.syncFromAssessment('item-1', 'teacher-1');

    expect(result.synced).toBe(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ClassRecordScoresUpdatedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentIds: ['student-1'],
        triggerSource: 'manual_sync',
      }),
    );
  });
});
