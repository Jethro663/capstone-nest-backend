import { toAssessmentCard, toUserProfileSummary } from '../mappers';
import type { AssessmentCard, SubjectCard } from '../types';
import type { Assessment, AssessmentAttempt } from '../../types/assessment';

const subject: SubjectCard = {
  id: 'class-1',
  name: 'Mathematics',
  emoji: '📐',
  color: '#000000',
  bgColor: '#ffffff',
  progress: 0,
  totalLessons: 0,
  completedLessons: 0,
};

const assessment = {
  id: 'assessment-1',
  classId: 'class-1',
  title: 'Ten-point quiz',
  totalPoints: 10,
  dueDate: '2026-09-05T00:00:00.000Z',
} as Assessment;

describe('assessment dashboard mappers', () => {
  it('keeps a backend percentage as a percentage instead of dividing by total points', () => {
    const card = toAssessmentCard(assessment, subject, [
      {
        id: 'attempt-1',
        assessmentId: assessment.id,
        studentId: 'student-1',
        isSubmitted: true,
        score: 50,
        scorePercent: 50,
        submittedAt: '2026-09-05T01:00:00.000Z',
      } as AssessmentAttempt,
    ]);

    expect(card.score).toBe(50);
    expect(
      toUserProfileSummary(
        null,
        null,
        [subject],
        undefined,
        [card],
        undefined,
      ).averageScore,
    ).toBe(50);
  });

  it('bounds malformed legacy dashboard percentages at full credit', () => {
    const card: AssessmentCard = {
      ...toAssessmentCard(assessment, subject, []),
      status: 'completed',
      score: 331,
    };

    expect(
      toUserProfileSummary(
        null,
        null,
        [subject],
        undefined,
        [card],
        undefined,
      ).averageScore,
    ).toBe(100);
  });
});
