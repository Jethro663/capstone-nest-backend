import { Test, TestingModule } from '@nestjs/testing';
import { ClassRecordComputationService } from './class-record-computation.service';
import { DatabaseService } from '../../database/database.service';

function buildMockDb() {
  return {
    query: {
      classRecords: { findFirst: jest.fn() },
      classRecordCategories: { findMany: jest.fn() },
      classRecordItems: { findMany: jest.fn() },
    },
    select: jest.fn(),
  };
}

function mockSelect(db: any, rows: any[], withJoin = false) {
  const chain: any = {
    where: jest.fn().mockResolvedValue(rows),
  };
  if (withJoin) {
    chain.innerJoin = jest.fn().mockReturnThis();
  }
  chain.from = jest.fn().mockReturnValue(chain);
  db.select.mockReturnValueOnce(chain);
}

describe('ClassRecordComputationService', () => {
  let service: ClassRecordComputationService;
  let db: any;

  beforeEach(async () => {
    db = buildMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRecordComputationService,
        { provide: DatabaseService, useValue: { db } },
      ],
    }).compile();

    service = module.get<ClassRecordComputationService>(
      ClassRecordComputationService,
    );
  });

  it('includes removed students with history in grade computation', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      classId: 'class-1',
    });
    mockSelect(db, [{ studentId: 'student-active' }]);
    mockSelect(db, [{ studentId: 'student-removed' }], true);
    mockSelect(db, [{ studentId: 'student-removed' }]);

    db.query.classRecordCategories.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Written Works', weightPercentage: '100' },
    ]);
    db.query.classRecordItems.findMany.mockResolvedValue([
      {
        id: 'item-1',
        categoryId: 'cat-1',
        maxScore: '100',
        scores: [
          { studentId: 'student-active', score: '90' },
          { studentId: 'student-removed', score: '80' },
        ],
      },
    ]);

    const results = await service.computeGrades('record-1');

    expect(results.has('student-active')).toBe(true);
    expect(results.has('student-removed')).toBe(true);
    expect(results.get('student-removed')?.quarterlyGrade).toBeGreaterThan(0);
  });

  it('throws when no active or historical participants exist', async () => {
    db.query.classRecords.findFirst.mockResolvedValue({
      classId: 'class-1',
    });
    mockSelect(db, []);
    mockSelect(db, [], true);
    mockSelect(db, []);
    db.query.classRecordCategories.findMany.mockResolvedValue([]);
    db.query.classRecordItems.findMany.mockResolvedValue([]);

    await expect(service.computeGrades('record-1')).rejects.toThrow(
      'No class-record participants found for this class',
    );
  });
});
