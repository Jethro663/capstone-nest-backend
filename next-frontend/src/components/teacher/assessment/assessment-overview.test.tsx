import { fireEvent, render, screen } from '@testing-library/react';
import { AssessmentOverview, getAssessmentOverviewState } from './assessment-overview';
import type {
  Assessment,
  AssessmentStats,
  QuestionAnalyticsResponse,
  SubmissionsResponse,
} from '@/types/assessment';

const draftAssessment = {
  id: 'assessment-1',
  title: 'Pagsusulit sa Filipino 7',
  classId: 'class-1',
  type: 'quiz',
  totalPoints: 10,
  passingScore: 60,
  isPublished: false,
} as Assessment;

const emptySubmissions: SubmissionsResponse = {
  assessment: {
    id: draftAssessment.id,
    title: draftAssessment.title,
    type: draftAssessment.type,
    totalPoints: draftAssessment.totalPoints ?? 0,
    isPublished: false,
  },
  submissions: [
    {
      studentId: 'student-1',
      firstName: 'Ana',
      lastName: 'Cruz',
      status: 'not_started',
      attempt: null,
      attempts: [],
      totalAttempts: 0,
    },
  ],
  summary: {
    total: 6,
    notStarted: 6,
    inProgress: 0,
    turnedIn: 0,
    returned: 0,
  },
};

const emptyStats: AssessmentStats = {
  totalAttempts: 0,
  submittedAttempts: 0,
  averageScore: 0,
  highestScore: 0,
  lowestScore: 0,
  passRate: 0,
};

const emptyAnalytics: QuestionAnalyticsResponse = {
  totalResponses: 0,
  totalAttempts: 0,
  uniqueSubmitterCount: 0,
  questions: [
    {
      questionId: 'question-1',
      content: '<p>Sample question</p>',
      type: 'multiple_choice',
      points: 1,
      totalResponses: 0,
      correctCount: 0,
      correctPercent: 0,
      averagePoints: 0,
      options: [],
      textAnswers: [],
    },
  ],
};

describe('AssessmentOverview', () => {
  it('treats a draft with no submissions as no data instead of failed performance', () => {
    render(
      <AssessmentOverview
        assessment={draftAssessment}
        submissions={emptySubmissions}
        stats={emptyStats}
        analytics={emptyAnalytics}
        onOpenReview={jest.fn()}
        onOpenScores={jest.fn()}
      />,
    );

    expect(screen.getByText('Draft — students cannot see this assessment')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue setup' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/assessments/assessment-1/edit',
    );
    expect(screen.getByText('No performance data yet')).toBeInTheDocument();
    expect(screen.getByText('0 of 6')).toBeInTheDocument();
    expect(screen.queryByText('0% average score')).not.toBeInTheDocument();
    expect(screen.queryByText('0% correct')).not.toBeInTheDocument();
  });

  it('prioritizes submitted work and reveals real class insights on demand', () => {
    const onOpenReview = jest.fn();
    const publishedAssessment = { ...draftAssessment, isPublished: true };
    const activeSubmissions: SubmissionsResponse = {
      ...emptySubmissions,
      assessment: { ...emptySubmissions.assessment, isPublished: true },
      submissions: [
        {
          studentId: 'student-1',
          firstName: 'Ana',
          lastName: 'Cruz',
          status: 'turned_in',
          attempt: {
            id: 'attempt-1',
            isSubmitted: true,
            score: 72,
            attemptNumber: 1,
          },
          totalAttempts: 1,
        },
        {
          studentId: 'student-2',
          firstName: 'Ben',
          lastName: 'Santos',
          status: 'turned_in',
          attempt: {
            id: 'attempt-2',
            isSubmitted: true,
            score: 84,
            attemptNumber: 1,
          },
          totalAttempts: 1,
        },
      ],
      summary: {
        total: 6,
        notStarted: 3,
        inProgress: 1,
        turnedIn: 2,
        returned: 0,
      },
    };
    const stats: AssessmentStats = {
      ...emptyStats,
      totalAttempts: 2,
      submittedAttempts: 2,
      averageScore: 78,
      highestScore: 84,
      lowestScore: 72,
      passRate: 100,
      averageTimeSeconds: 420,
    };
    const analytics: QuestionAnalyticsResponse = {
      totalResponses: 2,
      totalAttempts: 2,
      uniqueSubmitterCount: 2,
      questions: [
        {
          questionId: 'question-1',
          content: '<p>Which answer was easiest?</p>',
          type: 'multiple_choice',
          points: 1,
          totalResponses: 2,
          correctCount: 2,
          correctPercent: 100,
          averagePoints: 1,
          options: [],
          textAnswers: [],
        },
        {
          questionId: 'question-2',
          content: '<p>Which answer needs attention?</p>',
          type: 'multiple_choice',
          points: 1,
          totalResponses: 2,
          correctCount: 1,
          correctPercent: 50,
          averagePoints: 0.5,
          options: [
            {
              optionId: 'option-1',
              text: 'First answer',
              isCorrect: true,
              selectionCount: 1,
              selectionPercent: 50,
            },
          ],
          textAnswers: [],
        },
      ],
    };

    const { rerender } = render(
      <AssessmentOverview
        assessment={publishedAssessment}
        submissions={activeSubmissions}
        stats={stats}
        analytics={analytics}
        onOpenReview={onOpenReview}
        onOpenScores={jest.fn()}
      />,
    );

    expect(screen.getByText('2 submissions need review')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review submissions' }));
    expect(onOpenReview).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2 of 6')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('7m')).toBeInTheDocument();

    const insights = screen.getByText('Question insights');
    expect(insights.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(insights);
    expect(screen.getByText('Which answer needs attention?').closest('article')).toHaveTextContent('Q2');
    expect(screen.getByText('50% correct')).toBeInTheDocument();

    rerender(
      <AssessmentOverview
        assessment={publishedAssessment}
        submissions={activeSubmissions}
        stats={null}
        analytics={analytics}
        onOpenReview={onOpenReview}
        onOpenScores={jest.fn()}
      />,
    );
    expect(screen.getByText('Performance data is temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText('Question insights')).toBeInTheDocument();
  });

  it('does not turn unavailable student activity into authoritative zero counts', () => {
    render(
      <AssessmentOverview
        assessment={{ ...draftAssessment, isPublished: true }}
        submissions={null}
        stats={null}
        analytics={null}
        onOpenReview={jest.fn()}
        onOpenScores={jest.fn()}
      />,
    );

    expect(screen.getByText('Student activity is temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText('0 of 0')).not.toBeInTheDocument();
    expect(screen.queryByText('No students are assigned to this assessment yet.')).not.toBeInTheDocument();
  });

  it('derives the released lifecycle only after submitted work is released', () => {
    expect(getAssessmentOverviewState(draftAssessment, emptySubmissions).stage).toBe('draft');
    expect(
      getAssessmentOverviewState(
        { ...draftAssessment, isPublished: true },
        { ...emptySubmissions, assessment: { ...emptySubmissions.assessment, isPublished: true } },
      ).stage,
    ).toBe('waiting');
    expect(
      getAssessmentOverviewState(
        { ...draftAssessment, isPublished: true },
        {
          ...emptySubmissions,
          summary: { total: 1, notStarted: 0, inProgress: 0, turnedIn: 0, returned: 1 },
        },
      ).stage,
    ).toBe('released');
  });
});
