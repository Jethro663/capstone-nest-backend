import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { SystemEvaluationService } from './system-evaluation.service';

describe('SystemEvaluationService authorization parity', () => {
  it('creates a draft campaign and audit evidence without assignments', async () => {
    const created = {
      id: '11111111-1111-4111-8111-111111111111',
      createdBy: 'admin-1',
      formType: 'system',
      targetModule: 'overall',
      audienceRole: 'student',
      classId: null,
      title: 'Draft pulse',
      startsAt: new Date('2026-09-16T00:00:00.000Z'),
      endsAt: new Date('2026-09-30T00:00:00.000Z'),
      status: 'draft',
    };
    const returning = jest.fn().mockResolvedValue([created]);
    const insert = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({ returning }),
    });
    const tx = { insert };
    const transaction = jest.fn((work: (database: typeof tx) => unknown) =>
      work(tx),
    );
    const auditLog = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const service = new SystemEvaluationService(
      { db: { transaction } } as unknown as DatabaseService,
      { log: auditLog } as unknown as AuditService,
    );

    const result = await service.createCampaign(
      { userId: 'admin-1', roles: ['admin'] },
      {
        formType: 'system',
        audienceRole: 'student',
        title: 'Draft pulse',
        startsAt: '2026-09-16T00:00:00.000Z',
        endsAt: '2026-09-30T00:00:00.000Z',
        status: 'draft',
      },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lxp.system_evaluation_campaign.created',
        metadata: expect.objectContaining({ assignmentCount: 0 }),
      }),
      tx,
    );
    expect(result).toEqual({ ...created, assignmentCount: 0 });
  });

  it('rejects an invalid date range before starting a transaction', async () => {
    const transaction = jest.fn();
    const service = new SystemEvaluationService(
      { db: { transaction } } as unknown as DatabaseService,
      { log: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.createCampaign(
        { userId: 'admin-1', roles: ['admin'] },
        {
          formType: 'system',
          audienceRole: 'student',
          title: 'Invalid pulse',
          startsAt: '2026-09-30T00:00:00.000Z',
          endsAt: '2026-09-16T00:00:00.000Z',
          status: 'active',
        },
      ),
    ).rejects.toEqual(
      new BadRequestException('Campaign end date must be after start date.'),
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('creates an active campaign, assignments, and audit evidence in one transaction', async () => {
    const created = {
      id: '11111111-1111-4111-8111-111111111111',
      createdBy: 'admin-1',
      formType: 'system',
      targetModule: 'overall',
      audienceRole: 'student',
      classId: null,
      title: 'System pulse',
      startsAt: new Date('2026-09-16T00:00:00.000Z'),
      endsAt: new Date('2026-09-30T00:00:00.000Z'),
      status: 'active',
    };
    const campaignReturning = jest.fn().mockResolvedValue([created]);
    const assignmentInsert = jest.fn().mockResolvedValue(undefined);
    const insert = jest
      .fn()
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({ returning: campaignReturning }),
      })
      .mockReturnValueOnce({
        values: jest
          .fn()
          .mockReturnValue({ onConflictDoNothing: assignmentInsert }),
      });
    const where = jest.fn().mockResolvedValue([{ userId: 'student-1' }]);
    const select = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({ where }),
        }),
      }),
    });
    const tx = { insert, select };
    const transaction = jest.fn((work: (database: typeof tx) => unknown) =>
      work(tx),
    );
    const auditLog = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const service = new SystemEvaluationService(
      { db: { ...tx, transaction } } as unknown as DatabaseService,
      { log: auditLog } as unknown as AuditService,
    );

    const result = await service.createCampaign(
      { userId: 'admin-1', roles: ['admin'] },
      {
        formType: 'system',
        audienceRole: 'student',
        title: 'System pulse',
        startsAt: '2026-09-16T00:00:00.000Z',
        endsAt: '2026-09-30T00:00:00.000Z',
        status: 'active',
      },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lxp.system_evaluation_campaign.created',
        targetId: created.id,
      }),
      tx,
    );
    expect(campaignReturning.mock.invocationCallOrder[0]).toBeLessThan(
      assignmentInsert.mock.invocationCallOrder[0],
    );
    expect(assignmentInsert.mock.invocationCallOrder[0]).toBeLessThan(
      auditLog.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({ ...created, assignmentCount: 1 });
  });

  it('activates a campaign, creates assignments, and audits through one transaction', async () => {
    const updated = {
      id: '11111111-1111-4111-8111-111111111111',
      createdBy: 'admin-1',
      audienceRole: 'teacher',
      classId: null,
      status: 'active',
    };
    const updateReturning = jest.fn().mockResolvedValue([updated]);
    const assignmentInsert = jest.fn().mockResolvedValue(undefined);
    const tx = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({ returning: updateReturning }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ userId: 'teacher-1' }]),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest
          .fn()
          .mockReturnValue({ onConflictDoNothing: assignmentInsert }),
      }),
    };
    const transaction = jest.fn((work: (database: typeof tx) => unknown) =>
      work(tx),
    );
    const auditLog = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const service = new SystemEvaluationService(
      {
        db: {
          query: {
            systemEvaluationCampaigns: {
              findFirst: jest.fn().mockResolvedValue({
                ...updated,
                status: 'draft',
              }),
            },
          },
          transaction,
        },
      } as unknown as DatabaseService,
      { log: auditLog } as unknown as AuditService,
    );

    const result = await service.updateCampaignStatus(
      updated.id,
      { userId: 'admin-1', roles: ['admin'] },
      { status: 'active' },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lxp.system_evaluation_campaign.status_updated',
        targetId: updated.id,
      }),
      tx,
    );
    expect(updateReturning.mock.invocationCallOrder[0]).toBeLessThan(
      assignmentInsert.mock.invocationCallOrder[0],
    );
    expect(assignmentInsert.mock.invocationCallOrder[0]).toBeLessThan(
      auditLog.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({ ...updated, assignmentCount: 1 });
  });

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
