import { act, renderHook, waitFor } from '@testing-library/react';
import * as XLSX from 'xlsx';
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

jest.mock('xlsx', () => {
  const actual = jest.requireActual('xlsx');
  return {
    ...actual,
    writeFile: jest.fn(),
  };
});

describe('useTeacherClassRecord export fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to SheetJS exporter when template export fails', async () => {
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

    const aoaSpy = jest.spyOn(XLSX.utils, 'aoa_to_sheet');
    const { result } = renderHook(() => useTeacherClassRecord('class-1'));

    await waitFor(() => expect(result.current.selectedRecord).not.toBeNull());
    await waitFor(() => expect(result.current.spreadsheet).not.toBeNull());

    await act(async () => {
      await result.current.exportSpreadsheet();
    });

    expect(exportClassRecordTemplateWorkbook).toHaveBeenCalledTimes(1);
    expect(aoaSpy).toHaveBeenCalledTimes(1);
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Workbook export downloaded');
  });
});
