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
    enrollmentsToComplete: number;
    classesToArchive: number;
    sectionsToArchive: number;
    schoolEventsToArchive: number;
    reusableSectionsToCreate: number;
    reusableClassesToCreate: number;
    promotionReadiness: {
      activeStudentsInCurrentYear: number;
      studentsMissingFinalizedGrades: number;
      transitionBlocked: boolean;
      message: string | null;
    };
  };
  transitionConfirmationText: string;
}
