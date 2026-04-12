'use client';

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { classRecordService } from '@/services/class-record-service';
import { exportClassRecordTemplateWorkbook } from '@/lib/class-record-template-export';
import type {
  ClassRecord,
  SpreadsheetData,
} from '@/types/class-record';
import type { GradingPeriod } from '@/utils/constants';

const QUARTERS: GradingPeriod[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || fallback
  );
}

function downloadBrowserWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename);
}

function getWorkbookSheetName(spreadsheet: SpreadsheetData, selectedRecord: ClassRecord) {
  const explicitName = spreadsheet.header.workbookSheetName?.trim();
  if (explicitName) return explicitName;

  const subjectCode = spreadsheet.header.subjectCode?.trim();
  if (subjectCode) {
    return subjectCode.split('-')[0];
  }

  const subject = spreadsheet.header.subject?.trim();
  if (subject) {
    return subject
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(' ')
      .slice(0, 31);
  }

  return selectedRecord.gradingPeriod;
}

function getWorkbookTitle(spreadsheet: SpreadsheetData) {
  return spreadsheet.header.workbookTitle || 'Class Record';
}

function getWorkbookSubtitle(spreadsheet: SpreadsheetData) {
  return (
    spreadsheet.header.workbookSubtitle ||
    '(Pursuant to DepEd Order 8 series of 2015)'
  );
}

function getQuarterTitle(quarter: string) {
  const titles: Record<string, string> = {
    Q1: 'FIRST QUARTER',
    Q2: 'SECOND QUARTER',
    Q3: 'THIRD QUARTER',
    Q4: 'FOURTH QUARTER',
  };

  return titles[quarter] ?? quarter;
}

function getCategoryByName(spreadsheet: SpreadsheetData, token: string) {
  return spreadsheet.categories.find((category) =>
    category.name.toLowerCase().includes(token),
  );
}

function getCategoryTotalHps(category: SpreadsheetData['categories'][number] | undefined) {
  if (!category) return '';
  return (
    category.totalHps ??
    category.items.reduce((sum, item) => sum + (item.hps || 0), 0)
  );
}

function exportWorkbook(
  spreadsheet: SpreadsheetData,
  selectedRecord: ClassRecord,
) {
  const sheetName = getWorkbookSheetName(spreadsheet, selectedRecord);
  const workbookTitle = getWorkbookTitle(spreadsheet);
  const workbookSubtitle = getWorkbookSubtitle(spreadsheet);
  const rows: (string | number)[][] = Array.from({ length: 10 }, () =>
    Array.from({ length: 36 }, () => ''),
  );

  rows[0][0] = workbookTitle;
  rows[2][0] = workbookSubtitle;
  rows[3][2] = 'REGION';
  rows[3][6] = spreadsheet.header.region || '';
  rows[3][11] = 'DIVISION';
  rows[3][14] = spreadsheet.header.division || '';
  rows[3][19] = 'DISTRICT';
  rows[3][23] = spreadsheet.header.district || '';
  rows[4][1] = 'SCHOOL NAME';
  rows[4][6] = spreadsheet.header.schoolName || 'Gat Andres Bonifacio High School';
  rows[4][19] = 'SCHOOL ID';
  rows[4][23] = spreadsheet.header.schoolId || '';
  rows[4][29] = 'SCHOOL YEAR';
  rows[4][32] = spreadsheet.header.schoolYear || '';
  rows[6][0] = getQuarterTitle(spreadsheet.header.quarter);
  rows[6][5] = 'GRADE & SECTION:';
  rows[6][10] = `${spreadsheet.header.gradeLevel ? `GRADE ${spreadsheet.header.gradeLevel}` : ''}${spreadsheet.header.section ? ` - ${spreadsheet.header.section}` : ''}`;
  rows[6][16] = 'TEACHER:';
  rows[6][18] = spreadsheet.header.teacher || '';
  rows[6][28] = 'SUBJECT:';
  rows[6][32] = spreadsheet.header.subject || '';
  rows[7][1] = "LEARNERS' NAMES";

  const writtenCategory = getCategoryByName(spreadsheet, 'written');
  const performanceCategory = getCategoryByName(spreadsheet, 'performance');
  const quarterlyCategory = getCategoryByName(spreadsheet, 'quarterly');

  rows[7][5] = `${(writtenCategory?.name || 'WRITTEN WORKS').toUpperCase()} (${Math.round(writtenCategory?.weight || 0)}%)`;
  rows[7][18] = `${(performanceCategory?.name || 'PERFORMANCE TASKS').toUpperCase()} (${Math.round(performanceCategory?.weight || 0)}%)`;
  rows[7][31] = `${(quarterlyCategory?.name || 'QUARTERLY ASSESSMENT').toUpperCase()} (${Math.round(quarterlyCategory?.weight || 0)}%)`;
  rows[7][34] = 'Initial';
  rows[7][35] = 'Quarterly';

  for (let index = 0; index < 10; index++) {
    rows[8][5 + index] = index + 1;
    rows[8][18 + index] = index + 1;
  }
  rows[8][15] = 'Total';
  rows[8][16] = 'PS';
  rows[8][17] = 'WS';
  rows[8][28] = 'Total';
  rows[8][29] = 'PS';
  rows[8][30] = 'WS';
  rows[8][31] = 1;
  rows[8][32] = 'PS';
  rows[8][33] = 'WS';

  rows[9][1] = 'HIGHEST POSSIBLE SCORE';
  Array.from({ length: 10 }).forEach((_, index) => {
    rows[9][5 + index] = writtenCategory?.items[index]?.hps ?? '';
    rows[9][18 + index] = performanceCategory?.items[index]?.hps ?? '';
  });
  rows[9][15] = getCategoryTotalHps(writtenCategory);
  rows[9][16] = 100;
  rows[9][17] = writtenCategory ? Number((writtenCategory.weight / 100).toFixed(1)) : '';
  rows[9][28] = getCategoryTotalHps(performanceCategory);
  rows[9][29] = 100;
  rows[9][30] = performanceCategory ? Number((performanceCategory.weight / 100).toFixed(1)) : '';
  rows[9][31] = quarterlyCategory?.items[0]?.hps ?? '';
  rows[9][32] = 100;
  rows[9][33] = quarterlyCategory ? Number((quarterlyCategory.weight / 100).toFixed(1)) : '';

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 35 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 35 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 9 } },
    { s: { r: 3, c: 11 }, e: { r: 3, c: 13 } },
    { s: { r: 3, c: 14 }, e: { r: 3, c: 17 } },
    { s: { r: 3, c: 19 }, e: { r: 3, c: 22 } },
    { s: { r: 3, c: 23 }, e: { r: 3, c: 27 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 5 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 17 } },
    { s: { r: 4, c: 19 }, e: { r: 4, c: 22 } },
    { s: { r: 4, c: 23 }, e: { r: 4, c: 28 } },
    { s: { r: 4, c: 29 }, e: { r: 4, c: 31 } },
    { s: { r: 4, c: 32 }, e: { r: 4, c: 34 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },
    { s: { r: 6, c: 5 }, e: { r: 6, c: 9 } },
    { s: { r: 6, c: 10 }, e: { r: 6, c: 15 } },
    { s: { r: 6, c: 16 }, e: { r: 6, c: 17 } },
    { s: { r: 6, c: 18 }, e: { r: 6, c: 27 } },
    { s: { r: 6, c: 28 }, e: { r: 6, c: 31 } },
    { s: { r: 6, c: 32 }, e: { r: 6, c: 35 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 4 } },
    { s: { r: 7, c: 5 }, e: { r: 7, c: 17 } },
    { s: { r: 7, c: 18 }, e: { r: 7, c: 30 } },
    { s: { r: 7, c: 31 }, e: { r: 7, c: 33 } },
    { s: { r: 8, c: 34 }, e: { r: 9, c: 34 } },
    { s: { r: 8, c: 35 }, e: { r: 9, c: 35 } },
    { s: { r: 9, c: 1 }, e: { r: 9, c: 4 } },
  ];

  const genderGroups = [
    {
      label: 'MALE',
      students: spreadsheet.students.filter((student) =>
        ['male', 'm'].includes((student.gender || '').toLowerCase()),
      ),
    },
    {
      label: 'FEMALE',
      students: spreadsheet.students.filter((student) =>
        ['female', 'f'].includes((student.gender || '').toLowerCase()),
      ),
    },
    {
      label: 'UNSPECIFIED',
      students: spreadsheet.students.filter(
        (student) =>
          !['male', 'm', 'female', 'f'].includes((student.gender || '').toLowerCase()),
      ),
    },
  ].filter((group) => group.students.length > 0);

  let rowIndex = rows.length;
  let studentCounter = 1;

  genderGroups.forEach((group) => {
    const groupRow = Array.from({ length: 36 }, () => '') as (string | number)[];
    groupRow[1] = group.label;
    rows.push(groupRow);
    merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 4 } });
    rowIndex += 1;

    group.students.forEach((student) => {
      const row = Array.from({ length: 36 }, () => '') as (string | number)[];
      row[0] = studentCounter++;
      row[1] = `${student.lastName}, ${student.firstName}${student.middleName ? `, ${student.middleName.charAt(0)}.` : ''}`;

      const writtenData = student.categories.find(
        (category) => category.categoryId === writtenCategory?.id,
      );
      const performanceData = student.categories.find(
        (category) => category.categoryId === performanceCategory?.id,
      );
      const quarterlyData = student.categories.find(
        (category) => category.categoryId === quarterlyCategory?.id,
      );

      Array.from({ length: 10 }).forEach((_, index) => {
        row[5 + index] = writtenData?.scores[index] ?? '';
        row[18 + index] = performanceData?.scores[index] ?? '';
      });

      row[15] = writtenData?.total ?? '';
      row[16] = writtenData ? Number(writtenData.ps.toFixed(2)) : '';
      row[17] = writtenData ? Number(writtenData.ws.toFixed(2)) : '';
      row[28] = performanceData?.total ?? '';
      row[29] = performanceData ? Number(performanceData.ps.toFixed(2)) : '';
      row[30] = performanceData ? Number(performanceData.ws.toFixed(2)) : '';
      row[31] = quarterlyData?.scores[0] ?? '';
      row[32] = quarterlyData ? Number(quarterlyData.ps.toFixed(2)) : '';
      row[33] = quarterlyData ? Number(quarterlyData.ws.toFixed(2)) : '';
      row[34] = Number(student.initialGrade.toFixed(2));
      row[35] = student.quarterlyGrade;

      rows.push(row);
      merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 4 } });
      rowIndex += 1;
    });
  });

  if (genderGroups.length === 0) {
    spreadsheet.students.forEach((student, index) => {
      const row = Array.from({ length: 36 }, () => '') as (string | number)[];
      row[0] = index + 1;
      row[1] = `${student.lastName}, ${student.firstName}${student.middleName ? `, ${student.middleName.charAt(0)}.` : ''}`;
      rows.push(row);
      merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 4 } });
      rowIndex += 1;
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = [
    { wch: 4.14 },
    { wch: 7 },
    { wch: 7 },
    { wch: 7 },
    { wch: 7 },
    ...Array.from({ length: 10 }, () => ({ wch: 4.43 })),
    { wch: 6.29 },
    { wch: 7.14 },
    { wch: 7.14 },
    ...Array.from({ length: 10 }, () => ({ wch: 4.43 })),
    { wch: 6.29 },
    { wch: 7.14 },
    { wch: 7.14 },
    { wch: 6.29 },
    { wch: 7.14 },
    { wch: 7.14 },
    { wch: 10.29 },
    { wch: 10.29 },
  ];
  worksheet['!rows'] = [
    { hpt: 15 },
    { hpt: 15 },
    { hpt: 15 },
    { hpt: 21 },
    { hpt: 21.75 },
    { hpt: 15.75 },
    { hpt: 23.25 },
    { hpt: 32 },
    { hpt: 18 },
    { hpt: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  downloadBrowserWorkbook(
    workbook,
    `class-record-${selectedRecord.gradingPeriod}-${selectedRecord.classId}.xlsx`,
  );
}

export interface TeacherClassRecordState {
  classRecords: ClassRecord[];
  selectedRecord: ClassRecord | null;
  spreadsheet: SpreadsheetData | null;
  quarters: GradingPeriod[];
  generating: boolean;
  finalizing: boolean;
  reopening: boolean;
  syncingItemId: string | null;
  editingCell: { itemId: string; studentId: string } | null;
  editValue: string;
  editingHpsItemId: string | null;
  hpsValue: string;
  editRef: RefObject<HTMLInputElement | null>;
  hpsEditRef: RefObject<HTMLInputElement | null>;
  setSelectedRecordId: (id: string) => void;
  setEditValue: (value: string) => void;
  setHpsValue: (value: string) => void;
  setEditingCell: (value: { itemId: string; studentId: string } | null) => void;
  refresh: () => Promise<void>;
  generateQuarter: (quarter: GradingPeriod) => Promise<void>;
  finalizeQuarter: () => Promise<void>;
  reopenQuarter: () => Promise<void>;
  handleCellClick: (
    itemId: string,
    studentId: string,
    currentScore: number | null,
    options?: { maxScore?: number | null; assessmentId?: string },
  ) => void;
  handleCellSave: () => Promise<void>;
  handleCellKeyDown: (e: ReactKeyboardEvent) => void;
  handleHpsClick: (
    itemId: string,
    currentHps: number | null,
    assessmentId?: string,
  ) => void;
  handleHpsSave: () => Promise<void>;
  handleHpsKeyDown: (e: ReactKeyboardEvent) => void;
  syncItem: (itemId: string) => Promise<void>;
  exportSpreadsheet: () => Promise<void>;
}

export function useTeacherClassRecord(classId?: string): TeacherClassRecordState {
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ itemId: string; studentId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingHpsItemId, setEditingHpsItemId] = useState<string | null>(null);
  const [hpsValue, setHpsValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const hpsEditRef = useRef<HTMLInputElement>(null);

  const selectedRecord = useMemo(
    () => classRecords.find((record) => record.id === selectedRecordId) ?? null,
    [classRecords, selectedRecordId],
  );

  const refresh = useCallback(async () => {
    if (!classId) {
      setClassRecords([]);
      setSelectedRecordId(null);
      setSpreadsheet(null);
      return;
    }

    try {
      const res = await classRecordService.getByClass(classId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      setSelectedRecordId((current) => {
        if (records.length === 0) return null;
        return records.some((record) => record.id === current)
          ? current
          : records[0].id;
      });
      if (records.length === 0) {
        setSpreadsheet(null);
      }
    } catch {
      toast.error('Failed to load class records');
    }
  }, [classId]);

  useEffect(() => {
    setEditingCell(null);
    setEditValue('');
    setEditingHpsItemId(null);
    setHpsValue('');
    void refresh();
  }, [refresh]);

  const reloadSelectedSpreadsheet = useCallback(async () => {
    if (!selectedRecordId) {
      setSpreadsheet(null);
      return;
    }

    try {
      const res = await classRecordService.getSpreadsheet(selectedRecordId);
      setSpreadsheet(res.data);
    } catch {
      toast.error('Failed to load spreadsheet');
      setSpreadsheet(null);
    }
  }, [selectedRecordId]);

  useEffect(() => {
    void reloadSelectedSpreadsheet();
  }, [reloadSelectedSpreadsheet]);

  const generateQuarter = useCallback(
    async (quarter: GradingPeriod) => {
      if (!classId) return;

      try {
        setGenerating(true);
        await classRecordService.generate({ classId, gradingPeriod: quarter });
        toast.success(`Class record for ${quarter} generated`);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          toast.info(`${quarter} record already exists - loading it now`);
        } else {
          toast.error(getErrorMessage(error, 'Failed to generate class record'));
          return;
        }
      } finally {
        setGenerating(false);
      }

      try {
        const refreshed = await classRecordService.getByClass(classId);
        const records = Array.isArray(refreshed.data) ? refreshed.data : [];
        setClassRecords(records);
        const target = records.find((record) => record.gradingPeriod === quarter);
        setSelectedRecordId(target?.id ?? records[0]?.id ?? null);
        if (!target && records.length === 0) {
          setSpreadsheet(null);
        }
      } catch {
        toast.error('Failed to reload class records');
      }
    },
    [classId],
  );

  const finalizeQuarter = useCallback(async () => {
    if (!selectedRecord) return;

    try {
      setFinalizing(true);
      await classRecordService.finalize(selectedRecord.id);
      toast.success('Quarter finalized');
      await refresh();
    } catch {
      toast.error('Failed to finalize class record');
    } finally {
      setFinalizing(false);
    }
  }, [refresh, selectedRecord]);

  const reopenQuarter = useCallback(async () => {
    if (!selectedRecord) return;

    try {
      setReopening(true);
      await classRecordService.reopen(selectedRecord.id);
      toast.success('Quarter reopened for editing');
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reopen class record'));
    } finally {
      setReopening(false);
    }
  }, [refresh, selectedRecord]);

  const handleCellClick = useCallback(
    (
      itemId: string,
      studentId: string,
      currentScore: number | null,
      options?: { maxScore?: number | null; assessmentId?: string },
    ) => {
      if (selectedRecord?.status !== 'draft') return;
      if (options?.assessmentId) {
        toast.info('Linked assessment slots must be edited from assessment settings');
        return;
      }
      if ((options?.maxScore ?? 0) <= 0) {
        toast.error('Set highest possible score first');
        return;
      }

      setEditingHpsItemId(null);
      setHpsValue('');
      setEditingCell({ itemId, studentId });
      setEditValue(currentScore != null ? String(currentScore) : '');
      setTimeout(() => editRef.current?.focus(), 0);
    },
    [selectedRecord?.status],
  );

  const handleCellSave = useCallback(async () => {
    if (!editingCell || !selectedRecordId) return;

    const score = parseFloat(editValue);
    if (Number.isNaN(score) || score < 0) {
      toast.error('Invalid score');
      setEditingCell(null);
      return;
    }

    try {
      await classRecordService.recordScore(editingCell.itemId, {
        studentId: editingCell.studentId,
        score,
      });
      setEditingCell(null);
      await reloadSelectedSpreadsheet();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save score'));
    }
  }, [editValue, editingCell, reloadSelectedSpreadsheet, selectedRecordId]);

  const handleCellKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === 'Enter') {
        void handleCellSave();
      }
      if (e.key === 'Escape') {
        setEditingCell(null);
      }
    },
    [handleCellSave],
  );

  const handleHpsClick = useCallback(
    (itemId: string, currentHps: number | null, assessmentId?: string) => {
      if (selectedRecord?.status !== 'draft') return;
      if (assessmentId) {
        toast.info('Linked assessment slots must be edited from assessment settings');
        return;
      }

      setEditingCell(null);
      setEditValue('');
      setEditingHpsItemId(itemId);
      setHpsValue(currentHps != null && currentHps > 0 ? String(currentHps) : '');
      setTimeout(() => hpsEditRef.current?.focus(), 0);
    },
    [selectedRecord?.status],
  );

  const handleHpsSave = useCallback(async () => {
    if (!editingHpsItemId) return;

    const maxScore = parseFloat(hpsValue);
    if (Number.isNaN(maxScore) || maxScore < 0) {
      toast.error('Invalid highest possible score');
      setEditingHpsItemId(null);
      return;
    }

    try {
      await classRecordService.updateItem(editingHpsItemId, { maxScore });
      setEditingHpsItemId(null);
      await reloadSelectedSpreadsheet();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save highest possible score'));
    }
  }, [editingHpsItemId, hpsValue, reloadSelectedSpreadsheet]);

  const handleHpsKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === 'Enter') {
        void handleHpsSave();
      }
      if (e.key === 'Escape') {
        setEditingHpsItemId(null);
      }
    },
    [handleHpsSave],
  );

  const syncItem = useCallback(
    async (itemId: string) => {
      try {
        setSyncingItemId(itemId);
        const res = await classRecordService.syncScores(itemId);
        const synced =
          typeof res.data === 'object' && res.data !== null && 'synced' in res.data
            ? Number((res.data as { synced?: number }).synced ?? 0)
            : 0;
        toast.success(`Synced ${synced} score(s) from assessment`);

        await reloadSelectedSpreadsheet();
      } catch {
        toast.error('Failed to sync scores');
      } finally {
        setSyncingItemId(null);
      }
    },
    [reloadSelectedSpreadsheet],
  );

  const exportSpreadsheet = useCallback(async () => {
    if (!selectedRecord || !spreadsheet) return;

    try {
      await exportClassRecordTemplateWorkbook(spreadsheet, selectedRecord);
      toast.success('Workbook export downloaded');
    } catch {
      try {
        exportWorkbook(spreadsheet, selectedRecord);
        toast.success('Workbook export downloaded');
      } catch (fallbackError) {
        toast.error(getErrorMessage(fallbackError, 'Failed to export workbook'));
      }
    }
  }, [selectedRecord, spreadsheet]);

  return {
    classRecords,
    selectedRecord,
    spreadsheet,
    quarters: QUARTERS,
    generating,
    finalizing,
    reopening,
    syncingItemId,
    editingCell,
    editValue,
    editingHpsItemId,
    hpsValue,
    editRef,
    hpsEditRef,
    setSelectedRecordId,
    setEditValue,
    setHpsValue,
    setEditingCell,
    refresh,
    generateQuarter,
    finalizeQuarter,
    reopenQuarter,
    handleCellClick,
    handleCellSave,
    handleCellKeyDown,
    handleHpsClick,
    handleHpsSave,
    handleHpsKeyDown,
    syncItem,
    exportSpreadsheet,
  };
}
