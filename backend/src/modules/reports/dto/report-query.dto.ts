export type ReportExportFormat = 'csv';

export interface ReportQuery {
  classId?: string;
  sectionId?: string;
  gradingPeriod?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  studentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  export?: ReportExportFormat;
}
