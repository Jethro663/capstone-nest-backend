import { AcademicPolicyService } from './academic-policy.service';
import { getDefaultAcademicPolicy } from './academic-policy';

describe('AcademicPolicyService', () => {
  const policy = getDefaultAcademicPolicy('2026-2027');
  const make = () => {
    const db = {
      query: {
        academicYearPolicies: {
          findFirst: jest.fn().mockResolvedValue({ policy }),
        },
        academicSystemStates: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'state',
            schoolYear: '2026-2027',
            quarter: 'Q2',
            version: 4,
          }),
        },
        classes: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'class',
            schoolYear: '2026-2027',
            isActive: true,
          }),
        },
      },
    };
    return { db, service: new AcademicPolicyService({ db } as never) };
  };
  it('returns a stored policy without replacing its history', async () => {
    const { db, service } = make();
    const historic = {
      ...getDefaultAcademicPolicy('2025-2026'),
      passingGrade: 76,
    };
    db.query.academicYearPolicies.findFirst.mockResolvedValue({
      policy: historic,
    } as never);
    expect(await service.forYear('2025-2026')).toEqual(historic);
  });
  it('allows future drafts but rejects their release', async () => {
    const { service } = make();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q3' },
        'prepare',
      ),
    ).resolves.toBeDefined();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q3' },
        'release',
      ),
    ).rejects.toThrow('active period');
  });
  it('permits past viewing and grading, but not new attempts', async () => {
    const { service } = make();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q1' },
        'view',
      ),
    ).resolves.toBeDefined();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q1' },
        'grade',
      ),
    ).resolves.toBeDefined();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q1' },
        'start',
      ),
    ).rejects.toThrow('active period');
  });
  it('lets an existing attempt finish after advancement or backward activation', async () => {
    const { service } = make();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q1' },
        'complete',
        true,
      ),
    ).resolves.toBeDefined();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q3' },
        'complete',
        true,
      ),
    ).resolves.toBeDefined();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q1' },
        'complete',
        false,
      ),
    ).rejects.toThrow('active period');
  });
  it('allows modern Q4 preparation while rejecting closed-year writes and missing-period release', async () => {
    const { service, db } = make();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q4' },
        'prepare',
      ),
    ).resolves.toBeDefined();
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: null },
        'release',
      ),
    ).rejects.toThrow('period');
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class',
      schoolYear: '2025-2026',
      isActive: false,
    });
    db.query.academicYearPolicies.findFirst.mockResolvedValue({
      policy: getDefaultAcademicPolicy('2025-2026'),
    });
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q1' },
        'complete',
        true,
      ),
    ).rejects.toThrow('school year');
    await expect(
      service.assertAssessmentAction(
        { classId: 'class', quarter: 'Q1' },
        'view',
      ),
    ).resolves.toBeDefined();
  });
});
