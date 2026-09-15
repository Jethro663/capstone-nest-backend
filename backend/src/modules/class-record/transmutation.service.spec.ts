import { BadRequestException } from '@nestjs/common';
import { TransmutationService } from './transmutation.service';

describe('TransmutationService activation safeguards', () => {
  it('rejects incomplete tables before changing the active table', async () => {
    const db = { update: jest.fn() };
    const databaseService = {
      db,
      academicTransaction: (work: () => Promise<unknown>) => work(),
    };
    const service = new TransmutationService(
      databaseService as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.applyTable(
        'Incomplete table',
        undefined,
        [{ minInitialGrade: 75, maxInitialGrade: 100, transmutedGrade: 90 }],
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.update).not.toHaveBeenCalled();
  });
});
