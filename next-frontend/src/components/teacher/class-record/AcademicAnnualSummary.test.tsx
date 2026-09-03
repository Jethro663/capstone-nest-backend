import { fireEvent, render, screen } from '@testing-library/react';
import { AcademicAnnualSummary } from './AcademicAnnualSummary';
import { modernPolicy } from '@/test/academic-fixtures';
import type { AnnualSummary } from '@/types/academic-grading';

let mockRole: 'teacher' | 'admin' = 'teacher';

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ role: mockRole }),
}));

jest.mock('@/services/academic-grading-service', () => ({
  academicGradingService: {
    externalGrade: jest.fn(),
    selectSource: jest.fn(),
    recordRemediation: jest.fn(),
  },
}));

function createSummary(): AnnualSummary {
  const components = [
    {
      period: 'Q1' as const,
      grade: 72,
      sourceType: 'period_revision' as const,
      sourceId: 'revision-q1',
      classId: 'class',
    },
  ];

  return {
    classId: 'class',
    schoolYear: modernPolicy.schoolYear,
    subjectCode: 'MATH8',
    gradeLevel: '8',
    policy: modernPolicy,
    periods: modernPolicy.periods,
    students: [
      {
        studentId: 'ana',
        firstName: 'Ana',
        lastName: 'Santos',
        components,
        candidates: [
          {
            id: 'revision-q1',
            period: 'Q1',
            grade: 72,
            sourceType: 'period_revision',
            classId: 'class',
            trusted: true,
          },
        ],
        selections: [],
        blockers: [
          {
            code: 'missing_period_grade',
            message: 'Term 2 grade evidence is missing.',
            studentId: 'ana',
            period: 'Q2',
          },
        ],
        current: {
          id: 'annual-1',
          studentId: 'ana',
          schoolYear: modernPolicy.schoolYear,
          subjectCode: 'MATH8',
          gradeLevel: '8',
          components,
          policy: modernPolicy,
          sum: 216,
          divisor: 3,
          rawAverage: '72',
          officialGrade: 72,
          remarks: 'Failed',
          isCurrent: true,
          sourceFingerprint: 'source-fingerprint',
          computedAt: '2026-08-31T00:00:00.000Z',
          invalidationReason: null,
        },
        history: [],
        remediation: [],
      },
    ],
  };
}

beforeEach(() => {
  mockRole = 'teacher';
});

it('renders policy periods, learner bands, missing evidence and intervention with visible labels', () => {
  render(
    <AcademicAnnualSummary summary={createSummary()} refresh={jest.fn()} />,
  );

  expect(screen.getByRole('columnheader', { name: 'Term 1' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Term 2' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Term 3' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: /Term 4|Q4/ })).not.toBeInTheDocument();

  expect(
    screen.getByRole('rowheader', { name: /Santos\s*, Ana/i }),
  ).toHaveAttribute('data-surname-band', 'sz');
  expect(screen.getAllByText('Missing')).toHaveLength(2);
  expect(screen.getByText('For intervention')).toHaveAttribute(
    'data-grade-status',
    'intervention',
  );
  expect(screen.getByText('Term 2 grade evidence is missing.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'External grade' })).not.toBeInTheDocument();
  expect(
    screen.getByText(/Ask an administrator to verify external grades/i),
  ).toBeInTheDocument();
});

it('keeps administrator evidence controls and their audited form intact', () => {
  mockRole = 'admin';
  render(
    <AcademicAnnualSummary summary={createSummary()} refresh={jest.fn()} />,
  );

  expect(screen.getByRole('button', { name: 'External grade' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Choose source' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Record SRC' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'External grade' }));
  expect(
    screen.getByRole('heading', { name: /Verified external period grade/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Period')).toBeInTheDocument();
  expect(screen.getByLabelText(/Official period grade/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Verified source \/ register reference/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Reason and verification notes/i)).toBeInTheDocument();
  expect(screen.getByText(/This action is audited/i)).toBeInTheDocument();
});
