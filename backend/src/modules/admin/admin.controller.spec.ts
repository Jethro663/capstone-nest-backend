import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

const mockAdminService = {
  getDashboardOverview: jest.fn(),
  getDashboardStats: jest.fn(),
  getAuditLogs: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('passes parsed audit log filters to the service', async () => {
    mockAdminService.getAuditLogs.mockResolvedValue({
      data: [],
      page: 2,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

    await controller.getAuditLogs(
      '2',
      '10',
      'class.enrollment.added',
      'actor-1',
    );

    expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      action: 'class.enrollment.added',
      actorId: 'actor-1',
    });
  });

  it('throws BadRequestException for invalid audit pagination params', async () => {
    await expect(controller.getAuditLogs('0')).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.getAuditLogs(undefined, 'abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('wraps the admin overview in the standard success envelope', async () => {
    mockAdminService.getDashboardOverview.mockResolvedValue({
      stats: { totalUsers: 12 },
      usageSummary: { activeTeachers: 3 },
      analyticsOverview: { totals: { classes: 4 } },
      readiness: { ready: true },
      fetchedAt: '2026-03-27T00:00:00.000Z',
    });

    const result = await controller.getOverview();

    expect(mockAdminService.getDashboardOverview).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      message: 'Admin overview retrieved successfully.',
      data: {
        stats: { totalUsers: 12 },
        usageSummary: { activeTeachers: 3 },
        analyticsOverview: { totals: { classes: 4 } },
        readiness: { ready: true },
        fetchedAt: '2026-03-27T00:00:00.000Z',
      },
    });
  });
});
