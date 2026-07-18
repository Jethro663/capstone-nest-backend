import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useTeacherClassRecord } from './use-teacher-class-record';
import { classRecordService } from '@/services/class-record-service';
import { exportClassRecordTemplateWorkbook } from '@/lib/class-record-template-export';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/services/class-record-service', () => ({
  classRecordService: {
    getByClass: jest.fn(),
    getSpreadsheet: jest.fn(),
  },
}));

jest.mock('@/lib/class-record-template-export', () => ({
  exportClassRecordTemplateWorkbook: jest.fn(),
}));

jest.mock('exceljs', () => {
  class Worksheet {
    columns = [];
    addRow = jest.fn();
    mergeCells = jest.fn();
    getRow = jest.fn(() => ({}));
  }

  class Workbook {
    worksheet = new Worksheet();
    xlsx = {
      writeBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    };
    addWorksheet = jest.fn(() => this.worksheet);
  }

  return {
    __esModule: true,
    default: { Workbook },
  };
});

describe('useTeacherClassRecord loading state', () => {
  const record = {
    id: 'record-1',
    classId: 'class-1',
    gradingPeriod: 'Q1',
    status: 'draft',
  };
  const spreadsheet = {
    classRecord: record,
    header: { quarter: 'Q1' },
    categories: [],
    students: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports an initial class-record request failure', async () => {
    (classRecordService.getByClass as jest.Mock).mockRejectedValueOnce(
      new Error('records unavailable'),
    );

    const { result } = renderHook(() => useTeacherClassRecord('class-1'));

    await waitFor(() => expect(result.current.recordsStatus).toBe('error'));
    expect(result.current.classRecords).toEqual([]);
    expect(result.current.spreadsheetStatus).toBe('idle');
  });

  it('reports spreadsheet failure independently from valid records', async () => {
    (classRecordService.getByClass as jest.Mock).mockResolvedValue({ data: [record] });
    (classRecordService.getSpreadsheet as jest.Mock).mockRejectedValueOnce(
      new Error('spreadsheet unavailable'),
    );

    const { result } = renderHook(() => useTeacherClassRecord('class-1'));

    await waitFor(() => expect(result.current.recordsStatus).toBe('ready'));
    await waitFor(() => expect(result.current.spreadsheetStatus).toBe('error'));
    expect(result.current.selectedRecord?.id).toBe('record-1');
    expect(result.current.spreadsheet).toBeNull();
  });

  it('preserves the last valid records and spreadsheet after refresh fails', async () => {
    (classRecordService.getByClass as jest.Mock).mockResolvedValue({ data: [record] });
    (classRecordService.getSpreadsheet as jest.Mock).mockResolvedValue({ data: spreadsheet });

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

  it('retries the selected spreadsheet when class records refresh successfully', async () => {
    (classRecordService.getByClass as jest.Mock).mockResolvedValue({ data: [record] });
    (classRecordService.getSpreadsheet as jest.Mock)
      .mockRejectedValueOnce(new Error('spreadsheet unavailable'))
      .mockResolvedValueOnce({ data: spreadsheet });

    const { result } = renderHook(() => useTeacherClassRecord('class-1'));

    await waitFor(() => expect(result.current.spreadsheetStatus).toBe('error'));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.spreadsheetStatus).toBe('ready'));
    expect(result.current.spreadsheet).toEqual(spreadsheet);
    expect(classRecordService.getSpreadsheet).toHaveBeenCalledTimes(2);
  });
});

describe('useTeacherClassRecord export fallback', () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:class-record');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it('falls back to ExcelJS exporter when template export fails', async () => {
    (classRecordService.getByClass as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'record-1',
          classId: 'class-1',
          gradingPeriod: 'Q1',
          status: 'draft',
        },
      ],
    });
    (classRecordService.getSpreadsheet as jest.Mock).mockResolvedValue({
      data: {
        classRecord: {
          id: 'record-1',
          classId: 'class-1',
          gradingPeriod: 'Q1',
          status: 'draft',
        },
        header: {
          quarter: 'Q1',
          schoolName: 'GABHS',
          schoolYear: '2025-2026',
          teacher: 'Juan',
          subject: 'Math',
        },
        categories: [
          {
            id: 'cat-written',
            name: 'Written Works',
            weight: 30,
            items: [{ id: 'w1', title: 'WW1', hps: 20, order: 1 }],
          },
          {
            id: 'cat-performance',
            name: 'Performance Tasks',
            weight: 50,
            items: [{ id: 'p1', title: 'PT1', hps: 25, order: 1 }],
          },
          {
            id: 'cat-quarterly',
            name: 'Quarterly Assessment',
            weight: 20,
            items: [{ id: 'q1', title: 'QA1', hps: 50, order: 1 }],
          },
        ],
        students: [
          {
            studentId: 'student-1',
            firstName: 'Ana',
            lastName: 'Santos',
            categories: [
              { categoryId: 'cat-written', scores: [18], total: 18, ps: 90, ws: 27 },
              { categoryId: 'cat-performance', scores: [22], total: 22, ps: 88, ws: 44 },
              { categoryId: 'cat-quarterly', scores: [40], total: 40, ps: 80, ws: 16 },
            ],
            initialGrade: 87,
            quarterlyGrade: 88,
          },
        ],
      },
    });
    (exportClassRecordTemplateWorkbook as jest.Mock).mockRejectedValue(
      new Error('template failed'),
    );

    const { result } = renderHook(() => useTeacherClassRecord('class-1'));

    await waitFor(() => expect(result.current.selectedRecord).not.toBeNull());
    await waitFor(() => expect(result.current.spreadsheet).not.toBeNull());

    await act(async () => {
      await result.current.exportSpreadsheet();
    });

    expect(exportClassRecordTemplateWorkbook).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Workbook export downloaded');
  });
});
