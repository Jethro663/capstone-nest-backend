import { ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { SystemEvaluationService } from './system-evaluation.service';

describe('SystemEvaluationService authorization parity', () => {
  it('applies server pagination and returns stable campaign page metadata', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const where = jest.fn().mockResolvedValue([{ total: 42 }]);
    const service = new SystemEvaluationService(
      {
        db: {
          query: { systemEvaluationCampaigns: { findMany } },
          select: jest
            .fn()
            .mockReturnValue({ from: jest.fn().mockReturnValue({ where }) }),
        },
      } as unknown as DatabaseService,
      { log: jest.fn() } as unknown as AuditService,
    );

    const result = await service.listCampaigns(
      { userId: 'admin-1', roles: ['admin'] },
      { status: 'active', page: 2, limit: 10 } as never,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 10 }),
    );
    expect(result).toEqual({
      campaigns: [],
      count: 42,
      page: 2,
      limit: 10,
      total: 42,
      totalPages: 5,
    });
  });

  it('rejects a non-teacher even when a malformed campaign names them as creator', async () => {
    const update = jest.fn();
    const service = new SystemEvaluationService(
      {
        db: {
          query: {
            systemEvaluationCampaigns: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'campaign-1',
                createdBy: 'student-1',
                classId: null,
                audienceRole: 'student',
                status: 'draft',
              }),
            },
          },
          update,
        },
      } as unknown as DatabaseService,
      { log: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.updateCampaignStatus(
        'campaign-1',
        { userId: 'student-1', roles: ['student'] },
        { status: 'active' },
      ),
    ).rejects.toEqual(
      new ForbiddenException(
        'Only teachers and admins can manage evaluation campaigns.',
      ),
    );
    expect(update).not.toHaveBeenCalled();
  });
});
