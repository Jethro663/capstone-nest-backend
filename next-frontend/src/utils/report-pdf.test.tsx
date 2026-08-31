import type { ReactNode } from 'react';

jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: ReactNode }) => children,
  Page: ({ children }: { children: ReactNode }) => children,
  Text: ({ children }: { children: ReactNode }) => children,
  View: ({ children }: { children: ReactNode }) => children,
  StyleSheet: {
    create: <T extends object>(styles: T) => styles,
  },
  pdf: jest.fn(() => ({
    toBlob: jest.fn(),
  })),
}));

import type {
  ClassAverageReport,
  GradeDistributionReport,
  InterventionReportRow,
} from '@/types/class-record';
import type {
  AssessmentSummaryRow,
  ClassEnrollmentRow,
  InterventionParticipationRow,
  ReportQuery,
  ReportTab,
  StudentMasterListRow,
  StudentPerformanceReportRow,
  SystemUsageReport,
} from '@/types/report';
import { buildReportPdfDescriptor } from './report-pdf';

function makeBaseInput(tab: ReportTab) {
  const filters: ReportQuery = {
    classId: 'class-1',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-04',
  };

  const average: ClassAverageReport = {
    classRecordId: 'record-1',
    average: 88.5,
    count: 12,
    interventionCount: 3,
  };
  const distribution: GradeDistributionReport = {
    classRecordId: 'record-1',
    total: 12,
    distribution: {
      '90-100': 4,
      '85-89': 3,
      '80-84': 2,
      '75-79': 1,
      'Below 75': 2,
    },
  };
  const interventions: InterventionReportRow[] = [
    {
      id: 'grade-1',
      classRecordId: 'record-1',
      studentId: 'student-1',
      finalPercentage: '72.00',
      remarks: 'For Intervention',
      computedAt: '2026-05-04T08:00:00.000Z',
      student: {
        firstName: 'Luna',
        lastName: 'Reyes',
        email: 'luna@example.com',
      },
    } as InterventionReportRow,
  ];

  const studentMasterList: StudentMasterListRow[] = [
    {
      enrollmentId: 'enrollment-1',
      enrolledAt: '2026-05-01T00:00:00.000Z',
      studentId: 'student-1',
      firstName: 'Luna',
      lastName: 'Reyes',
      email: 'luna@example.com',
      lrn: '123',
      gradeLevel: '7',
      classId: 'class-1',
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      sectionId: 'section-1',
      sectionName: 'Section A',
    },
  ];

  const classEnrollment: ClassEnrollmentRow[] = [
    {
      id: 'class-1',
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      schoolYear: '2026-2027',
      section: { id: 'section-1', name: 'Section A', gradeLevel: '7' },
      teacher: {
        id: 'teacher-1',
        firstName: 'Ana',
        lastName: 'Reyes',
        email: 'ana@example.com',
      } as any,
      enrollmentCount: 32,
      students: [],
    },
  ];

  const studentPerformance: StudentPerformanceReportRow[] = [
    {
      classId: 'class-1',
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      studentId: 'student-1',
      firstName: 'Luna',
      lastName: 'Reyes',
      email: 'luna@example.com',
      assessmentAverage: 80,
      classRecordAverage: 78,
      blendedScore: 79,
      isAtRisk: false,
      thresholdApplied: 74,
      lastComputedAt: '2026-05-04T08:00:00.000Z',
    },
  ];

  const interventionParticipation: InterventionParticipationRow[] = [
    {
      caseId: 'case-1',
      classId: 'class-1',
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      sectionName: 'Section A',
      studentId: 'student-1',
      studentName: 'Luna Reyes',
      email: 'luna@example.com',
      status: 'active',
      triggerScore: 61,
      thresholdApplied: 74,
      openedAt: '2026-05-04T08:00:00.000Z',
      closedAt: null,
      assignmentCount: 2,
      completedAssignments: 1,
      completionRate: 50,
      xpTotal: 120,
      checkpointsCompleted: 1,
    },
  ];

  const assessmentSummary: AssessmentSummaryRow[] = [
    {
      id: 'assessment-1',
      title: 'Quarter Quiz',
      type: 'quiz',
      classId: 'class-1',
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      sectionName: 'Section A',
      quarter: 'Q1',
      isPublished: true,
      dueDate: '2026-05-04T08:00:00.000Z',
      totalPoints: 50,
      maxAttempts: 1,
      submittedAttempts: 20,
      uniqueStudents: 20,
      averageScore: 83,
    },
  ];

  const systemUsage: SystemUsageReport = {
    lessonCompletions: 20,
    assessmentSubmissions: 18,
    interventionOpens: 3,
    interventionClosures: 1,
    topActions: [{ action: 'login', total: 99 }],
  };

  return {
    tab,
    heading: 'Reports',
    scopeLabel: 'Admin Reports Hub',
    filters,
    classLabel: 'Mathematics (MATH-7) - Section A',
    recordLabel: 'Q1 - draft',
    data: {
      classRecord: {
        average,
        distribution,
        interventions,
      },
      studentMasterList,
      classEnrollment,
      studentPerformance,
      interventionParticipation,
      assessmentSummary,
      systemUsage,
    },
  };
}

describe('buildReportPdfDescriptor', () => {
  it.each([
    'classRecord',
    'studentMasterList',
    'classEnrollment',
    'studentPerformance',
    'interventionParticipation',
    'assessmentSummary',
    'systemUsage',
  ] as ReportTab[])('builds a descriptor for %s', (tab) => {
    const descriptor = buildReportPdfDescriptor(makeBaseInput(tab));

    expect(descriptor.title.length).toBeGreaterThan(0);
    expect(descriptor.columns.length).toBeGreaterThan(0);
    expect(descriptor.generatedLabel).toContain('Generated');
  });
});
