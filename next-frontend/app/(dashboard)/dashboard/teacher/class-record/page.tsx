'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { classRecordService } from '@/services/class-record-service';
import { dashboardService } from '@/services/dashboard-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { ClassRecord, SpreadsheetData, SpreadsheetCategory } from '@/types/class-record';
import type { ClassItem } from '@/types/class';
import type { GradingPeriod } from '@/utils/constants';

const QUARTERS: GradingPeriod[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ClassRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get('classId');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId || '');
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string; studentId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await dashboardService.getTeacherClasses();
        setClasses(res.data || []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

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
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.info(`${quarter} record already exists — loading it now`);
        await fetchClassRecords();
      } else {
        toast.error(err?.response?.data?.message || 'Failed to generate class record');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedRecord || !confirm('Finalize this quarter? This cannot be undone.')) return;
    try {
      await classRecordService.finalize(selectedRecord.id);
      toast.success('Quarter finalized');
      fetchClassRecords();
    } catch {
      toast.error('Failed to finalize');
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save score');
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellSave();
    if (e.key === 'Escape') setEditingCell(null);
  };

  // Computed: which quarters already exist
  const existingQuarters = new Set(classRecords.map((r) => r.gradingPeriod));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  // Build column structure for spreadsheet
  const buildColumns = (categories: SpreadsheetCategory[]) => {
    const cols: { type: 'item' | 'total' | 'ps' | 'ws' | 'ig' | 'qg'; catIdx?: number; itemIdx?: number; label: string; catName?: string }[] = [];
    categories.forEach((cat, catIdx) => {
      cat.items.forEach((item, itemIdx) => {
        cols.push({ type: 'item', catIdx, itemIdx, label: item.title, catName: cat.name });
      });
      cols.push({ type: 'total', catIdx, label: 'Total', catName: cat.name });
      cols.push({ type: 'ps', catIdx, label: 'PS', catName: cat.name });
      cols.push({ type: 'ws', catIdx, label: 'WS', catName: cat.name });
    });
    cols.push({ type: 'ig', label: 'Initial Grade' });
    cols.push({ type: 'qg', label: 'Quarterly Grade' });
    return cols;
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Class Record</h1>
      </div>

      {/* Class selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm min-w-[250px]"
        >
          <option value="">Select a class...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.subjectName} — {c.section?.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quarter tabs */}
      {selectedClassId && (
        <div className="flex gap-2 items-center flex-wrap">
          {QUARTERS.map((q) => {
            const record = classRecords.find((r) => r.gradingPeriod === q);
            if (record) {
              return (
                <Button
                  key={q}
                  variant={selectedRecord?.id === record.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRecord(record)}
                >
                  {q}
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {record.status}
                  </Badge>
                </Button>
              );
            }
            return (
              <Button
                key={q}
                variant="ghost"
                size="sm"
                onClick={() => handleGenerate(q)}
                disabled={generating}
              >
                + {q}
              </Button>
            );
          })}
        </div>
      )}

      {!selectedRecord && selectedClassId && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No class record yet. Click a quarter tab to generate one.
          </CardContent>
        </Card>
      )}

      {/* Spreadsheet Header Info */}
      {spreadsheet && (
        <>
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
                {selectedRecord?.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={handleFinalize}>
                    Finalize Quarter
                  </Button>
                )}
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
    </div>
  );
}
