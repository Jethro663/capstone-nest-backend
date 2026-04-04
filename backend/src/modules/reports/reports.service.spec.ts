import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../database/database.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const mockDb = {
    query: {
      classes: { findMany: jest.fn() },
      performanceSnapshots: { findMany: jest.fn() },
    },
  };

  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb.query.classes.findMany.mockResolvedValue([]);
    mockDb.query.performanceSnapshots.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('returns empty student-performance data when teacher class scope has no classes', async () => {
    const result = await service.getStudentPerformance({
      teacherId: 'teacher-1',
    });

    expect(result.data).toEqual([]);
    expect(result.csv).toBe('No data\n');
    expect(mockDb.query.performanceSnapshots.findMany).not.toHaveBeenCalled();
  });

  it('returns empty paginated student master list when teacher class scope has no classes', async () => {
    const result = await service.getStudentMasterList({
      teacherId: 'teacher-2',
      page: 3,
      limit: 5,
    });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(5);
    expect(result.csv).toBe('No data\n');
  });

  it('returns empty paginated class enrollment when teacher class scope has no classes', async () => {
    const result = await service.getClassEnrollment({
      teacherId: 'teacher-3',
      page: 1,
      limit: 20,
    });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.csv).toBe('No data\n');
  });
});
