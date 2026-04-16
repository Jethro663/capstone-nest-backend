import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  const mockReportsService = {
    getStudentMasterList: jest.fn(),
    getClassEnrollment: jest.fn(),
    getStudentPerformance: jest.fn(),
    getInterventionParticipation: jest.fn(),
    getAssessmentSummary: jest.fn(),
    getSystemUsage: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  let controller: ReportsController;

  const createResponse = () => ({
    setHeader: jest.fn(),
    send: jest.fn(),
    json: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReportsService.getStudentMasterList.mockResolvedValue({
      data: [],
      csv: 'a,b\n1,2',
    });
    mockReportsService.getClassEnrollment.mockResolvedValue({
      data: [],
      csv: 'c,d\n3,4',
    });
    mockReportsService.getSystemUsage.mockResolvedValue({
      data: {},
      csv: 'metric,total\nx,1',
    });
    mockAuditService.log.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('scopes teacher requests and writes audit log when exporting CSV', async () => {
    const response = createResponse();
    const user = { userId: 'teacher-1', roles: ['teacher'] };

    await controller.getStudentMasterList(
      {
        export: 'csv',
        classId: 'class-1',
        sectionId: 'section-1',
        page: '2',
        limit: '10',
      },
      user,
      response as any,
    );

    expect(mockReportsService.getStudentMasterList).toHaveBeenCalledWith(
      expect.objectContaining({
        classId: 'class-1',
        sectionId: 'section-1',
        page: 2,
        limit: 10,
        teacherId: 'teacher-1',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'reports.exported',
        targetType: 'report',
        targetId: 'student-master-list',
      }),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(response.send).toHaveBeenCalledWith('a,b\n1,2');
    expect(response.json).not.toHaveBeenCalled();
  });

  it('does not scope admin requests and returns JSON when export is omitted', async () => {
    const response = createResponse();
    const user = { userId: 'admin-1', roles: ['admin'] };

    await controller.getClassEnrollment({}, user, response as any);

    expect(mockReportsService.getClassEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: undefined,
      }),
    );
    expect(mockAuditService.log).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('writes export audit metadata without internal teacher scope fields', async () => {
    const response = createResponse();
    const user = { userId: 'teacher-2', roles: ['teacher'] };

    await controller.getSystemUsage(
      {
        export: 'csv',
        classId: 'class-9',
      },
      user,
      response as any,
    );

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          exportFormat: 'csv',
          filters: expect.objectContaining({
            classId: 'class-9',
          }),
        }),
      }),
    );
    const [auditPayload] = mockAuditService.log.mock.calls.at(-1) ?? [];
    expect(auditPayload.metadata.filters.teacherId).toBeUndefined();
  });
});
