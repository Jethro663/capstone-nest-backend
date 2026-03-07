export type ClassRecordScoresUpdatedSource =
  | 'manual_single'
  | 'manual_bulk'
  | 'manual_sync'
  | 'assessment_sync';

export class ClassRecordScoresUpdatedEvent {
  static readonly eventName = 'class-record.scores.updated' as const;

  readonly classId: string;
  readonly studentIds: string[];
  readonly triggerSource: ClassRecordScoresUpdatedSource;

  constructor(payload: {
    classId: string;
    studentIds: string[];
    triggerSource: ClassRecordScoresUpdatedSource;
  }) {
    this.classId = payload.classId;
    this.studentIds = payload.studentIds;
    this.triggerSource = payload.triggerSource;
  }
}
