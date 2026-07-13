import { ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { SystemEvaluationService } from './system-evaluation.service';

describe('SystemEvaluationService authorization parity', () => {
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
