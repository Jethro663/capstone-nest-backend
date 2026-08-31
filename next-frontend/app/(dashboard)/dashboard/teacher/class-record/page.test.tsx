import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClassRecordPage from './page';
import { dashboardService } from '@/services/dashboard-service';
import { useTeacherClassRecord } from '@/hooks/use-teacher-class-record';

let searchClassId: string | null = null;

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => searchClassId }),
}));

jest.mock('@/services/dashboard-service', () => ({
  dashboardService: { getTeacherClasses: jest.fn() },
}));

jest.mock('@/hooks/use-teacher-class-record', () => ({
  useTeacherClassRecord: jest.fn(),
}));

jest.mock(
  '@/components/teacher/class-record/TeacherClassRecordWorkbook',
  () => ({
    TeacherClassRecordWorkbook: () => (
      <div data-testid="class-record-workbook">Workbook table</div>
    ),
  }),
);

const mockedDashboardService = dashboardService as jest.Mocked<
  typeof dashboardService
>;
const mockedUseTeacherClassRecord =
  useTeacherClassRecord as jest.MockedFunction<typeof useTeacherClassRecord>;

const teacherClass = {
  id: 'class-1',
  subjectName: 'Mathematics',
  subjectCode: 'MATH-7',
  section: { name: 'Rizal', gradeLevel: '7' },
};

function buildHookState(overrides: Record<string, unknown> = {}) {
  return {
    classRecords: [],
    selectedRecord: null,
    spreadsheet: null,
    recordsStatus: 'ready',
    spreadsheetStatus: 'idle',
    quarters: ['Q1', 'Q2', 'Q3'],
    periodLabel: (p: string) => p,
    generating: false,
    finalizing: false,
    reopening: false,
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
    refresh: jest.fn().mockResolvedValue(undefined),
    generateQuarter: jest.fn().mockResolvedValue(undefined),
    finalizeQuarter: jest.fn().mockResolvedValue(undefined),
    reopenQuarter: jest.fn().mockResolvedValue(undefined),
    handleCellClick: jest.fn(),
    handleCellSave: jest.fn().mockResolvedValue(undefined),
    handleCellKeyDown: jest.fn(),
    handleHpsClick: jest.fn(),
    handleHpsSave: jest.fn().mockResolvedValue(undefined),
    handleHpsKeyDown: jest.fn(),
    syncItem: jest.fn().mockResolvedValue(undefined),
    exportSpreadsheet: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ReturnType<typeof useTeacherClassRecord>;
}

describe('ClassRecordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchClassId = null;
    mockedDashboardService.getTeacherClasses.mockResolvedValue({
      success: true,
      data: [teacherClass],
      count: 1,
    } as Awaited<ReturnType<typeof dashboardService.getTeacherClasses>>);
    mockedUseTeacherClassRecord.mockReturnValue(buildHookState());
  });

  it('shows a safe retryable class-list error', async () => {
    mockedDashboardService.getTeacherClasses.mockRejectedValueOnce(
      new Error('class list detail'),
    );

    render(<ClassRecordPage />);

    expect(
      await screen.findByText("Classes couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText('class list detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => {
      expect(mockedDashboardService.getTeacherClasses).toHaveBeenCalledTimes(2);
    });
  });

  it('shows a successful no-classes state', async () => {
    mockedDashboardService.getTeacherClasses.mockResolvedValueOnce({
      success: true,
      data: [],
      count: 0,
    });

    render(<ClassRecordPage />);

    expect(
      await screen.findByText('No classes assigned yet'),
    ).toBeInTheDocument();
  });

  it('shows a safe no-selection state for an unknown class', async () => {
    searchClassId = 'missing-class';

    render(<ClassRecordPage />);

    expect(
      await screen.findByText('Choose a class to open its record'),
    ).toBeInTheDocument();
  });

  it('shows a missing-record state after successful record loading', async () => {
    render(<ClassRecordPage />);

    expect(
      await screen.findByText('No class record exists for this class yet'),
    ).toBeInTheDocument();
  });

  it('renders a compact semantic toolbar directly above the workbook', async () => {
    const record = {
      id: 'record-1',
      classId: 'class-1',
      gradingPeriod: 'Q1',
      status: 'draft',
    };
    mockedUseTeacherClassRecord.mockReturnValue(
      buildHookState({
        classRecords: [record],
        selectedRecord: record,
        spreadsheet: {
          classRecord: record,
          header: { quarter: 'Q1' },
          categories: [
            { id: 'written', name: 'Written Work', weight: 30, items: [] },
          ],
          students: [],
        },
        spreadsheetStatus: 'ready',
      }),
    );

    const { container } = render(<ClassRecordPage />);

    expect(
      await screen.findByRole('heading', { name: 'Class Record' }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('.lucide-file-spreadsheet'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /class/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /class record workbook/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('class-record-workbook')).toBeInTheDocument();
  });

  it('keeps the workbook visible and retries a failed refresh', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const record = {
      id: 'record-1',
      classId: 'class-1',
      gradingPeriod: 'Q1',
      status: 'draft',
    };
    mockedUseTeacherClassRecord.mockReturnValue(
      buildHookState({
        classRecords: [record],
        selectedRecord: record,
        spreadsheet: {
          classRecord: record,
          header: { quarter: 'Q1' },
          categories: [],
          students: [],
        },
        recordsStatus: 'error',
        spreadsheetStatus: 'ready',
        refresh,
      }),
    );

    render(<ClassRecordPage />);

    expect(
      await screen.findByText('Class record refresh failed'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('class-record-workbook')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /retry class record/i }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
