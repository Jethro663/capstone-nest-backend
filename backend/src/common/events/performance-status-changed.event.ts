export class PerformanceStatusChangedEvent {
  static readonly eventName = 'performance.status.changed' as const;

  readonly classId: string;
  readonly studentId: string;
  readonly previousIsAtRisk: boolean | null;
  readonly currentIsAtRisk: boolean;
  readonly blendedScore: number | null;
  readonly thresholdApplied: number;

  constructor(payload: {
    classId: string;
    studentId: string;
    previousIsAtRisk: boolean | null;
    currentIsAtRisk: boolean;
    blendedScore: number | null;
    thresholdApplied: number;
  }) {
    this.classId = payload.classId;
    this.studentId = payload.studentId;
    this.previousIsAtRisk = payload.previousIsAtRisk;
    this.currentIsAtRisk = payload.currentIsAtRisk;
    this.blendedScore = payload.blendedScore;
    this.thresholdApplied = payload.thresholdApplied;
  }
}
