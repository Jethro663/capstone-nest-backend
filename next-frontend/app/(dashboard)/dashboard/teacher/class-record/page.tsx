'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  FileSpreadsheet,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TeacherClassRecordWorkbook } from '@/components/teacher/class-record/TeacherClassRecordWorkbook';
import { dashboardService } from '@/services/dashboard-service';
import { useTeacherClassRecord } from '@/hooks/use-teacher-class-record';
import type { ClassItem } from '@/types/class';
import type { GradingPeriod } from '@/utils/constants';
import { cn } from '@/utils/cn';

export default function ClassRecordPage() {
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get('classId') || '';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId);
  const [loading, setLoading] = useState(true);

  const classRecordState = useTeacherClassRecord(selectedClassId || undefined);
  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const selectedRecord = classRecordState.selectedRecord;
  const spreadsheet = classRecordState.spreadsheet;

  const sectionLabel = selectedClass
    ? `${selectedClass.section?.gradeLevel ? `Grade ${selectedClass.section.gradeLevel}` : 'Grade level not set'} - ${selectedClass.section?.name || 'Section not set'}`
    : 'Grade and section will appear here';

  const quarterMap: Partial<Record<GradingPeriod, (typeof classRecordState.classRecords)[number]>> = {};
  for (const record of classRecordState.classRecords) {
    quarterMap[record.gradingPeriod] = record;
  }

  const categoryBadges = useMemo(() => {
    if (!spreadsheet) return [];

    const tones = [
      'bg-sky-100 text-sky-700',
      'bg-amber-100 text-amber-700',
      'bg-violet-100 text-violet-700',
    ];

    return spreadsheet.categories.slice(0, 3).map((category, index) => ({
      key: category.id,
      text: `${category.name}: ${Math.round(category.weight)}%`,
      tone: tones[index] || 'bg-slate-100 text-slate-700',
    }));
  }, [spreadsheet]);

  const selectedQuarter = selectedRecord?.gradingPeriod || 'No quarter selected';
  const statusLabel = selectedRecord?.status
    ? `${selectedRecord.status[0].toUpperCase()}${selectedRecord.status.slice(1)}`
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-[30rem] rounded-2xl" />
      </div>
    );
  }

  const handleQuarterSelect = async (quarter: GradingPeriod) => {
    const quarterRecord = quarterMap[quarter];
    if (quarterRecord) {
      classRecordState.setSelectedRecordId(quarterRecord.id);
      return;
    }

    await classRecordState.generateQuarter(quarter);
  };

  return (
    <div className="teacher-class-record-page space-y-4 pb-4">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="overflow-hidden rounded-2xl border border-[#1d345f] bg-[#12254a] px-5 py-6 text-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.66)] md:px-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ef233c]">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-[2.05rem] font-bold leading-tight tracking-tight">Class Record</h1>
              <p className="text-base text-slate-200/90">
                Grading workbook for your classes
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void classRecordState.exportSpreadsheet()}
            disabled={!selectedRecord || !spreadsheet}
            className="h-10 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white shadow-none transition-colors hover:bg-white/20"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.03, ease: 'easeOut' }}
        className="rounded-xl border border-[#dce4f0] bg-[#f3f6fb] px-4 py-4 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)] md:px-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="h-11 min-w-[17rem] max-w-full rounded-xl border border-[#cfd9e8] bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-shadow focus:border-[#8ea4c7] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
          >
            <option value="">Choose a class record workbook...</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.subjectName} - {classItem.section?.name}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center rounded-xl border border-[#d6deeb] bg-[#e8edf5] p-1">
            {classRecordState.quarters.map((quarter) => {
              const quarterRecord = quarterMap[quarter];
              const isActive = selectedRecord?.gradingPeriod === quarter;
              const isLoadingQuarter = classRecordState.generating && !quarterRecord;

              return (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => void handleQuarterSelect(quarter)}
                  disabled={isLoadingQuarter}
                  className={cn(
                    'min-w-12 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.12)]'
                      : 'text-[#617089] hover:text-slate-800',
                  )}
                >
                  {isLoadingQuarter ? '...' : quarter}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void classRecordState.refresh()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#cfd9e8] bg-white px-3 text-sm font-semibold text-[#4a617f] transition-colors hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.06, ease: 'easeOut' }}
        className="rounded-2xl border border-[#dce5f2] bg-white p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.38)] md:p-6"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[2.05rem] font-semibold tracking-tight text-[#0d2345]">
              {selectedClass?.subjectName || 'Class workbook'}
            </h2>
            <p className="mt-1 text-[1.45rem] font-normal text-[#7388a8]">
              {sectionLabel}
              {selectedQuarter !== 'No quarter selected' ? ` · ${selectedQuarter}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categoryBadges.length ? (
              categoryBadges.map((badge) => (
                <span
                  key={badge.key}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-medium',
                    badge.tone,
                  )}
                >
                  {badge.text}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-600">
                Status: {statusLabel}
              </span>
            )}
          </div>
        </div>

        <TeacherClassRecordWorkbook
          state={classRecordState}
          className={cn(
            '[&>div:first-child]:hidden',
            selectedRecord && '[&>div:nth-child(2)]:hidden',
          )}
          emptyMessage={
            selectedClassId
              ? 'No class record exists for this class yet. Create a quarter workbook to begin.'
              : 'Choose a class first to open its workbook.'
          }
        />
      </motion.section>
    </div>
  );
}
