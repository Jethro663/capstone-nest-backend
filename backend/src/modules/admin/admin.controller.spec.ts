import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

const mockAdminService = {
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
});
