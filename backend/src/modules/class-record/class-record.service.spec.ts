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
      classes: { findFirst: jest.fn() },
      classRecordFinalGrades: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
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
  const mockComputationService = {
    validateCategoryWeights: jest.fn(),
    computeGrades: jest.fn(),
  };
  const mockSyncService = {
    syncFromAssessment: jest.fn(),
  };
  const mockAuditService = { log: jest.fn() };

  beforeEach(async () => {
    db = buildMockDb();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRecordService,
        { provide: DatabaseService, useValue: { db } },
        {
          provide: ClassRecordComputationService,
          useValue: mockComputationService,
        },
        { provide: ClassRecordSyncService, useValue: mockSyncService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: AuditService, useValue: mockAuditService },
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

  it('generates class record workbook and writes audit metadata', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    db.query.classRecords.findFirst.mockResolvedValue(null);

    db.insert
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'record-1' }]),
        }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
        }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'cat-2' }]),
        }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'cat-3' }]),
        }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      });

    jest.spyOn(service, 'getClassRecord').mockResolvedValue({
      id: 'record-1',
      classId: 'class-1',
    } as any);

    const result = await service.generateClassRecord(
      { classId: 'class-1', gradingPeriod: 'Q1' },
      'teacher-1',
      ['teacher'],
    );

    expect(result).toEqual({
      id: 'record-1',
      classId: 'class-1',
    });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'class_record.generated',
        targetType: 'class_record',
        targetId: 'record-1',
        metadata: expect.objectContaining({
          classId: 'class-1',
          gradingPeriod: 'Q1',
          categoryCount: 3,
        }),
      }),
    );
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

  it('finalizes class record with computed grades and writes audit metadata', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      classId: 'class-1',
      teacherId: 'teacher-1',
      status: 'draft',
    });

    const grades = new Map([
      [
        'student-1',
        {
          studentId: 'student-1',
          quarterlyGrade: 86,
          remarks: 'Passed',
        },
      ],
      [
        'student-2',
        {
          studentId: 'student-2',
          quarterlyGrade: 72,
          remarks: 'For Intervention',
        },
      ],
    ]);
    mockComputationService.validateCategoryWeights.mockResolvedValue(undefined);
    mockComputationService.computeGrades.mockResolvedValue(grades);

    const tx = {
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              { id: 'record-1', status: 'finalized' },
            ]),
          }),
        }),
      }),
    };
    db.transaction.mockImplementation(async (handler: (tx: any) => any) =>
      handler(tx),
    );

    const result = await service.finalizeClassRecord(
      'record-1',
      'teacher-1',
      ['teacher'],
    );

    expect(result).toEqual({
      classRecord: { id: 'record-1', status: 'finalized' },
      gradeCount: 2,
    });
    expect(mockComputationService.validateCategoryWeights).toHaveBeenCalledWith(
      'record-1',
      expect.any(Object),
    );
    expect(mockComputationService.computeGrades).toHaveBeenCalledWith(
      'record-1',
      expect.any(Object),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'class_record.finalized',
        targetId: 'record-1',
        metadata: expect.objectContaining({
          classId: 'class-1',
          gradeCount: 2,
        }),
      }),
    );
  });

  it('reopens finalized class record and writes audit metadata with class context', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      classId: 'class-1',
      teacherId: 'teacher-1',
      status: 'finalized',
    });

    const tx = {
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              { id: 'record-1', status: 'draft' },
            ]),
          }),
        }),
      }),
    };
    db.transaction.mockImplementation(async (handler: (tx: any) => any) =>
      handler(tx),
    );

    const result = await service.reopenClassRecord(
      'record-1',
      'teacher-1',
      ['teacher'],
    );

    expect(result).toEqual({ id: 'record-1', status: 'draft' });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'class_record.reopened',
        targetId: 'record-1',
        metadata: expect.objectContaining({
          classId: 'class-1',
          previousStatus: 'finalized',
          nextStatus: 'draft',
        }),
      }),
    );
  });

  it('blocks finalization for non-owner teachers', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      classId: 'class-1',
      teacherId: 'teacher-2',
      status: 'draft',
    });

    await expect(
      service.finalizeClassRecord('record-1', 'teacher-1', ['teacher']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('syncs linked assessment scores and writes audit metadata', async () => {
    db.query.classRecordItems.findFirst.mockResolvedValue({
      id: 'item-1',
      assessmentId: 'assessment-1',
      classRecord: {
        id: 'record-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        status: 'draft',
      },
    });
    mockSyncService.syncFromAssessment.mockResolvedValue({ synced: 3 });

    const result = await service.syncScoresFromAssessment(
      'item-1',
      'teacher-1',
      ['teacher'],
    );

    expect(result).toEqual({ synced: 3 });
    expect(mockSyncService.syncFromAssessment).toHaveBeenCalledWith(
      'item-1',
      'teacher-1',
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'class_record.scores.synced_assessment',
        targetType: 'class_record_item',
        targetId: 'item-1',
        metadata: expect.objectContaining({
          classRecordId: 'record-1',
          classId: 'class-1',
          assessmentId: 'assessment-1',
          synced: 3,
        }),
      }),
    );
  });

  it('blocks teacher student-grade reads for class records they do not own', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      teacherId: 'teacher-2',
      status: 'finalized',
    });

    await expect(
      service.getStudentGrade(
        'record-1',
        'student-1',
        'teacher-1',
        ['teacher'],
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows owner teacher student-grade reads for owned class records', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      id: 'record-1',
      teacherId: 'teacher-1',
      status: 'finalized',
    });
    db.query.classRecordFinalGrades.findFirst.mockResolvedValue({
      classRecordId: 'record-1',
      studentId: 'student-1',
      finalPercentage: '88',
      remarks: 'Passed',
      student: {
        id: 'student-1',
        firstName: 'Alex',
        lastName: 'Reyes',
        email: 'alex@example.com',
      },
    });

    const result = await service.getStudentGrade(
      'record-1',
      'student-1',
      'teacher-1',
      ['teacher'],
    );

    expect(result).toMatchObject({
      classRecordId: 'record-1',
      studentId: 'student-1',
      finalPercentage: '88',
    });
  });
});
