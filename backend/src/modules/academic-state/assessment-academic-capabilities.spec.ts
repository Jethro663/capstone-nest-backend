import { assessmentAcademicCapabilities } from './assessment-academic-capabilities';
import { getDefaultAcademicPolicy } from './academic-policy';
const input = {
  policy: getDefaultAcademicPolicy('2026-2027'),
  schoolYear: '2026-2027',
  activeSchoolYear: '2026-2027',
  quarter: 'Q2',
  activeQuarter: 'Q1',
  classActive: true,
  published: true,
};
describe('assessment academic capabilities', () => {
  it('allows preparation but no release, grade, viewing or new work in a future period', () => {
    expect(assessmentAcademicCapabilities(input)).toMatchObject({
      canPrepare: true,
      canRelease: false,
      canStart: false,
      canView: false,
      canGrade: false,
    });
  });
  it('preserves access and completion for an attempt started before a backward correction', () => {
    expect(
      assessmentAcademicCapabilities({
        ...input,
        hasAttempt: true,
        hasOngoingAttempt: true,
      }),
    ).toMatchObject({ canView: true, canContinue: true, canStart: false });
  });
  it('makes past periods viewable and gradable without allowing a new attempt', () => {
    expect(
      assessmentAcademicCapabilities({
        ...input,
        quarter: 'Q1',
        activeQuarter: 'Q2',
      }),
    ).toMatchObject({
      canView: true,
      canContinue: false,
      canStart: false,
      canGrade: true,
    });
  });
  it('keeps invalid historical evidence viewable only to its previous participant', () => {
    const historic = {
      ...input,
      quarter: 'Q4',
      activeSchoolYear: '2027-2028',
      classActive: false,
    };
    expect(assessmentAcademicCapabilities(historic).canView).toBe(false);
    expect(
      assessmentAcademicCapabilities({ ...historic, hasAttempt: true }),
    ).toMatchObject({
      canView: true,
      canStart: false,
      canPrepare: false,
      canContinue: false,
      canGrade: false,
    });
  });
  it('makes finalized and closed-year evidence read only', () => {
    expect(
      assessmentAcademicCapabilities({
        ...input,
        quarter: 'Q1',
        workbookStatus: 'finalized',
      }),
    ).toMatchObject({
      canView: true,
      canGrade: false,
      canPrepare: false,
      canRelease: false,
      canStart: false,
    });
    expect(
      assessmentAcademicCapabilities({
        ...input,
        activeSchoolYear: '2027-2028',
      }),
    ).toMatchObject({ canView: true, canGrade: false, canPrepare: false });
  });
});
