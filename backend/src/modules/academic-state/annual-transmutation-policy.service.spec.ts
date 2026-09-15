import { getDefaultAcademicPolicy } from './academic-policy';
import { AnnualTransmutationPolicyService } from './annual-transmutation-policy.service';

describe('AnnualTransmutationPolicyService', () => {
  it('captures the active table only for the authoritative school year', async () => {
    const findActive = jest.fn().mockResolvedValue({
      id: 'table-1',
      title: 'Active annual table',
      updatedAt: new Date('2026-09-15T01:00:00Z'),
      bands: [
        { minInitialGrade: 0, maxInitialGrade: 87.99, transmutedGrade: 89 },
        { minInitialGrade: 88, maxInitialGrade: 100, transmutedGrade: 90 },
      ],
    });
    const service = new AnnualTransmutationPolicyService({
      db: {
        query: {
          academicSystemStates: {
            findFirst: jest.fn().mockResolvedValue({ schoolYear: '2027-2028' }),
          },
          transmutationTables: { findFirst: findActive },
        },
      },
    } as never);

    const active = await service.snapshotForPolicy(
      getDefaultAcademicPolicy('2027-2028'),
    );
    const closed = await service.snapshotForPolicy(
      getDefaultAcademicPolicy('2026-2027'),
    );

    expect(active.annualTransmutation).toMatchObject({
      tableId: 'table-1',
      title: 'Active annual table',
    });
    expect(closed.annualTransmutation).toBeUndefined();
    expect(findActive).toHaveBeenCalledTimes(1);
  });
});
