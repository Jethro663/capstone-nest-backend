import { render, screen } from '@testing-library/react';
import type { HTMLAttributes } from 'react';
import { TeacherClassRecordWorkbook } from './TeacherClassRecordWorkbook';
import type { TeacherClassRecordState } from '@/hooks/use-teacher-class-record';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

function createState(): TeacherClassRecordState {
  return {
    classRecords: [
      {
        id: 'record-1',
        classId: 'class-1',
        gradingPeriod: 'Q1',
        status: 'draft',
      },
    ],
    selectedRecord: {
      id: 'record-1',
      classId: 'class-1',
      gradingPeriod: 'Q1',
      status: 'draft',
    },
    spreadsheet: {
      classRecord: {
        id: 'record-1',
        classId: 'class-1',
        gradingPeriod: 'Q1',
        status: 'draft',
      },
      header: {
        schoolName: 'Gat Andres Bonifacio High School',
        schoolYear: '2025-2026',
        quarter: 'Q1',
        gradeLevel: '7',
        section: 'Sampaguita',
        teacher: 'Dela Cruz, Juan',
        subject: 'Mathematics 7',
        subjectCode: 'MATH-7',
        workbookTitle: 'Class Record',
        workbookSubtitle: '(Pursuant to DepEd Order 8, s. 2015)',
        templateLabel: 'DepEd Mathematics',
        workbookSheetName: 'MATH',
      },
      categories: [
        {
          id: 'cat-1',
          name: 'Written Works',
          weight: 40,
          totalHps: 20,
          items: [
            {
              id: 'item-1',
              title: 'WW1',
              hps: 20,
              order: 1,
            },
          ],
        },
        {
          id: 'cat-2',
          name: 'Performance Tasks',
          weight: 40,
          totalHps: 30,
          items: [
            {
              id: 'item-2',
              title: 'PT1',
              hps: 30,
              order: 1,
            },
          ],
        },
        {
          id: 'cat-3',
          name: 'Quarterly Assessment',
          weight: 20,
          totalHps: 50,
          items: [
            {
              id: 'item-3',
              title: 'QA1',
              hps: 50,
              order: 1,
            },
          ],
        },
      ],
      students: [
        {
          studentId: 'student-1',
          firstName: 'Ana',
          lastName: 'Santos',
          lrn: '123456789012',
          categories: [
            {
              categoryId: 'cat-1',
              scores: [18],
              total: 18,
              ps: 90,
              ws: 36,
            },
            {
              categoryId: 'cat-2',
              scores: [27],
              total: 27,
              ps: 90,
              ws: 36,
            },
            {
              categoryId: 'cat-3',
              scores: [45],
              total: 45,
              ps: 90,
              ws: 18,
            },
          ],
          initialGrade: 88,
          quarterlyGrade: 95,
          gender: 'female',
          remarks: 'Passed',
        },
      ],
    },
    quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
    generating: false,
    finalizing: false,
    reopening: false,
    syncingItemId: null,
    editingCell: null,
    editValue: '',
    editRef: { current: null },
    setSelectedRecordId: jest.fn(),
    setEditValue: jest.fn(),
    setEditingCell: jest.fn(),
    refresh: jest.fn().mockResolvedValue(undefined),
    generateQuarter: jest.fn().mockResolvedValue(undefined),
    finalizeQuarter: jest.fn().mockResolvedValue(undefined),
    reopenQuarter: jest.fn().mockResolvedValue(undefined),
    handleCellClick: jest.fn(),
    handleCellSave: jest.fn().mockResolvedValue(undefined),
    handleCellKeyDown: jest.fn(),
    syncItem: jest.fn().mockResolvedValue(undefined),
    exportSpreadsheet: jest.fn().mockResolvedValue(undefined),
  };
}

describe('TeacherClassRecordWorkbook', () => {
  it('renders the workbook-style class record summary and learner grid', () => {
    render(<TeacherClassRecordWorkbook state={createState()} />);

    expect(screen.getByText('Mathematics 7')).toBeInTheDocument();
    expect(screen.getByText('MATH')).toBeInTheDocument();
    expect(screen.getByText("LEARNERS' NAMES")).toBeInTheDocument();
    expect(screen.getByText('Santos, Ana')).toBeInTheDocument();
    expect(screen.getByText('Finalize Quarter')).toBeInTheDocument();
  });
});
