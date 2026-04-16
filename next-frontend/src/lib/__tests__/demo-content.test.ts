import { demoSubjects } from '@/lib/demo-content';

describe('demo-content', () => {
  it('ships exactly two fixed subject tracks for demo', () => {
    expect(demoSubjects.map((subject) => subject.id)).toEqual(['english', 'science']);
  });

  it('keeps per-subject module and exam structure aligned with requirements', () => {
    for (const subject of demoSubjects) {
      expect(subject.modules).toHaveLength(3);
      expect(subject.quarterExam.questions).toHaveLength(15);

      for (const moduleEntry of subject.modules) {
        expect(moduleEntry.lessons).toHaveLength(3);
        expect(moduleEntry.assessment.questions).toHaveLength(5);
      }
    }
  });

  it('ensures quarter exam uses distinct question ids from module assessments', () => {
    for (const subject of demoSubjects) {
      const examIds = new Set(subject.quarterExam.questions.map((question) => question.id));
      const moduleIds = new Set(
        subject.modules.flatMap((moduleEntry) =>
          moduleEntry.assessment.questions.map((question) => question.id),
        ),
      );

      for (const id of examIds) {
        expect(moduleIds.has(id)).toBe(false);
      }
    }
  });
});

