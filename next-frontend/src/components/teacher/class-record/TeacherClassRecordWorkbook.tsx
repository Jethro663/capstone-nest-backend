'use client';

import { Fragment, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  ClipboardList,
  Download,
  PencilLine,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import type { SpreadsheetData, SpreadsheetStudentRow } from '@/types/class-record';
import type { TeacherClassRecordState } from '@/hooks/use-teacher-class-record';

interface TeacherClassRecordWorkbookProps {
  state: TeacherClassRecordState;
  className?: string;
  emptyMessage?: string;
}

const WORKBOOK_COLUMN_WIDTHS = [
  '4.14rem',
  '6rem',
  '6rem',
  '6rem',
  '6rem',
  ...Array.from({ length: 10 }, () => '4.43rem'),
  '6.3rem',
  '7.1rem',
  '7.1rem',
  ...Array.from({ length: 10 }, () => '4.43rem'),
  '6.3rem',
  '7.1rem',
  '7.1rem',
  '6.3rem',
  '7.1rem',
  '7.1rem',
  '10.29rem',
  '10.29rem',
];

function getQuarterTitle(quarter: string) {
  const titles: Record<string, string> = {
    Q1: 'FIRST QUARTER',
    Q2: 'SECOND QUARTER',
    Q3: 'THIRD QUARTER',
    Q4: 'FOURTH QUARTER',
  };

  return titles[quarter] ?? quarter;
}

function getWorkbookSheetName(header: SpreadsheetData['header']) {
  const explicitName = header?.workbookSheetName?.trim();
  if (explicitName) return explicitName;

  const subjectCode = header?.subjectCode?.trim();
  if (subjectCode) return subjectCode.split('-')[0];

  const subject = header?.subject?.trim();
  if (subject) {
    return subject
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(' ');
  }

  return 'WORKBOOK';
}

function getWorkbookTitle(header: SpreadsheetData['header']) {
  return header.workbookTitle || 'Class Record';
}

function getWorkbookSubtitle(header: SpreadsheetData['header']) {
  return (
    header.workbookSubtitle || '(Pursuant to DepEd Order 8 series of 2015)'
  );
}

function getWorkbookSubjectCode(header: SpreadsheetData['header']) {
  return header.subjectCode || getWorkbookSheetName(header);
}

function getCategoryTotalHps(
  category: SpreadsheetData['categories'][number] | undefined,
) {
  if (!category) return 0;
  return (
    category.totalHps ??
    category.items.reduce((sum, item) => sum + (item.hps || 0), 0)
  );
}

function getGenderGroups(students: SpreadsheetStudentRow[]) {
  const male = students.filter((student) =>
    ['male', 'm'].includes((student.gender ?? '').trim().toLowerCase()),
  );
  const female = students.filter((student) =>
    ['female', 'f'].includes((student.gender ?? '').trim().toLowerCase()),
  );
  const other = students.filter(
    (student) =>
      !['male', 'm', 'female', 'f'].includes(
        (student.gender ?? '').trim().toLowerCase(),
      ),
  );

  return [
    { label: 'MALE', students: male },
    { label: 'FEMALE', students: female },
    ...(other.length ? [{ label: 'UNSPECIFIED', students: other }] : []),
  ];
}

export function TeacherClassRecordWorkbook({
  state,
  className,
  emptyMessage = 'No class record yet. Generate a quarter to start building the workbook.',
}: TeacherClassRecordWorkbookProps) {
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const {
    classRecords,
    selectedRecord,
    spreadsheet,
    quarters,
    generating,
    finalizing,
    reopening,
    syncingItemId,
    editingCell,
    editValue,
    editRef,
    setSelectedRecordId,
    setEditValue,
    generateQuarter,
    finalizeQuarter,
    reopenQuarter,
    handleCellClick,
    handleCellSave,
    handleCellKeyDown,
    syncItem,
    exportSpreadsheet,
  } = state;

  const stats = useMemo(() => {
    if (!spreadsheet) {
      return {
        learnerCount: 0,
        interventions: 0,
        average: 0,
      };
    }

    const learnerCount = spreadsheet.students.length;
    const interventions = spreadsheet.students.filter(
      (student) =>
        student.remarks === 'For Intervention' || student.quarterlyGrade < 75,
    ).length;
    const average =
      learnerCount > 0
        ? spreadsheet.students.reduce((sum, student) => sum + student.quarterlyGrade, 0) /
          learnerCount
        : 0;

    return {
      learnerCount,
      interventions,
      average,
    };
  }, [spreadsheet]);

  const workbookData = useMemo(() => {
    if (!spreadsheet) {
      return null;
    }

    return {
      writtenCategory: spreadsheet.categories[0],
      performanceCategory: spreadsheet.categories[1],
      quarterlyCategory: spreadsheet.categories[2],
      genderGroups: getGenderGroups(spreadsheet.students),
    };
  }, [spreadsheet]);

  const workbookMeta = useMemo(() => {
    if (!spreadsheet) {
      return null;
    }

    return {
      sheetName: getWorkbookSheetName(spreadsheet.header),
      title: getWorkbookTitle(spreadsheet.header),
      subtitle: getWorkbookSubtitle(spreadsheet.header),
      subjectCode: getWorkbookSubjectCode(spreadsheet.header),
    };
  }, [spreadsheet]);

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {quarters.map((quarter) => {
          const record = classRecords.find((item) => item.gradingPeriod === quarter);
          if (record) {
            return (
              <Button
                key={quarter}
                variant={selectedRecord?.id === record.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRecordId(record.id)}
                className="gap-2 rounded-full"
              >
                {quarter}
                <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-[0.2em]">
                  {record.status}
                </Badge>
              </Button>
            );
          }

          return (
            <Button
              key={quarter}
              variant="ghost"
              size="sm"
              onClick={() => void generateQuarter(quarter)}
              disabled={generating}
              className="rounded-full border border-dashed"
            >
              + {quarter}
            </Button>
          );
        })}
      </div>

      {!selectedRecord ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 text-primary/70" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Workbook not created yet</p>
              <p className="text-sm">{emptyMessage}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {spreadsheet && selectedRecord && workbookData && workbookMeta ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)]">
              <CardContent className="relative overflow-hidden p-0">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />
                <div className="relative space-y-6 p-6 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Badge className="border-white/12 bg-white/6 text-white backdrop-blur">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        {workbookMeta.sheetName || spreadsheet.header.templateLabel || 'Workbook View'}
                      </Badge>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                          {workbookMeta.title}
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight">
                          {spreadsheet.header.subject || 'Untitled Subject'}
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm text-white/80">
                          Workbook-aligned class record with exact sheet grouping, live scoring,
                          and cleaner day-to-day interaction.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-white/12 bg-white/8 px-3 py-1 text-white backdrop-blur">
                        {selectedRecord.status.toUpperCase()}
                      </Badge>
                      <Badge className="border-white/12 bg-white/8 px-3 py-1 text-white backdrop-blur">
                        {spreadsheet.header.quarter}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <InfoPanel
                      label="School"
                      value={spreadsheet.header.schoolName || 'Gat Andres Bonifacio High School'}
                      helper={`${spreadsheet.header.schoolYear || 'School Year TBD'} - ${spreadsheet.header.section || 'Section TBD'}`}
                    />
                    <InfoPanel
                      label="Teacher"
                      value={spreadsheet.header.teacher || 'Unassigned'}
                      helper={
                        `${workbookMeta.subjectCode} / ${workbookMeta.sheetName}`
                      }
                    />
                    <InfoPanel
                      label="Average"
                      value={spreadsheet.students.length ? stats.average.toFixed(1) : '--'}
                      helper={`${stats.learnerCount} learner${stats.learnerCount === 1 ? '' : 's'}`}
                      icon={TrendingUp}
                    />
                    <InfoPanel
                      label="Intervention"
                      value={String(stats.interventions)}
                      helper="Students below 75"
                      icon={TriangleAlert}
                    />
                  </div>

                  <div className="grid gap-3 text-sm text-white/85 md:grid-cols-3">
                    <MetaLine label="Region" value={spreadsheet.header.region || 'Not yet configured'} />
                    <MetaLine label="Division" value={spreadsheet.header.division || 'Not yet configured'} />
                    <MetaLine label="District" value={spreadsheet.header.district || 'Not yet configured'} />
                    <MetaLine
                      label="Grade & Section"
                      value={`${spreadsheet.header.gradeLevel ? `Grade ${spreadsheet.header.gradeLevel}` : 'Grade ?'}${spreadsheet.header.section ? ` - ${spreadsheet.header.section}` : ''}`}
                    />
                    <MetaLine label="School ID" value={spreadsheet.header.schoolId || 'Pending'} />
                    <MetaLine
                      label="Weights"
                      value={`${Math.round(workbookData.writtenCategory?.weight ?? 0)}/${Math.round(workbookData.performanceCategory?.weight ?? 0)}/${Math.round(workbookData.quarterlyCategory?.weight ?? 0)}`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {selectedRecord.status === 'draft' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowFinalizeDialog(true)}
                        className="gap-2 rounded-full"
                      >
                        <BookOpenCheck className="h-4 w-4" />
                        Finalize Quarter
                      </Button>
                    ) : null}
                    {selectedRecord.status === 'finalized' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void reopenQuarter()}
                        disabled={reopening}
                        className="gap-2 rounded-full"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        {reopening ? 'Reopening...' : 'Reopen Quarter'}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void exportSpreadsheet()}
                      className="gap-2 rounded-full"
                    >
                      <Download className="h-4 w-4" />
                      Export Workbook
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Card className="overflow-hidden border-[#c9cfd9] shadow-[0_18px_40px_-32px_rgba(15,23,42,0.5)]">
            <CardContent className="p-0">
              <div className="overflow-auto bg-[#f5f6f8] p-3">
                <table className="min-w-[1480px] border-collapse bg-white text-[11px] [font-family:Arial,Helvetica,sans-serif]">
                  <colgroup>
                    {WORKBOOK_COLUMN_WIDTHS.map((width, index) => (
                      <col key={`col-${index + 1}`} style={{ width }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        colSpan={36}
                        className="border-0 px-3 pb-1 pt-3 text-center text-[26px] font-normal text-slate-900"
                      >
                        {workbookMeta.title}
                      </th>
                    </tr>
                    <tr>
                      <th colSpan={36} className="border-0 px-3 pb-3 text-center text-[11px] font-normal text-slate-600">
                        {workbookMeta.subtitle}
                      </th>
                    </tr>
                    <tr>
                      <th className="border-0" />
                      <th colSpan={4} className="border border-transparent px-2 py-1 text-right font-normal text-slate-700">
                        REGION
                      </th>
                      <th colSpan={4} className="border border-transparent px-2 py-1 text-left font-normal text-slate-900">
                        {spreadsheet.header.region || ''}
                      </th>
                      <th className="border-0" />
                      <th colSpan={3} className="border border-transparent px-2 py-1 text-right font-normal text-slate-700">
                        DIVISION
                      </th>
                      <th colSpan={4} className="border border-transparent px-2 py-1 text-left font-normal text-slate-900">
                        {spreadsheet.header.division || ''}
                      </th>
                      <th className="border-0" />
                      <th colSpan={4} className="border border-transparent px-2 py-1 text-right font-normal text-slate-700">
                        DISTRICT
                      </th>
                      <th colSpan={5} className="border border-transparent px-2 py-1 text-left font-normal text-slate-900">
                        {spreadsheet.header.district || ''}
                      </th>
                      <th colSpan={9} className="border-0" />
                    </tr>
                    <tr>
                      <th className="border-0" />
                      <th colSpan={5} className="border border-transparent px-2 py-1 text-right font-normal text-slate-700">
                        SCHOOL NAME
                      </th>
                      <th colSpan={12} className="border border-transparent px-2 py-1 text-left font-normal text-slate-900">
                        {spreadsheet.header.schoolName || ''}
                      </th>
                      <th className="border-0" />
                      <th colSpan={4} className="border border-transparent px-2 py-1 text-right font-normal text-slate-700">
                        SCHOOL ID
                      </th>
                      <th colSpan={6} className="border border-transparent px-2 py-1 text-left font-normal text-slate-900">
                        {spreadsheet.header.schoolId || ''}
                      </th>
                      <th colSpan={3} className="border border-transparent px-2 py-1 text-right font-normal text-slate-700">
                        SCHOOL YEAR
                      </th>
                      <th colSpan={3} className="border border-transparent px-2 py-1 text-left font-normal text-slate-900">
                        {spreadsheet.header.schoolYear || ''}
                      </th>
                      <th className="border-0" />
                    </tr>
                    <tr>
                      <th colSpan={5} className="border border-[#6b7280] px-2 py-1.5 text-center font-normal text-slate-900">
                        {getQuarterTitle(spreadsheet.header.quarter)}
                      </th>
                      <th colSpan={5} className="border border-[#6b7280] px-2 py-1.5 text-right font-normal text-slate-700">
                        GRADE &amp; SECTION:
                      </th>
                      <th colSpan={6} className="border border-[#6b7280] px-2 py-1.5 text-left font-normal text-slate-900">
                        {spreadsheet.header.gradeLevel ? `GRADE ${spreadsheet.header.gradeLevel}` : ''}
                        {spreadsheet.header.section ? ` - ${spreadsheet.header.section}` : ''}
                      </th>
                      <th colSpan={2} className="border border-[#6b7280] px-2 py-1.5 text-right font-normal text-slate-700">
                        TEACHER:
                      </th>
                      <th colSpan={10} className="border border-[#6b7280] px-2 py-1.5 text-left font-normal text-slate-900">
                        {spreadsheet.header.teacher || ''}
                      </th>
                      <th colSpan={4} className="border border-[#6b7280] px-2 py-1.5 text-right font-normal text-slate-700">
                        SUBJECT:
                      </th>
                      <th colSpan={4} className="border border-[#6b7280] px-2 py-1.5 text-left font-normal uppercase text-slate-900">
                        {spreadsheet.header.subject || ''}
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-[#374151] bg-white px-2 py-3 text-center font-normal text-slate-900" />
                      <th colSpan={4} className="border border-[#374151] bg-[#00b050] px-2 py-3 text-center text-[14px] font-normal text-slate-900">
                        LEARNERS&apos; NAMES
                      </th>
                      <th colSpan={13} className="border border-[#374151] bg-white px-2 py-3 text-center text-[14px] font-normal text-slate-900">
                        {`${workbookData.writtenCategory?.name.toUpperCase() || 'WRITTEN WORKS'} (${Math.round(workbookData.writtenCategory?.weight ?? 0)}%)`}
                      </th>
                      <th colSpan={13} className="border border-[#374151] bg-white px-2 py-3 text-center text-[14px] font-normal text-slate-900">
                        {`${workbookData.performanceCategory?.name.toUpperCase() || 'PERFORMANCE TASKS'} (${Math.round(workbookData.performanceCategory?.weight ?? 0)}%)`}
                      </th>
                      <th colSpan={3} className="border border-[#374151] bg-[#fff200] px-2 py-3 text-center text-[14px] font-normal text-slate-900">
                        {`${workbookData.quarterlyCategory?.name.toUpperCase() || 'QUARTERLY ASSESSMENT'} (${Math.round(workbookData.quarterlyCategory?.weight ?? 0)}%)`}
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-3 text-center text-[14px] font-normal text-slate-900">
                        Initial
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-3 text-center text-[14px] font-normal text-slate-900">
                        Quarterly
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900" />
                      {Array.from({ length: 4 }).map((_, index) => (
                        <th key={`blank-name-${index}`} className="border border-[#374151] bg-white px-2 py-1.5" />
                      ))}
                      {Array.from({ length: 10 }).map((_, index) => (
                        <th key={`ww-${index + 1}`} className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                          {index + 1}
                        </th>
                      ))}
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        Total
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        PS
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        WS
                      </th>
                      {Array.from({ length: 10 }).map((_, index) => (
                        <th key={`pt-${index + 1}`} className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                          {index + 1}
                        </th>
                      ))}
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        Total
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        PS
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        WS
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        1
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        PS
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        WS
                      </th>
                      <th rowSpan={2} className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        Grade
                      </th>
                      <th rowSpan={2} className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        Grade
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900" />
                      <th colSpan={4} className="border border-[#374151] bg-white px-2 py-1.5 text-left font-normal text-slate-900">
                        HIGHEST POSSIBLE SCORE
                      </th>
                      {Array.from({ length: 10 }).map((_, index) => {
                        const item = workbookData.writtenCategory?.items[index];
                        return (
                          <th key={`ww-hps-${item?.id ?? index}`} className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                            {item?.hps ?? ''}
                          </th>
                        );
                      })}
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        {getCategoryTotalHps(workbookData.writtenCategory) || ''}
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        100
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        {((workbookData.writtenCategory?.weight ?? 0) / 100).toFixed(1)}
                      </th>
                      {Array.from({ length: 10 }).map((_, index) => {
                        const item = workbookData.performanceCategory?.items[index];
                        return (
                          <th key={`pt-hps-${item?.id ?? index}`} className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                            {item?.hps ?? ''}
                          </th>
                        );
                      })}
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        {getCategoryTotalHps(workbookData.performanceCategory) || ''}
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        100
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        {((workbookData.performanceCategory?.weight ?? 0) / 100).toFixed(1)}
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        {workbookData.quarterlyCategory?.items?.[0]?.hps ?? ''}
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        100
                      </th>
                      <th className="border border-[#374151] bg-white px-2 py-1.5 text-center font-normal text-slate-900">
                        {((workbookData.quarterlyCategory?.weight ?? 0) / 100).toFixed(1)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {workbookData.genderGroups.map((group) => (
                      <Fragment key={group.label}>
                        {group.students.length ? (
                          <tr>
                            <td className="border border-[#374151] bg-[#fff2cc] px-2 py-1.5" />
                            <td colSpan={4} className="border border-[#374151] bg-[#fff2cc] px-3 py-1.5 text-left font-semibold tracking-[0.18em] text-slate-900">
                              {group.label}
                            </td>
                            {Array.from({ length: 31 }).map((_, index) => (
                              <td key={`${group.label}-fill-${index}`} className="border border-[#374151] bg-[#fff2cc] px-2 py-1.5" />
                            ))}
                          </tr>
                        ) : null}
                        {group.students.map((student, groupIndex) => {
                          const globalIndex =
                            spreadsheet.students.findIndex(
                              (current) => current.studentId === student.studentId,
                            ) + 1;
                          const writtenData = student.categories.find(
                            (category) => category.categoryId === workbookData.writtenCategory?.id,
                          );
                          const performanceData = student.categories.find(
                            (category) =>
                              category.categoryId === workbookData.performanceCategory?.id,
                          );
                          const quarterlyData = student.categories.find(
                            (category) => category.categoryId === workbookData.quarterlyCategory?.id,
                          );

                          return (
                            <tr
                              key={student.studentId}
                              className={cn(
                                'transition-colors hover:bg-sky-50/80',
                                (student.remarks === 'For Intervention' || student.quarterlyGrade < 75) &&
                                  'bg-rose-50/40',
                              )}
                            >
                              <td className="border border-[#374151] px-2 py-1.5 text-center text-slate-900">
                                {globalIndex || groupIndex + 1}
                              </td>
                              <td colSpan={4} className="border border-[#374151] px-3 py-1.5 text-left text-slate-900">
                                <div className="flex flex-col gap-0.5">
                                  <span>
                                    {student.lastName}, {student.firstName}
                                    {student.middleName ? `, ${student.middleName.charAt(0)}.` : ''}
                                  </span>
                                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                                    {student.lrn ? <span>LRN: {student.lrn}</span> : null}
                                    {student.email ? <span>{student.email}</span> : null}
                                  </div>
                                </div>
                              </td>

                              {Array.from({ length: 10 }).map((_, index) => {
                                const item = workbookData.writtenCategory?.items[index];
                                const score = writtenData?.scores[index];
                                const isEditing =
                                  !!item &&
                                  editingCell?.itemId === item.id &&
                                  editingCell?.studentId === student.studentId;

                                return (
                                  <td
                                    key={`${student.studentId}-ww-${item?.id ?? index}`}
                                    className={cn(
                                      'border border-[#374151] px-1 py-1 text-center transition',
                                      item && selectedRecord.status === 'draft' && 'cursor-pointer hover:bg-sky-100',
                                      item?.assessmentId && 'bg-indigo-50/40',
                                    )}
                                    onClick={() =>
                                      item
                                        ? handleCellClick(item.id, student.studentId, score ?? null)
                                        : undefined
                                    }
                                  >
                                    {isEditing ? (
                                      <Input
                                        ref={editRef}
                                        type="number"
                                        min={0}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => void handleCellSave()}
                                        onKeyDown={handleCellKeyDown}
                                        className="mx-auto h-7 w-14 border-0 p-0 text-center text-xs focus-visible:ring-1"
                                      />
                                    ) : (
                                      <span className={cn(score == null && 'text-slate-300')}>
                                        {score ?? ''}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {writtenData?.total != null ? writtenData.total.toFixed(1) : ''}
                              </td>
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {writtenData?.ps != null ? writtenData.ps.toFixed(2) : ''}
                              </td>
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {writtenData?.ws != null ? writtenData.ws.toFixed(2) : ''}
                              </td>

                              {Array.from({ length: 10 }).map((_, index) => {
                                const item = workbookData.performanceCategory?.items[index];
                                const score = performanceData?.scores[index];
                                const isEditing =
                                  !!item &&
                                  editingCell?.itemId === item.id &&
                                  editingCell?.studentId === student.studentId;

                                return (
                                  <td
                                    key={`${student.studentId}-pt-${item?.id ?? index}`}
                                    className={cn(
                                      'border border-[#374151] px-1 py-1 text-center transition',
                                      item && selectedRecord.status === 'draft' && 'cursor-pointer hover:bg-amber-100',
                                      item?.assessmentId && 'bg-indigo-50/40',
                                    )}
                                    onClick={() =>
                                      item
                                        ? handleCellClick(item.id, student.studentId, score ?? null)
                                        : undefined
                                    }
                                  >
                                    {isEditing ? (
                                      <Input
                                        ref={editRef}
                                        type="number"
                                        min={0}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => void handleCellSave()}
                                        onKeyDown={handleCellKeyDown}
                                        className="mx-auto h-7 w-14 border-0 p-0 text-center text-xs focus-visible:ring-1"
                                      />
                                    ) : (
                                      <span className={cn(score == null && 'text-slate-300')}>
                                        {score ?? ''}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {performanceData?.total != null ? performanceData.total.toFixed(1) : ''}
                              </td>
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {performanceData?.ps != null ? performanceData.ps.toFixed(2) : ''}
                              </td>
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {performanceData?.ws != null ? performanceData.ws.toFixed(2) : ''}
                              </td>

                              {(() => {
                                const item = workbookData.quarterlyCategory?.items[0];
                                const score = quarterlyData?.scores[0];
                                const isEditing =
                                  !!item &&
                                  editingCell?.itemId === item.id &&
                                  editingCell?.studentId === student.studentId;

                                return (
                                  <td
                                    className={cn(
                                      'border border-[#374151] px-1 py-1 text-center transition',
                                      item && selectedRecord.status === 'draft' && 'cursor-pointer hover:bg-lime-100',
                                      item?.assessmentId && 'bg-indigo-50/40',
                                    )}
                                    onClick={() =>
                                      item
                                        ? handleCellClick(item.id, student.studentId, score ?? null)
                                        : undefined
                                    }
                                  >
                                    {isEditing ? (
                                      <Input
                                        ref={editRef}
                                        type="number"
                                        min={0}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => void handleCellSave()}
                                        onKeyDown={handleCellKeyDown}
                                        className="mx-auto h-7 w-14 border-0 p-0 text-center text-xs focus-visible:ring-1"
                                      />
                                    ) : (
                                      <span className={cn(score == null && 'text-slate-300')}>
                                        {score ?? ''}
                                      </span>
                                    )}
                                  </td>
                                );
                              })()}
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {quarterlyData?.ps != null ? quarterlyData.ps.toFixed(2) : ''}
                              </td>
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {quarterlyData?.ws != null ? quarterlyData.ws.toFixed(2) : ''}
                              </td>
                              <td className="border border-[#374151] px-1 py-1 text-center text-slate-900">
                                {student.initialGrade != null ? student.initialGrade.toFixed(2) : ''}
                              </td>
                              <td
                                className={cn(
                                  'border border-[#374151] px-1 py-1 text-center font-semibold',
                                  student.quarterlyGrade >= 75
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700',
                                )}
                              >
                                {student.quarterlyGrade != null ? student.quarterlyGrade : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}

                    {spreadsheet.students.length === 0 ? (
                      <tr>
                        <td colSpan={36} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No enrolled students yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                      Passed: {spreadsheet.students.filter((student) => student.remarks !== 'For Intervention').length}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-rose-200 bg-rose-50 text-rose-700">
                      For Intervention: {stats.interventions}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...spreadsheet.categories.flatMap((category) => category.items)]
                      .filter((item) => item.assessmentId)
                      .slice(0, 4)
                      .map((item) => (
                        <Button
                          key={item.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void syncItem(item.id)}
                          disabled={syncingItemId === item.id || selectedRecord.status !== 'draft'}
                          className="gap-2 rounded-full"
                        >
                          <RefreshCcw
                            className={cn(
                              'h-3.5 w-3.5',
                              syncingItemId === item.id && 'animate-spin',
                            )}
                          />
                          {syncingItemId === item.id ? `Syncing ${item.title}` : `Sync ${item.title}`}
                        </Button>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize quarter workbook</DialogTitle>
            <DialogDescription>
              Finalizing saves the computed grades for this quarter and prevents
              further editing until you reopen it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void finalizeQuarter();
                setShowFinalizeDialog(false);
              }}
              disabled={finalizing}
            >
              {finalizing ? 'Finalizing...' : 'Confirm Finalize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoPanel({
  label,
  value,
  helper,
  icon: Icon = PencilLine,
}: {
  label: string;
  value: string;
  helper: string;
  icon?: typeof PencilLine;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/65">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-3 text-xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-white/70">{helper}</p>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">{label}</p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  );
}
