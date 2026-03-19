'use client';

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
                  ? `${selectedClass.subjectName} â€¢ ${selectedClass.section?.name || 'Section not set'}`
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
 
  );
}

