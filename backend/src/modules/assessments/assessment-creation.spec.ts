import { AssessmentsService } from './assessments.service';
import { assessmentPublicationIssues } from './assessment-readiness';
import { getDefaultAcademicPolicy } from '../academic-state/academic-policy';
import { AssessmentAccessService } from './assessment-access.service';

describe('guided assessment creation', () => {
  const complete = {
    title: 'Essay',
    type: 'quiz',
    passingScore: 60,
    questions: [
      { type: 'essay', content: 'Explain your reasoning', points: 10 },
    ],
  };
  it('requires period, category and actual placement before publication', () => {
    expect(
      assessmentPublicationIssues(complete).map((issue) => issue.field),
    ).toEqual(
      expect.arrayContaining([
        'quarter',
        'classRecordCategory',
        'classRecordItemId',
      ]),
    );
  });

  it('accepts a complete assessment with matching placement', () => {
    expect(
      assessmentPublicationIssues({
        ...complete,
        quarter: 'Q1',
        classRecordCategory: 'written_work',
        classRecordPlacement: {
          itemId: 'slot',
          gradingPeriod: 'Q1',
          category: 'written_work',
        },
      } as typeof complete),
    ).toEqual([]);
  });

  function fixture() {
    const db = {
      query: {
        classes: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'class',
            teacherId: 'teacher',
            schoolYear: '2026-2027',
            isActive: true,
          }),
        },
        academicYearPolicies: {
          findFirst: jest.fn().mockResolvedValue({
            policy: getDefaultAcademicPolicy('2026-2027'),
          }),
        },
        academicSystemStates: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ schoolYear: '2026-2027', quarter: 'Q1' }),
        },
        classRecords: { findMany: jest.fn().mockResolvedValue([]) },
      },
      insert: jest.fn(),
      update: jest.fn(),
    };
    const records = { getSlotOverview: jest.fn() };
    const service = Object.assign(Object.create(AssessmentsService.prototype), {
      databaseService: { db },
      classRecordService: records,
      assessmentAccessService: new AssessmentAccessService({ db } as never),
    }) as AssessmentsService;
    return { db, records, service };
  }

  it('returns policy periods and missing workbook context without writes', async () => {
    const { service, db, records } = fixture();
    const result = await service.getCreationContext('class', {
      userId: 'teacher',
      roles: ['teacher'],
    });
    expect(result.defaultPeriod).toBe('Q1');
    expect(result.periods).toHaveLength(4);
    expect(result.periods[0]).toMatchObject({
      key: 'Q1',
      canPrepare: true,
      canRelease: true,
      workbook: null,
    });
    expect(result.periods[1].canRelease).toBe(false);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(records.getSlotOverview).not.toHaveBeenCalled();
  });

  it('checks ownership before reading academic context', async () => {
    const { service, db } = fixture();
    await expect(
      service.getCreationContext('class', {
        userId: 'other',
        roles: ['teacher'],
      }),
    ).rejects.toThrow('own classes');
    expect(db.query.academicYearPolicies.findFirst).not.toHaveBeenCalled();
  });

  it('rejects non-authoring roles before reading class context', async () => {
    const { service, db } = fixture();
    await expect(
      service.getCreationContext('class', {
        userId: 'student',
        roles: ['student'],
      }),
    ).rejects.toThrow('Only teachers');
    expect(db.query.classes.findFirst).not.toHaveBeenCalled();
  });

  it('marks a finalized workbook unavailable for preparation', async () => {
    const { service, db, records } = fixture();
    db.query.classRecords.findMany.mockResolvedValue([
      { gradingPeriod: 'Q1', status: 'finalized' },
    ]);
    records.getSlotOverview.mockResolvedValue({
      gradingPeriod: 'Q1',
      status: 'finalized',
      categories: [],
    });
    const result = await service.getCreationContext('class', {
      userId: 'teacher',
      roles: ['teacher'],
    });
    expect(result.periods[0]).toMatchObject({
      canPrepare: false,
      canRelease: false,
    });
    expect(result.defaultPeriod).toBe('Q2');
  });
});
