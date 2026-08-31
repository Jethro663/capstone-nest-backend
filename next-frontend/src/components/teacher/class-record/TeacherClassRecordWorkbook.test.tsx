import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeacherClassRecordWorkbook } from './TeacherClassRecordWorkbook';
import type { TeacherClassRecordState } from '@/hooks/use-teacher-class-record';
import { modernPolicy, openCapabilities } from '@/test/academic-fixtures';
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ role: 'teacher' }),
}));
jest.mock('./AcademicAnnualSummary', () => ({
  AcademicAnnualSummary: () => <div>Annual evidence</div>,
}));
function createState(): TeacherClassRecordState {
  const record = {
    id: 'record',
    classId: 'class',
    gradingPeriod: 'Q1' as const,
    status: 'draft' as const,
    revision: 0,
  };
  return {
    classId: 'class',
    policy: modernPolicy,
    classRecords: [record],
    selectedRecord: record,
    spreadsheet: {
      classRecord: record,
      policy: modernPolicy,
      academicCapabilities: openCapabilities,
      canReopen: false,
      header: {
        quarter: 'Q1',
        periodLabel: 'Term 1',
        subject: 'Mathematics 8',
      },
      categories: [
        {
          id: 'exam',
          name: 'Quarterly Assessment',
          weight: 30,
          items: modernPolicy.examComponents.map((c, i) => ({
            id: c.key,
            title: c.key,
            hps: 20,
            order: i + 1,
            assessmentId: c.key === 'TE' ? 'assessment' : undefined,
            examComponent: c.key,
          })),
        },
      ],
      students: [
        {
          studentId: 'ana',
          firstName: 'Ana',
          lastName: 'Santos',
          eligibility: 'eligible',
          categories: [
            {
              categoryId: 'exam',
              scores: [0, null, null],
              scoreStatuses: ['recorded', 'missing', 'excused'],
              scoreReasons: [null, null, 'Medical evidence'],
              total: null,
              ps: null,
              ws: null,
            },
          ],
          initialGrade: null,
          quarterlyGrade: null,
          provisional: true,
          remarks: 'Incomplete',
        },
      ],
    },
    readiness: {
      ready: false,
      classRecordId: 'record',
      classId: 'class',
      period: 'Q1',
      eligibleStudentIds: ['ana'],
      blockers: [
        { code: 'roster_unconfirmed', message: 'Confirm eligibility' },
      ],
      counts: {},
    },
    roster: {
      classRecordId: 'record',
      confirmedAt: null,
      confirmedBy: null,
      participants: [
        {
          studentId: 'ana',
          firstName: 'Ana',
          lastName: 'Santos',
          eligibility: 'eligible',
          reason: null,
          source: 'observed',
          currentlyEnrolled: true,
        },
      ],
    },
    history: null,
    annualSummary: null,
    recordsStatus: 'ready',
    spreadsheetStatus: 'ready',
    quarters: ['Q1', 'Q2', 'Q3'],
    periodLabel: (p) =>
      modernPolicy.periods.find((v) => v.key === p)?.label ?? p,
    generating: false,
    finalizing: false,
    reopening: false,
    savingRoster: false,
    syncingItemId: null,
    editingCell: null,
    editValue: '',
    editingHpsItemId: null,
    hpsValue: '',
    editRef: { current: null },
    hpsEditRef: { current: null },
    setSelectedRecordId: jest.fn(),
    setEditValue: jest.fn(),
    setHpsValue: jest.fn(),
    setEditingCell: jest.fn(),
    refresh: jest.fn(),
    refreshEvidence: jest.fn(),
    loadHistory: jest.fn(),
    loadAnnual: jest.fn(),
    confirmRoster: jest.fn(),
    excuseScore: jest.fn(),
    restoreAssessmentEvidence: jest.fn().mockResolvedValue(true),
    generateQuarter: jest.fn(),
    finalizeQuarter: jest.fn(),
    reopenQuarter: jest.fn().mockResolvedValue(true),
    handleCellClick: jest.fn(),
    handleCellSave: jest.fn(),
    handleCellKeyDown: jest.fn(),
    handleHpsClick: jest.fn(),
    handleHpsSave: jest.fn(),
    handleHpsKeyDown: jest.fn(),
    syncItem: jest.fn(),
    exportSpreadsheet: jest.fn(),
  };
}
it('renders all three examination components and separates zero, missing and exemptions', () => {
  render(<TeacherClassRecordWorkbook state={createState()} />);
  expect(
    screen.getByRole('button', { name: 'Ana Santos, ST1: 0' }),
  ).toBeEnabled();
  expect(
    screen.getByRole('button', { name: 'Ana Santos, ST2: Missing' }),
  ).toBeEnabled();
  expect(
    screen.getByRole('button', { name: 'Ana Santos, TE: Excused' }),
  ).toBeEnabled();
  expect(
    screen.getByRole('button', { name: 'Finalize Term 1' }),
  ).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: /Q4|Term 4/ }),
  ).not.toBeInTheDocument();
});
it('restores an exempt linked result with evidence instead of overwriting it through ordinary sync', async () => {
  const state = createState();
  render(<TeacherClassRecordWorkbook state={state} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Ana Santos, TE: Excused' }),
  );
  fireEvent.change(screen.getByLabelText('Score status'), {
    target: { value: 'recorded' },
  });
  fireEvent.change(screen.getByLabelText('Correction reason'), {
    target: { value: 'Verified submitted quiz' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Restore assessment evidence' }),
  );
  await waitFor(() =>
    expect(state.restoreAssessmentEvidence).toHaveBeenCalledWith(
      'TE',
      'ana',
      'Verified submitted quiz',
    ),
  );
  expect(state.syncItem).not.toHaveBeenCalled();
});
it('requires a reason before reopening and disables writes when evidence is stale', async () => {
  const state = createState();
  state.spreadsheet!.canReopen = true;
  render(<TeacherClassRecordWorkbook state={state} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reopen with reason' }));
  expect(
    screen.getByRole('button', {
      name: 'Reopen and invalidate dependent results',
    }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Correction reason'), {
    target: { value: 'Correct verified score' },
  });
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Reopen and invalidate dependent results',
    }),
  );
  await waitFor(() =>
    expect(state.reopenQuarter).toHaveBeenCalledWith('Correct verified score'),
  );
});
it('disables scoring and HPS mutations after a failed readiness refresh', () => {
  const state = createState();
  state.spreadsheetStatus = 'error';
  render(<TeacherClassRecordWorkbook state={state} />);
  expect(
    screen.getByRole('button', { name: 'Ana Santos, ST1: 0' }),
  ).toBeDisabled();
  for (const button of screen.getAllByRole('button', { name: '20' }))
    expect(button).toBeDisabled();
});
