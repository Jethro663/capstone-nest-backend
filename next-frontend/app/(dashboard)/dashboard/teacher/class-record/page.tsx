'use client';

<<<<<<< Updated upstream
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { classRecordService } from '@/services/class-record-service';
import { dashboardService } from '@/services/dashboard-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { ClassRecord, SpreadsheetData } from '@/types/class-record';
import type { ClassItem } from '@/types/class';
import type { GradingPeriod } from '@/utils/constants';

const QUARTERS: GradingPeriod[] = ['Q1', 'Q2', 'Q3', 'Q4'];
=======
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookMarked,
  ClipboardCheck,
  Layers3,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TeacherClassRecordWorkbook } from '@/components/teacher/class-record/TeacherClassRecordWorkbook';
import {
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { dashboardService } from '@/services/dashboard-service';
import { useTeacherClassRecord } from '@/hooks/use-teacher-class-record';
import type { ClassItem } from '@/types/class';
>>>>>>> Stashed changes

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || fallback
  );
}

export default function ClassRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get('classId') || '';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId);
  const [loading, setLoading] = useState(true);
<<<<<<< Updated upstream
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string; studentId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
=======
>>>>>>> Stashed changes

  const classRecordState = useTeacherClassRecord(selectedClassId || undefined);
  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const workbookCount = classRecordState.classRecords.length;
  const learnerCount = classRecordState.spreadsheet?.students.length ?? 0;
  const selectedQuarter = classRecordState.selectedRecord?.gradingPeriod ?? 'No quarter selected';
  const statusLabel = classRecordState.selectedRecord?.status
    ? `${classRecordState.selectedRecord.status[0].toUpperCase()}${classRecordState.selectedRecord.status.slice(1)}`
    : 'Waiting';

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await dashboardService.getTeacherClasses();
        setClasses(response.data || []);
      } catch {
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchClasses();
  }, []);

<<<<<<< Updated upstream
  // Fetch class records for selected class
  const fetchClassRecords = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      const res = await classRecordService.getByClass(selectedClassId);
      const records = Array.isArray(res.data) ? res.data : [];
      setClassRecords(records);
      if (records.length > 0) {
        setSelectedRecord(records[0]);
      } else {
        setSelectedRecord(null);
        setSpreadsheet(null);
      }
    } catch {
      toast.error('Failed to load class records');
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchClassRecords();
  }, [fetchClassRecords]);

  // Fetch spreadsheet for selected record
  const fetchSpreadsheet = useCallback(async () => {
    if (!selectedRecord) {
      setSpreadsheet(null);
      return;
    }
    try {
      const res = await classRecordService.getSpreadsheet(selectedRecord.id);
      setSpreadsheet(res.data);
    } catch {
      toast.error('Failed to load spreadsheet');
      setSpreadsheet(null);
    }
  }, [selectedRecord]);

  useEffect(() => {
    fetchSpreadsheet();
  }, [fetchSpreadsheet]);

  const handleGenerate = async (quarter: GradingPeriod) => {
    if (!selectedClassId) return;
    try {
      setGenerating(true);
      await classRecordService.generate({ classId: selectedClassId, gradingPeriod: quarter });
      toast.success(`Class record for ${quarter} generated`);
      await fetchClassRecords();
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        toast.info(`${quarter} record already exists — loading it now`);
        await fetchClassRecords();
      } else {
        toast.error(getErrorMessage(err, 'Failed to generate class record'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedRecord) return;
    try {
      setFinalizing(true);
      await classRecordService.finalize(selectedRecord.id);
      toast.success('Quarter finalized');
      setShowFinalizeDialog(false);
      fetchClassRecords();
    } catch {
      toast.error('Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedRecord) return;
    try {
      setReopening(true);
      await classRecordService.reopen(selectedRecord.id);
      toast.success('Quarter reopened for editing');
      await fetchClassRecords();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to reopen class record'));
    } finally {
      setReopening(false);
    }
  };

  const handleCellClick = (itemId: string, studentId: string, currentScore: number | null) => {
    if (selectedRecord?.status !== 'draft') return;
    setEditingCell({ itemId, studentId });
    setEditValue(currentScore != null ? String(currentScore) : '');
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const score = parseFloat(editValue);
    if (isNaN(score) || score < 0) {
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
      fetchSpreadsheet();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save score'));
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellSave();
    if (e.key === 'Escape') setEditingCell(null);
  };

  // Computed: which quarters already exist
  const existingQuarters = new Set(classRecords.map((r) => r.gradingPeriod));
  void existingQuarters;

  const exportSpreadsheet = () => {
    if (!spreadsheet || !selectedRecord) return;

    const rows: (string | number)[][] = [
      ['Subject', spreadsheet.header.subject || ''],
      ['Teacher', spreadsheet.header.teacher || ''],
      ['Quarter', spreadsheet.header.quarter],
      ['Section', `${spreadsheet.header.gradeLevel ? `Grade ${spreadsheet.header.gradeLevel} - ` : ''}${spreadsheet.header.section || ''}`],
      [],
    ];

    const headerRow = ['Learner'];
    spreadsheet.categories.forEach((category) => {
      category.items.forEach((item) => headerRow.push(item.title));
      headerRow.push(`${category.name} Total`, `${category.name} PS`, `${category.name} WS`);
    });
    headerRow.push('Initial Grade', 'Quarterly Grade');
    rows.push(headerRow);

    const hpsRow: (string | number)[] = ['HPS'];
    spreadsheet.categories.forEach((category) => {
      category.items.forEach((item) => hpsRow.push(item.hps ?? ''));
      hpsRow.push(
        category.items.reduce((sum, item) => sum + (item.hps || 0), 0),
        '',
        '',
      );
    });
    hpsRow.push('', '');
    rows.push(hpsRow);

    spreadsheet.students.forEach((student) => {
      const row: (string | number)[] = [`${student.lastName}, ${student.firstName}`];
      student.categories.forEach((category) => {
        category.scores.forEach((score) => row.push(score ?? ''));
        row.push(category.total, category.ps, category.ws);
      });
      row.push(student.initialGrade, student.quarterlyGrade);
      rows.push(row);
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedRecord.gradingPeriod);
    XLSX.writeFile(workbook, `class-record-${selectedRecord.gradingPeriod}-${selectedRecord.classId}.xlsx`);
  };

=======
>>>>>>> Stashed changes
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      className="teacher-class-record-page"
      badge="Teacher Class Record"
      title="Class Record Workspace"
      description="The workbook already handles the grading work well, so this landing area now helps you orient faster, pick the right class, and step into the quarter record with less visual friction."
      actions={(
        <>
<<<<<<< Updated upstream
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quarter: </span>
                  <strong>{spreadsheet.header.quarter}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Grade & Section: </span>
                  <strong>
                    {spreadsheet.header.gradeLevel && `Grade ${spreadsheet.header.gradeLevel} - `}
                    {spreadsheet.header.section || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject: </span>
                  <strong>{spreadsheet.header.subject || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Teacher: </span>
                  <strong>{spreadsheet.header.teacher || '—'}</strong>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                {selectedRecord?.status === 'draft' ? (
                  <Button size="sm" variant="outline" onClick={() => setShowFinalizeDialog(true)}>
                    Finalize Quarter
                  </Button>
                ) : null}
                {selectedRecord?.status === 'finalized' ? (
                  <Button size="sm" variant="outline" onClick={handleReopen} disabled={reopening}>
                    {reopening ? 'Reopening...' : 'Reopen Quarter'}
                  </Button>
                ) : null}
                <Button size="sm" onClick={exportSpreadsheet}>
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Spreadsheet Grid */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  {/* Category header row */}
                  <thead>
                    <tr className="bg-muted/70">
                      <th
                        className="sticky left-0 z-20 bg-muted/70 border px-2 py-1.5 text-left font-semibold min-w-[180px]"
                        rowSpan={3}
                      >
                        Learner&apos;s Name
                      </th>
                      {spreadsheet.categories.map((cat) => (
                        <th
                          key={cat.id}
                          colSpan={cat.items.length + 3}
                          className="border px-2 py-1.5 text-center font-semibold bg-muted/50"
                        >
                          {cat.name} ({cat.weight}%)
                        </th>
                      ))}
                      <th colSpan={2} className="border px-2 py-1.5 text-center font-semibold bg-muted/50">
                        Grades
                      </th>
                    </tr>

                    {/* Item title row */}
                    <tr className="bg-muted/40">
                      {spreadsheet.categories.map((cat) => (
                        <>
                          {cat.items.map((item) => (
                            <th key={item.id} className="border px-1.5 py-1 text-center font-medium min-w-[50px]">
                              {item.title}
                            </th>
                          ))}
                          <th key={`${cat.id}-total`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[50px]">Total</th>
                          <th key={`${cat.id}-ps`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[40px]">PS</th>
                          <th key={`${cat.id}-ws`} className="border px-1.5 py-1 text-center font-medium bg-blue-50 min-w-[40px]">WS</th>
                        </>
                      ))}
                      <th className="border px-1.5 py-1 text-center font-medium bg-yellow-50 min-w-[50px]">IG</th>
                      <th className="border px-1.5 py-1 text-center font-medium bg-green-50 min-w-[50px]">QG</th>
                    </tr>

                    {/* HPS row */}
                    <tr className="bg-amber-50/50">
                      {spreadsheet.categories.map((cat) => (
                        <>
                          {cat.items.map((item) => (
                            <td key={`hps-${item.id}`} className="border px-1.5 py-1 text-center font-semibold text-amber-700">
                              {item.hps ?? ''}
                            </td>
                          ))}
                          <td key={`hps-total-${cat.id}`} className="border px-1.5 py-1 text-center font-semibold text-amber-700">
                            {cat.items.reduce((s, i) => s + (i.hps || 0), 0) || ''}
                          </td>
                          <td key={`hps-ps-${cat.id}`} className="border px-1.5 py-1 text-center">—</td>
                          <td key={`hps-ws-${cat.id}`} className="border px-1.5 py-1 text-center">—</td>
                        </>
                      ))}
                      <td className="border px-1.5 py-1 text-center">—</td>
                      <td className="border px-1.5 py-1 text-center">—</td>
                    </tr>
                  </thead>

                  <tbody>
                    {spreadsheet.students.map((student) => (
                      <tr key={student.studentId} className="hover:bg-muted/20">
                        <td className="sticky left-0 z-10 bg-white border px-2 py-1.5 font-medium whitespace-nowrap">
                          {student.lastName}, {student.firstName}
                        </td>
                        {spreadsheet.categories.map((cat, catIdx) => {
                          const catData = student.categories[catIdx];
                          return (
                            <>
                              {cat.items.map((item, itemIdx) => {
                                const score = catData?.scores[itemIdx];
                                const isEditing =
                                  editingCell?.itemId === item.id &&
                                  editingCell?.studentId === student.studentId;
                                return (
                                  <td
                                    key={`${student.studentId}-${item.id}`}
                                    className={`border px-1 py-0.5 text-center cursor-pointer hover:bg-blue-50 ${
                                      item.assessmentId ? 'bg-indigo-50/30' : ''
                                    }`}
                                    onClick={() =>
                                      handleCellClick(item.id, student.studentId, score ?? null)
                                    }
                                  >
                                    {isEditing ? (
                                      <Input
                                        ref={editRef}
                                        type="number"
                                        min={0}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleCellSave}
                                        onKeyDown={handleCellKeyDown}
                                        className="h-6 w-14 text-xs text-center p-0 border-0 focus-visible:ring-1"
                                      />
                                    ) : (
                                      <span className={score == null ? 'text-muted-foreground' : ''}>
                                        {score ?? ''}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td key={`${student.studentId}-total-${cat.id}`} className="border px-1 py-0.5 text-center font-medium bg-blue-50/50">
                                {catData?.total != null ? catData.total.toFixed(1) : ''}
                              </td>
                              <td key={`${student.studentId}-ps-${cat.id}`} className="border px-1 py-0.5 text-center bg-blue-50/50">
                                {catData?.ps != null ? catData.ps.toFixed(1) : ''}
                              </td>
                              <td key={`${student.studentId}-ws-${cat.id}`} className="border px-1 py-0.5 text-center bg-blue-50/50">
                                {catData?.ws != null ? catData.ws.toFixed(2) : ''}
                              </td>
                            </>
                          );
                        })}
                        <td className="border px-1 py-0.5 text-center font-medium bg-yellow-50/50">
                          {student.initialGrade != null ? student.initialGrade.toFixed(2) : ''}
                        </td>
                        <td
                          className={`border px-1 py-0.5 text-center font-bold ${
                            student.quarterlyGrade != null
                              ? student.quarterlyGrade >= 75
                                ? 'text-green-700 bg-green-50'
                                : 'text-red-700 bg-red-50'
                              : ''
                          }`}
                        >
                          {student.quarterlyGrade != null ? student.quarterlyGrade : ''}
                        </td>
                      </tr>
                    ))}
                    {spreadsheet.students.length === 0 && (
                      <tr>
                        <td
                          colSpan={
                            1 +
                            spreadsheet.categories.reduce((s, c) => s + c.items.length + 3, 0) +
                            2
                          }
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No students enrolled in this class.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize quarter</DialogTitle>
            <DialogDescription>
              Finalizing locks in the computed grades for this quarter until you explicitly reopen it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? 'Finalizing...' : 'Confirm Finalize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
=======
          <Button
            variant="outline"
            className="teacher-button-outline rounded-xl px-4 font-black"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="teacher-dashboard-chip">
            <Sparkles className="h-4 w-4" />
            DepEd-inspired workbook flow
          </div>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Assigned Classes"
            value={classes.length}
            caption="Available for workbook selection"
            icon={Layers3}
            accent="sky"
          />
          <TeacherStatCard
            label="Workbooks"
            value={workbookCount}
            caption={selectedClass ? `For ${selectedClass.subjectName}` : 'Choose a class to load records'}
            icon={BookMarked}
            accent="teal"
          />
          <TeacherStatCard
            label="Selected Quarter"
            value={selectedQuarter}
            caption={`Status: ${statusLabel}`}
            icon={ClipboardCheck}
            accent="amber"
          />
          <TeacherStatCard
            label="Learners"
            value={learnerCount}
            caption={selectedClass ? 'Shown in the open workbook' : 'Will appear after class selection'}
            icon={Users}
            accent="rose"
          />
        </>
      )}
    >
      <TeacherSectionCard
        title="Open a Class Workbook"
        description="Pick a class first, then continue directly into its quarter workbook, live scores, and grading controls."
      >
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.24em] text-[var(--teacher-text-muted)]">
              Select Class
            </label>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="teacher-select min-h-[3.25rem] w-full text-sm font-semibold"
            >
              <option value="">Choose a class record workbook...</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.subjectName} - {classItem.section?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="teacher-dashboard-mini-panel border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))] shadow-[0_24px_54px_-36px_rgba(2,6,23,0.72)]">
            <div className="teacher-dashboard-mini-panel__icon bg-white/6 text-white">
              <BookMarked className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">
                Workbook Focus
              </p>
              <p className="text-sm font-bold text-[var(--teacher-text-strong)]">
                {selectedClass
                  ? `${selectedClass.subjectName} • ${selectedClass.section?.name || 'Section not set'}`
                  : 'Choose a class to open its quarter record'}
              </p>
              <p className="text-sm text-[var(--teacher-text-muted)]">
                {selectedClassId
                  ? 'Once selected, the workbook below stays exactly the same and opens with its current record state.'
                  : 'This landing section is only a visual refresh. The actual class record workbook behavior remains unchanged.'}
              </p>
            </div>
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherClassRecordWorkbook
        state={classRecordState}
        emptyMessage={
          selectedClassId
            ? 'No class record exists for this class yet. Create a quarter workbook to begin.'
            : 'Choose a class first to open its workbook.'
        }
      />
    </TeacherPageShell>
>>>>>>> Stashed changes
  );
}
