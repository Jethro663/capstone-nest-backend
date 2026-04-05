import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassRecordSyncService } from './class-record-sync.service';
import { DatabaseService } from '../../database/database.service';
import {
  AssessmentSubmittedEvent,
  ClassRecordScoresUpdatedEvent,
} from '../../common/events';
import { AuditService } from '../audit/audit.service';

function buildMockDb() {
  return {
    query: {
      classRecordItems: { findFirst: jest.fn(), findMany: jest.fn() },
      assessmentAttempts: { findMany: jest.fn() },
      assessments: { findFirst: jest.fn() },
      classRecords: { findFirst: jest.fn() },
      classRecordCategories: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
  };
}

function mockScoreUpsert(db: any) {
  const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
  db.insert.mockReturnValueOnce({ values });
}

function mockItemLinkUpdate(db: any) {
  const where = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where });
  db.update.mockReturnValueOnce({ set });
}

describe('ClassRecordSyncService performance events', () => {
  let service: ClassRecordSyncService;
  let db: any;
  let eventEmitter: EventEmitter2;
  const mockAuditService = { log: jest.fn() };

  beforeEach(async () => {
    db = buildMockDb();
    eventEmitter = { emit: jest.fn() } as any;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRecordSyncService,
        { provide: DatabaseService, useValue: { db } },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AuditService, useValue: mockAuditService },
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

  it('handleAssessmentSubmitted should audit auto-synced writes', async () => {
    db.query.assessments.findFirst.mockResolvedValue({
      id: 'assessment-1',
      classId: 'class-1',
      title: 'Quiz 1',
      totalPoints: 20,
    });
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      teacherId: 'teacher-1',
      status: 'draft',
    });
    db.query.classRecordCategories.findFirst.mockResolvedValue({
      id: 'category-1',
    });
    db.query.classRecordItems.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'item-1',
      });

    mockItemLinkUpdate(db);
    mockScoreUpsert(db);

    await service.handleAssessmentSubmitted(
      new AssessmentSubmittedEvent({
        assessmentId: 'assessment-1',
        studentId: 'student-1',
        rawScore: 16,
        totalPoints: 20,
        classRecordCategory: 'written_work',
        quarter: 'Q1',
      }),
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ClassRecordScoresUpdatedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentIds: ['student-1'],
        triggerSource: 'assessment_sync',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'class_record.scores.auto_synced_assessment',
        targetType: 'class_record_item',
        targetId: 'item-1',
        metadata: expect.objectContaining({
          classRecordId: 'record-1',
          classId: 'class-1',
          assessmentId: 'assessment-1',
          studentId: 'student-1',
          classRecordCategory: 'written_work',
          quarter: 'Q1',
          autoLinkedNewItem: true,
        }),
      }),
    );
  });

  it('handleAssessmentSubmitted should audit legacy sync writes', async () => {
    db.query.classRecordItems.findMany.mockResolvedValue([
      {
        id: 'item-1',
        classRecord: {
          id: 'record-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: 'draft',
        },
      },
    ]);
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      maxScore: '20',
      classRecord: { classId: 'class-1' },
    });
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        score: 80,
        submittedAt: new Date('2026-03-08T10:00:00Z'),
      },
    ]);

    mockScoreUpsert(db);

    await service.handleAssessmentSubmitted(
      new AssessmentSubmittedEvent({
        assessmentId: 'assessment-1',
        studentId: 'student-1',
        rawScore: 16,
        totalPoints: 20,
      }),
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ClassRecordScoresUpdatedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentIds: ['student-1'],
        triggerSource: 'assessment_sync',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'class_record.scores.legacy_synced_assessment',
        targetType: 'class_record_item',
        targetId: 'item-1',
        metadata: expect.objectContaining({
          classRecordId: 'record-1',
          classId: 'class-1',
          assessmentId: 'assessment-1',
          synced: 1,
          studentIds: ['student-1'],
        }),
      }),
    );
  });
});
