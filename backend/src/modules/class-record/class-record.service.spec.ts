import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassRecordService } from './class-record.service';
import { ClassRecordComputationService } from './class-record-computation.service';
import { ClassRecordSyncService } from './class-record-sync.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

function buildMockDb() {
  const db: any = {
    query: {
      classRecordItems: { findFirst: jest.fn() },
      classRecords: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
  };

  return db;
}

function mockUpdateReturning(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  db.update.mockReturnValueOnce({ set });
}

describe('ClassRecordService', () => {
  let service: ClassRecordService;
  let db: any;

  beforeEach(async () => {
    db = buildMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRecordService,
        { provide: DatabaseService, useValue: { db } },
        { provide: ClassRecordComputationService, useValue: {} },
        { provide: ClassRecordSyncService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ClassRecordService>(ClassRecordService);
  });

  it('updates highest possible score for editable manual slots', async () => {
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      itemOrder: 2,
      assessmentId: null,
      classRecord: {
        id: 'record-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        status: 'draft',
      },
      category: {
        name: 'Written Works',
      },
    });
    mockUpdateReturning(db, [{ id: 'item-1', maxScore: '25' }]);

    const result = await service.updateClassRecordItem(
      'item-1',
      { maxScore: 25 },
      'teacher-1',
      ['teacher'],
    );

    expect(result).toEqual({ id: 'item-1', maxScore: '25' });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('rejects updating linked assessment slots manually', async () => {
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      itemOrder: 1,
      assessmentId: 'assessment-1',
      classRecord: {
        id: 'record-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        status: 'draft',
      },
      category: {
        name: 'Written Works',
      },
    });

    await expect(
      service.updateClassRecordItem(
        'item-1',
        { maxScore: 30 },
        'teacher-1',
        ['teacher'],
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks score recording when highest possible score is zero', async () => {
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      maxScore: '0',
      classRecord: {
        id: 'record-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        status: 'draft',
      },
    });

    await expect(
      service.recordScore(
        'item-1',
        { studentId: 'student-1', score: 5 },
        'teacher-1',
        ['teacher'],
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks bulk score recording when highest possible score is zero', async () => {
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      maxScore: '0',
      classRecord: {
        id: 'record-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        status: 'draft',
      },
    });

    await expect(
      service.bulkRecordScores(
        'item-1',
        { scores: [{ studentId: 'student-1', score: 5 }] },
        'teacher-1',
        ['teacher'],
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns slot overview with manual and linked statuses', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      teacherId: 'teacher-1',
      gradingPeriod: 'Q1',
      status: 'draft',
      categories: [
        {
          id: 'cat-1',
          name: 'Written Works',
          items: [
            {
              id: 'item-empty',
              title: 'WW1',
              itemOrder: 1,
              maxScore: '0',
              assessmentId: null,
              assessment: null,
              scores: [],
            },
            {
              id: 'item-manual',
              title: 'WW2',
              itemOrder: 2,
              maxScore: '20',
              assessmentId: null,
              assessment: null,
              scores: [{ id: 'score-1' }],
            },
            {
              id: 'item-linked',
              title: 'Quiz 1',
              itemOrder: 3,
              maxScore: '25',
              assessmentId: 'assessment-1',
              assessment: { id: 'assessment-1', title: 'Quiz 1' },
              scores: [],
            },
          ],
        },
      ],
    });

    const result = await service.getSlotOverview(
      'class-1',
      'Q1',
      'teacher-1',
      ['teacher'],
      'assessment-1',
    );

    expect(result.categories[0].slots.map((slot: any) => slot.status)).toEqual([
      'empty',
      'manual',
      'linked_self',
    ]);
  });

  it('rejects slot overview access for foreign teachers', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      teacherId: 'teacher-2',
      gradingPeriod: 'Q1',
      status: 'draft',
      categories: [],
    });

    await expect(
      service.getSlotOverview('class-1', 'Q1', 'teacher-1', ['teacher']),
    ).rejects.toThrow(ForbiddenException);
  });
});
