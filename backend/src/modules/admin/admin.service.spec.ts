import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { HealthService } from '../health/health.service';
import { ReportsService } from '../reports/reports.service';

const makeSelectChain = (rows: any[] = []) => {
  const chain: any = {
    from: jest.fn().mockImplementation(() => chain),
    innerJoin: jest.fn().mockImplementation(() => chain),
    where: jest.fn().mockImplementation(() => chain),
    groupBy: jest.fn().mockImplementation(() => chain),
    then: (resolve: any) => resolve(rows),
  };
  return chain;
};

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: any;
  const mockAuditService = {
    list: jest.fn(),
  };
  const mockAnalyticsService = {
    getAdminOverview: jest.fn(),
  };
  const mockHealthService = {
    getReadiness: jest.fn(),
  };
  const mockReportsService = {
    getSystemUsage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb = {
      select: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: AuditService, useValue: mockAuditService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: HealthService, useValue: mockHealthService },
        { provide: ReportsService, useValue: mockReportsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('aggregates the admin overview from stats, usage, analytics, and readiness', async () => {
    jest.spyOn(service, 'getDashboardStats').mockResolvedValue({
      totalUsers: 12,
    } as any);
    jest.spyOn(service, 'getUsageSummary').mockResolvedValue({
      activeTeachers: 4,
    } as any);
    mockAnalyticsService.getAdminOverview.mockResolvedValue({
      totals: { classes: 6 },
    });
    mockHealthService.getReadiness.mockResolvedValue({
      ready: true,
    });

    const result = await service.getDashboardOverview();

    expect(result.stats.totalUsers).toBe(12);
    expect(result.usageSummary.activeTeachers).toBe(4);
    expect(result.analyticsOverview.totals.classes).toBe(6);
    expect(result.readiness.ready).toBe(true);
    expect(result.fetchedAt).toEqual(expect.any(String));
  });

  it('maps grouped active-role counts into dashboard stats totals', async () => {
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([{ count: 9 }]))
      .mockReturnValueOnce(
        makeSelectChain([
          { roleName: 'teacher', count: 2 },
          { roleName: 'student', count: 5 },
          { roleName: 'admin', count: 2 },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ count: 3 }]))
      .mockReturnValueOnce(makeSelectChain([{ count: 7 }]))
      .mockReturnValueOnce(makeSelectChain([{ count: 4 }]))
      .mockReturnValueOnce(makeSelectChain([{ count: 22 }]));

    const result = await service.getDashboardStats();

    expect(result.totalUsers).toBe(9);
    expect(result.totalTeachers).toBe(2);
    expect(result.totalStudents).toBe(5);
    expect(result.totalAdmins).toBe(2);
    expect(result.activeClasses).toBe(3);
    expect(result.totalClasses).toBe(7);
    expect(result.totalSections).toBe(4);
    expect(result.totalEnrollments).toBe(22);
  });

  it('combines active-user counts with system usage output', async () => {
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([{ total: 3 }]))
      .mockReturnValueOnce(makeSelectChain([{ total: 12 }]));
    mockReportsService.getSystemUsage.mockResolvedValue({
      data: {
        assessmentSubmissions: 14,
        lessonCompletions: 8,
        interventionOpens: 2,
        interventionClosures: 1,
        topActions: [{ action: 'login', total: 20 }],
      },
      generatedAt: '2026-03-27T00:00:00.000Z',
      csv: 'csv-data',
    });

    const result = await service.getUsageSummary({});

    expect(result.activeTeachers).toBe(3);
    expect(result.activeStudents).toBe(12);
    expect(result.assessmentSubmissions).toBe(14);
    expect(result.topActions).toEqual([{ action: 'login', total: 20 }]);
    expect(result.csv).toBe('csv-data');
  });
});
