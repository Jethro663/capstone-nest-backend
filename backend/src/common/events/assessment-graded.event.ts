/**
 * Fired after a teacher grades/returns an assessment attempt.
 * For future use: could trigger notifications, LXP eligibility checks, etc.
 */
export class AssessmentGradedEvent {
  static readonly eventName = 'assessment.graded' as const;

  readonly attemptId: string;
  readonly studentId: string;
  readonly assessmentId: string;
  readonly score: number;
  readonly classId: string;

  constructor(payload: {
    attemptId: string;
    studentId: string;
    assessmentId: string;
    score: number;
    classId: string;
  }) {
    this.attemptId = payload.attemptId;
    this.studentId = payload.studentId;
    this.assessmentId = payload.assessmentId;
    this.score = payload.score;
    this.classId = payload.classId;
  }
}
