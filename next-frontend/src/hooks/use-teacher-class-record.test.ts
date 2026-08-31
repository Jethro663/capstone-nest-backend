import { act, renderHook, waitFor } from '@testing-library/react';
import { useTeacherClassRecord } from './use-teacher-class-record';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { academicStateService } from '@/services/academic-state-service';
import { exportAcademicWorkbook } from '@/lib/academic-workbook-export';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('@/services/class-record-service', () => ({
  classRecordService: {
    getByClass: jest.fn(),
    getSpreadsheet: jest.fn(),
    readiness: jest.fn(),
    roster: jest.fn(),
    history: jest.fn(),
    annualSummary: jest.fn(),
    recordScore: jest.fn(),
  },
}));
jest.mock('@/services/class-service', () => ({
  classService: { getById: jest.fn() },
}));
jest.mock('@/services/academic-state-service', () => ({
  academicStateService: { getCurrent: jest.fn(), getPolicy: jest.fn() },
}));
jest.mock('@/lib/academic-workbook-export', () => ({
  exportAcademicWorkbook: jest.fn(),
}));
const policy = {
  id: 'deped-2026-v1',
  schoolYear: '2026-2027',
  periods: [
    { key: 'Q1', label: 'Term 1' },
    { key: 'Q2', label: 'Term 2' },
    { key: 'Q3', label: 'Term 3' },
  ],
};
const record = {
  id: 'record-1',
  classId: 'class-1',
  gradingPeriod: 'Q1',
  status: 'draft',
};
const spreadsheet = {
  classRecord: record,
  policy,
  academicCapabilities: { canGrade: true, canPrepare: true },
  header: { quarter: 'Q1' },
  categories: [],
  students: [],
};
beforeEach(() => {
  jest.clearAllMocks();
  (classService.getById as jest.Mock).mockResolvedValue({
    data: { id: 'class-1', schoolYear: '2026-2027' },
  });
  (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
    data: { schoolYear: '2026-2027', quarter: 'Q1', policy },
  });
  (classRecordService.getByClass as jest.Mock).mockResolvedValue({
    data: [record],
  });
  (classRecordService.getSpreadsheet as jest.Mock).mockResolvedValue({
    data: spreadsheet,
  });
  (classRecordService.readiness as jest.Mock).mockResolvedValue({
    data: { ready: false, blockers: [] },
  });
  (classRecordService.roster as jest.Mock).mockResolvedValue({
    data: {
      participants: [{ studentId: 'student-1', eligibility: 'eligible' }],
    },
  });
  (classRecordService.annualSummary as jest.Mock).mockResolvedValue({
    data: { policy, students: [] },
  });
});
it('reports an initial records failure without inventing periods or grades', async () => {
  (classRecordService.getByClass as jest.Mock).mockRejectedValueOnce(
    new Error('records unavailable'),
  );
  const { result } = renderHook(() => useTeacherClassRecord('class-1'));
  await waitFor(() => expect(result.current.recordsStatus).toBe('error'));
  expect(result.current.classRecords).toEqual([]);
  expect(result.current.quarters).toEqual([]);
  expect(result.current.spreadsheetStatus).toBe('idle');
});
it('reports spreadsheet failure independently from valid records', async () => {
  (classRecordService.getSpreadsheet as jest.Mock).mockRejectedValueOnce(
    new Error('sheet unavailable'),
  );
  const { result } = renderHook(() => useTeacherClassRecord('class-1'));
  await waitFor(() => expect(result.current.recordsStatus).toBe('ready'));
  await waitFor(() => expect(result.current.spreadsheetStatus).toBe('error'));
  expect(result.current.selectedRecord?.id).toBe('record-1');
  expect(result.current.spreadsheet).toBeNull();
});
it('preserves the last complete view when refresh fails', async () => {
  const { result } = renderHook(() => useTeacherClassRecord('class-1'));
  await waitFor(() => expect(result.current.spreadsheetStatus).toBe('ready'));
  (classRecordService.getByClass as jest.Mock).mockRejectedValueOnce(
    new Error('refresh unavailable'),
  );
  await act(async () => {
    await result.current.refresh();
  });
  expect(result.current.recordsStatus).toBe('error');
  expect(result.current.classRecords).toEqual([record]);
  expect(result.current.spreadsheet).toEqual(spreadsheet);
});
it('retries a failed spreadsheet after refreshing the same record', async () => {
  (classRecordService.getSpreadsheet as jest.Mock)
    .mockRejectedValueOnce(new Error('sheet unavailable'))
    .mockResolvedValueOnce({ data: spreadsheet });
  const { result } = renderHook(() => useTeacherClassRecord('class-1'));
  await waitFor(() => expect(result.current.spreadsheetStatus).toBe('error'));
  await act(async () => {
    await result.current.refresh();
  });
  await waitFor(() => expect(result.current.spreadsheetStatus).toBe('ready'));
  expect(classRecordService.getSpreadsheet).toHaveBeenCalledTimes(2);
});
it('takes period labels and score permissions from the server', async () => {
  (classRecordService.getSpreadsheet as jest.Mock).mockResolvedValue({
    data: {
      ...spreadsheet,
      academicCapabilities: { canGrade: false, canPrepare: true },
    },
  });
  const { result } = renderHook(() => useTeacherClassRecord('class-1'));
  await waitFor(() => expect(result.current.spreadsheetStatus).toBe('ready'));
  expect(result.current.quarters).toEqual(['Q1', 'Q2', 'Q3']);
  expect(result.current.periodLabel('Q2')).toBe('Term 2');
  act(() =>
    result.current.handleCellClick('item', 'student-1', null, { maxScore: 10 }),
  );
  expect(result.current.editingCell).toBeNull();
  expect(classRecordService.recordScore).not.toHaveBeenCalled();
});
it('ignores a late response from a previously selected class', async () => {
  let resolveFirst!: (value: unknown) => void;
  (classRecordService.getByClass as jest.Mock).mockImplementation(
    (id: string) =>
      id === 'class-1'
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve({
            data: [{ ...record, id: 'record-2', classId: 'class-2' }],
          }),
  );
  const { result, rerender } = renderHook(
    ({ id }) => useTeacherClassRecord(id),
    { initialProps: { id: 'class-1' } },
  );
  rerender({ id: 'class-2' });
  await waitFor(() =>
    expect(result.current.selectedRecord?.id).toBe('record-2'),
  );
  await act(async () => {
    resolveFirst({ data: [record] });
  });
  expect(result.current.selectedRecord?.id).toBe('record-2');
});
it('exports authoritative annual evidence and does not fall back to an incomplete workbook', async () => {
  const { result } = renderHook(() => useTeacherClassRecord('class-1'));
  await waitFor(() => expect(result.current.spreadsheetStatus).toBe('ready'));
  await act(async () => {
    await result.current.exportSpreadsheet();
  });
  expect(exportAcademicWorkbook).toHaveBeenCalledWith(spreadsheet, {
    policy,
    students: [],
  });
  (exportAcademicWorkbook as jest.Mock).mockClear();
  (classRecordService.annualSummary as jest.Mock).mockRejectedValueOnce(
    new Error('annual unavailable'),
  );
  await act(async () => {
    await result.current.exportSpreadsheet();
  });
  expect(exportAcademicWorkbook).not.toHaveBeenCalled();
});
