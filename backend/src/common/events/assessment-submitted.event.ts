/**
 * Fired when a student submits an assessment attempt.
 * Listened by: ClassRecordSyncService (auto-syncs score to gradebook)
 */
export class AssessmentSubmittedEvent {
  static readonly eventName = 'assessment.submitted' as const;

  readonly assessmentId: string;
  readonly studentId: string;
  readonly rawScore: number;
  readonly totalPoints: number;
  readonly classRecordCategory?: string;
  readonly quarter?: string;

  constructor(payload: {
    assessmentId: string;
    studentId: string;
    rawScore: number;
    totalPoints: number;
    classRecordCategory?: string;
    quarter?: string;
  }) {
    this.assessmentId = payload.assessmentId;
    this.studentId = payload.studentId;
    this.rawScore = payload.rawScore;
    this.totalPoints = payload.totalPoints;
    this.classRecordCategory = payload.classRecordCategory;
    this.quarter = payload.quarter;
  }
}
