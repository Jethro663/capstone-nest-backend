import { normalizeAiAssessmentSettings } from './assessment-settings';

describe('AI assessment settings normalization', () => {
  it('preserves every explicit delivery and academic setting', () => {
    const assessmentSettings = {
      title: 'Exam',
      type: 'exam',
      quarter: 'Q2',
      description: '<p>Instructions</p>',
      classRecordCategory: 'written_work',
      passingScore: 75,
      feedbackLevel: 'detailed',
      feedbackDelayHours: 2,
      maxAttempts: 3,
      timeLimitMinutes: 45,
      timedQuestionsEnabled: true,
      questionTimeLimitSeconds: 40,
      randomizeQuestions: true,
      strictMode: true,
      closeWhenDue: false,
      dueDate: '2026-09-15T04:00:00.000Z',
    };
    expect(normalizeAiAssessmentSettings({ assessmentSettings })).toEqual(
      assessmentSettings,
    );
  });
  it('rejects contradictory legacy and nested settings', () => {
    expect(() =>
      normalizeAiAssessmentSettings({
        passingScore: 60,
        assessmentSettings: { passingScore: 75 },
      }),
    ).toThrow('Conflicting');
  });
  it('normalizes old requests without inventing a grading period', () => {
    expect(
      normalizeAiAssessmentSettings({
        title: 'Legacy',
        assessmentType: 'assignment',
      }),
    ).toMatchObject({
      title: 'Legacy',
      type: 'assignment',
      passingScore: 60,
      maxAttempts: 1,
    });
    expect(normalizeAiAssessmentSettings({}).quarter).toBeUndefined();
  });
  it('rejects AI file-upload generation and malformed settings', () => {
    expect(() =>
      normalizeAiAssessmentSettings({
        assessmentSettings: { type: 'file_upload' },
      }),
    ).toThrow();
    expect(() =>
      normalizeAiAssessmentSettings({ assessmentSettings: { maxAttempts: 0 } }),
    ).toThrow();
  });
});
