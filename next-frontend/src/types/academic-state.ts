export type AcademicQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface AcademicStateSnapshot {
  schoolYear: string;
  quarter: AcademicQuarter;
}

export interface AcademicStateCurrent extends AcademicStateSnapshot {
  updatedAt: string;
  updatedBy?: string | null;
  transitionConfirmationText: string;
}

export interface AcademicStateImpactPreview {
  current: AcademicStateSnapshot;
  target: AcademicStateSnapshot;
  impact: {
    classRecordsToFinalize: number;
    schoolEventsToArchive: number;
  };
  transitionConfirmationText: string;
}
