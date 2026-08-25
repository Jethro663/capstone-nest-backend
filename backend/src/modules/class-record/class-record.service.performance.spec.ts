import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassRecordService } from './class-record.service';
import { ClassRecordComputationService } from './class-record-computation.service';
import { ClassRecordSyncService } from './class-record-sync.service';
import { DatabaseService } from '../../database/database.service';
import { ClassRecordScoresUpdatedEvent } from '../../common/events';
import { AuditService } from '../audit/audit.service';

function buildMockDb() {
  return {
    query: {
      classRecordItems: { findFirst: jest.fn() },
      classes: { findFirst: jest.fn(), findMany: jest.fn() },
      classRecords: { findMany: jest.fn() },
      sections: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
  };
}

function mockScoreUpsertReturning(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const onConflictDoUpdate = jest.fn().mockReturnValue({ returning });
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
  db.insert.mockReturnValueOnce({ values });
  return { values, onConflictDoUpdate, returning };
}

describe('ClassRecordService performance events', () => {
  let service: ClassRecordService;
  let db: any;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    db = buildMockDb();
    eventEmitter = { emit: jest.fn() } as any;
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRecordService,
        { provide: DatabaseService, useValue: { db } },
        { provide: ClassRecordComputationService, useValue: {} },
        { provide: ClassRecordSyncService, useValue: {} },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ClassRecordService>(ClassRecordService);
  });

  it('recordScore should emit class-record.scores.updated for single score', async () => {
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      maxScore: '20',
      classRecord: {
        status: 'draft',
        teacherId: 'teacher-1',
        classId: 'class-1',
      },
    });
    mockScoreUpsertReturning(db, [{ id: 'score-1' }]);

    await service.recordScore(
      'item-1',
      { studentId: 'student-1', score: 15 },
      'teacher-1',
      ['teacher'],
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ClassRecordScoresUpdatedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentIds: ['student-1'],
        triggerSource: 'manual_single',
      }),
    );
  });

  it('bulkRecordScores should emit class-record.scores.updated for bulk scores', async () => {
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      maxScore: '20',
      classRecord: {
        status: 'draft',
        teacherId: 'teacher-1',
        classId: 'class-1',
      },
    });
    const upsert = mockScoreUpsertReturning(db, [
      { id: 's1', studentId: 'student-1' },
      { id: 's2', studentId: 'student-2' },
    ]);

    await service.bulkRecordScores(
      'item-1',
      {
        scores: [
          { studentId: 'student-1', score: 12 },
          { studentId: 'student-2', score: 14 },
        ],
      },
      'teacher-1',
      ['teacher'],
    );

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(upsert.values).toHaveBeenCalledWith([
      expect.objectContaining({ studentId: 'student-1', score: '12' }),
      expect.objectContaining({ studentId: 'student-2', score: '14' }),
    ]);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ClassRecordScoresUpdatedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentIds: ['student-1', 'student-2'],
        triggerSource: 'manual_bulk',
      }),
    );
  });

  it('listAdviserSection loads all class records in one query and preserves empty classes', async () => {
    db.query.sections.findFirst.mockResolvedValue({
      adviserId: 'teacher-1',
      name: 'Section A',
    });
    db.query.classes.findMany.mockResolvedValue([
      { id: 'class-1', subjectName: 'Math', subjectCode: 'MATH-7' },
      { id: 'class-2', subjectName: 'Science', subjectCode: 'SCI-7' },
    ]);
    db.query.classRecords.findMany.mockResolvedValue([
      { id: 'record-2', classId: 'class-1', gradingPeriod: 'Q2' },
      { id: 'record-1', classId: 'class-1', gradingPeriod: 'Q1' },
    ]);

    const result = await service.listAdviserSection('section-1', 'teacher-1', [
      'teacher',
    ]);

    expect(db.query.classRecords.findMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      sectionId: 'section-1',
      sectionName: 'Section A',
      classes: [
        {
          classId: 'class-1',
          classRecords: [
            expect.objectContaining({ id: 'record-2' }),
            expect.objectContaining({ id: 'record-1' }),
          ],
        },
        { classId: 'class-2', classRecords: [] },
      ],
    });
  });
});
