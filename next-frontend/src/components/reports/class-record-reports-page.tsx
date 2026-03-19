'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileBarChart2,
  GraduationCap,
  Layers3,
} from 'lucide-react';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { dashboardService } from '@/services/dashboard-service';
import { reportService } from '@/services/report-service';
import type {
  ClassAverageReport,
  ClassRecord,
  GradeDistributionReport,
  InterventionReportRow,
} from '@/types/class-record';
import type {
  AssessmentSummaryRow,
  ClassEnrollmentRow,
  InterventionParticipationRow,
  ReportQuery,
  ReportTab,
  StudentMasterListRow,
  StudentPerformanceReportRow,
  SystemUsageReport,
} from '@/types/report';
import type { ClassItem } from '@/types/class';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

function formatStudentName(row: InterventionReportRow): string {
  const first = row.student?.firstName?.trim() ?? '';
  const last = row.student?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return row.student?.email ?? row.studentId;
}

interface ClassRecordReportsPageProps {
  heading: string;
  description: string;
  scope: 'teacher' | 'admin';
}

const reportTabs: { value: ReportTab; label: string }[] = [
  { value: 'classRecord', label: 'Class Record' },
  { value: 'studentMasterList', label: 'Master List' },
  { value: 'classEnrollment', label: 'Enrollment' },
  { value: 'studentPerformance', label: 'Performance' },
  { value: 'interventionParticipation', label: 'Interventions' },
  { value: 'assessmentSummary', label: 'Assessments' },
  { value: 'systemUsage', label: 'Usage' },
];

export function ClassRecordReportsPage({
  heading,
  description,
  scope,
}: ClassRecordReportsPageProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('classRecord');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [average, setAverage] = useState<ClassAverageReport | null>(null);
  const [distribution, setDistribution] = useState<GradeDistributionReport | null>(
    null,
  );
  const [interventions, setInterventions] = useState<InterventionReportRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [studentMasterList, setStudentMasterList] = useState<StudentMasterListRow[]>([]);
  const [classEnrollment, setClassEnrollment] = useState<ClassEnrollmentRow[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformanceReportRow[]>([]);
  const [interventionParticipation, setInterventionParticipation] = useState<
    InterventionParticipationRow[]
  >([]);
  const [assessmentSummary, setAssessmentSummary] = useState<AssessmentSummaryRow[]>(
    [],
  );
  const [systemUsage, setSystemUsage] = useState<SystemUsageReport | null>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const reportQuery = useMemo<ReportQuery>(
    () => ({
      classId: selectedClassId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
      limit: 200,
    }),
    [dateFrom, dateTo, selectedClassId],
  );

  const fetchClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
      const nextClasses =
        scope === 'admin'
          ? (await classService.getAll({ page: 1, limit: 200 })).data.data ?? []
          : (await dashboardService.getTeacherClasses()).data ?? [];
      setClasses(nextClasses);
      setSelectedClassId((current) => current || nextClasses[0]?.id || '');
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  }, [scope]);

  const fetchClassRecords = useCallback(async () => {
    if (!selectedClassId) {
      setRecords([]);
      setSelectedRecordId('');
      return;
    }

    try {
      setLoadingRecords(true);
      const res = await classRecordService.getByClass(selectedClassId);
      const nextRecords = Array.isArray(res.data) ? res.data : [];
      setRecords(nextRecords);
      setSelectedRecordId((current) => {
        if (current && nextRecords.some((record) => record.id === current)) {
          return current;
        }
        return nextRecords[0]?.id ?? '';
      });
    } catch {
      toast.error('Failed to load class records');
      setRecords([]);
      setSelectedRecordId('');
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedClassId]);

  const fetchClassRecordSummary = useCallback(async () => {
    if (!selectedRecordId) {
      setAverage(null);
      setDistribution(null);
      setInterventions([]);
      return;
    }

    const [averageRes, distributionRes, interventionRes] = await Promise.all([
      classRecordService.getClassAverageReport(selectedRecordId),
      classRecordService.getDistributionReport(selectedRecordId),
      classRecordService.getInterventionReport(selectedRecordId),
    ]);
    setAverage(averageRes.data);
    setDistribution(distributionRes.data);
    setInterventions(interventionRes.data ?? []);
  }, [selectedRecordId]);

  const fetchReports = useCallback(async () => {
    try {
      setLoadingReports(true);

      await fetchClassRecordSummary();

      const [
        studentMasterListRes,
        classEnrollmentRes,
        studentPerformanceRes,
        interventionParticipationRes,
        assessmentSummaryRes,
        systemUsageRes,
      ] = await Promise.all([
        reportService.getStudentMasterList(reportQuery),
        reportService.getClassEnrollment(reportQuery),
        reportService.getStudentPerformance(reportQuery),
        reportService.getInterventionParticipation(reportQuery),
        reportService.getAssessmentSummary(reportQuery),
        reportService.getSystemUsage({
          dateFrom: reportQuery.dateFrom,
          dateTo: reportQuery.dateTo,
        }),
      ]);

      setStudentMasterList(studentMasterListRes.data ?? []);
      setClassEnrollment(classEnrollmentRes.data ?? []);
      setStudentPerformance(studentPerformanceRes.data ?? []);
      setInterventionParticipation(interventionParticipationRes.data ?? []);
      setAssessmentSummary(assessmentSummaryRes.data ?? []);
      setSystemUsage(systemUsageRes.data ?? null);
    } catch {
      toast.error('Failed to load reports');
      setStudentMasterList([]);
      setClassEnrollment([]);
      setStudentPerformance([]);
      setInterventionParticipation([]);
      setAssessmentSummary([]);
      setSystemUsage(null);
    } finally {
      setLoadingReports(false);
    }
  }, [fetchClassRecordSummary, reportQuery]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchClassRecords();
  }, [fetchClassRecords]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedClassId) params.set('classId', selectedClassId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('export', 'csv');

    const endpointMap: Record<ReportTab, string | null> = {
      classRecord: '/api/reports/intervention-participation',
      studentMasterList: '/api/reports/student-master-list',
      classEnrollment: '/api/reports/class-enrollment',
      studentPerformance: '/api/reports/student-performance',
      interventionParticipation: '/api/reports/intervention-participation',
      assessmentSummary: '/api/reports/assessment-summary',
      systemUsage: '/api/reports/system-usage',
    };

    const endpoint = endpointMap[activeTab];
    if (!endpoint) {
      toast.error('Select a class record before exporting');
      return;
    }

    window.open(`${endpoint}?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const totalUsageActions = (systemUsage?.topActions ?? []).reduce(
    (sum, row) => sum + row.total,
    0,
  );

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-[1.8rem]" />
        <Skeleton className="h-28 rounded-[1.5rem]" />
        <Skeleton className="h-96 rounded-[1.5rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge={scope === 'teacher' ? 'Teacher Reports Hub' : 'Admin Reports Hub'}
      title={heading}
      description={description}
      actions={
        <Button variant="teacher" onClick={handleExport} className="rounded-2xl px-5">
          <Download className="h-4 w-4" />
          Export {reportTabs.find((tab) => tab.value === activeTab)?.label ?? 'Report'}
        </Button>
      }
      stats={
        <>
          <TeacherStatCard
            label="Classes Connected"
            value={classes.length}
            caption="Data sources ready for reporting"
            icon={Layers3}
            accent="sky"
          />
          <TeacherStatCard
            label="Report Windows"
            value={records.length}
            caption={loadingRecords ? 'Refreshing grading records...' : 'Available grading periods'}
            icon={FileBarChart2}
            accent="teal"
          />
          <TeacherStatCard
            label="Class Average"
            value={average ? `${average.average.toFixed(1)}%` : '--'}
            caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} snapshot` : 'Choose a class'}
            icon={BarChart3}
            accent="amber"
          />
          <TeacherStatCard
            label="Intervention Queue"
            value={average?.interventionCount ?? 0}
            caption="Students flagged from this record"
            icon={GraduationCap}
            accent="rose"
          />
        </>
      }
    >
      <TeacherSectionCard
        title="Filters & Export Controls"
        description="Blend grading-period data with wider reporting windows to surface cleaner trends."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select w-full text-sm"
          >
            <option value="">Select class...</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subjectName} ({item.subjectCode}) - {item.section?.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRecordId}
            onChange={(event) => setSelectedRecordId(event.target.value)}
            className="teacher-select w-full text-sm"
            disabled={!selectedClassId || loadingRecords || records.length === 0}
          >
            <option value="">Select quarter...</option>
            {records.map((record) => (
              <option key={record.id} value={record.id}>
                {record.gradingPeriod} - {record.status}
              </option>
            ))}
          </select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="teacher-input h-12"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="teacher-input h-12"
          />
        </div>
      </TeacherSectionCard>

      {loadingReports ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-[1.5rem]" />
          <Skeleton className="h-[32rem] rounded-[1.8rem]" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
          <TabsList className="teacher-tab-list h-auto flex-wrap justify-start">
            {reportTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="teacher-tab px-4 py-2.5 text-sm font-bold"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="classRecord" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Class"
                value={selectedClass?.subjectName ?? '--'}
                caption={selectedClass?.section?.name ?? 'No section selected'}
              />
              <SummaryCard
                label="Average"
                value={average ? `${average.average.toFixed(2)}%` : '--'}
                caption="Latest computed class average"
              />
              <SummaryCard
                label="Student Count"
                value={average?.count ?? 0}
                caption="Students included in the record"
              />
              <SummaryCard
                label="For Intervention"
                value={average?.interventionCount ?? 0}
                caption="Students needing follow-up"
                tone="danger"
              />
            </div>

            <TeacherSectionCard
              title="Grade Distribution"
              description="A quick visual pulse of score clusters in the selected grading period."
            >
              {!distribution || distribution.total === 0 ? (
                <TeacherEmptyState
                  title="No finalized distribution yet"
                  description="Once the grading period has enough finalized scores, the distribution bands will appear here."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-5">
                  {Object.entries(distribution.distribution).map(([band, count], index) => (
                    <div
                      key={band}
                      className={cn(
                        'teacher-soft-panel teacher-panel-hover rounded-[1.35rem] px-4 py-5',
                        index % 2 === 0 ? 'teacher-highlight' : '',
                      )}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--teacher-text-muted)]">
                        {band}
                      </p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-[var(--teacher-text-strong)]">
                        {count}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TeacherSectionCard>

            <SimpleTableCard
              title="Intervention List"
              description="Students who fell below the selected record’s intervention thresholds."
              empty="No students are currently marked for intervention in this record."
              headers={['Student', 'Final Percentage', 'Remarks', 'Computed At']}
              rows={interventions.map((row) => [
                formatStudentName(row),
                `${Number(row.finalPercentage).toFixed(2)}%`,
                row.remarks,
                new Date(row.computedAt).toLocaleString('en-US'),
              ])}
            />
          </TabsContent>

          <TabsContent value="studentMasterList">
            <SimpleTableCard
              title="Student Master List"
              description="A clean roster snapshot across the currently selected report window."
              empty="No enrolled students matched the selected filters."
              headers={['Student', 'Email', 'LRN', 'Class', 'Section']}
              rows={studentMasterList.map((row) => [
                `${row.lastName}, ${row.firstName}`,
                row.email,
                row.lrn ?? '--',
                row.subjectCode ?? '--',
                row.sectionName ?? '--',
              ])}
            />
          </TabsContent>

          <TabsContent value="classEnrollment">
            <SimpleTableCard
              title="Class Enrollment"
              description="Monitor class size and teacher ownership at a glance."
              empty="No class enrollment data matched the selected filters."
              headers={['Class', 'Section', 'Teacher', 'Enrollment']}
              rows={classEnrollment.map((row) => [
                `${row.subjectName} (${row.subjectCode})`,
                row.section?.name ?? '--',
                row.teacher
                  ? `${row.teacher.lastName ?? ''}, ${row.teacher.firstName ?? ''}`.trim()
                  : '--',
                row.enrollmentCount,
              ])}
            />
          </TabsContent>

          <TabsContent value="studentPerformance">
            <SimpleTableCard
              title="Student Performance"
              description="Cross-check blended performance and active risk flags in one place."
              empty="No student performance data matched the selected filters."
              headers={['Student', 'Class', 'Blended', 'At Risk', 'Threshold']}
              rows={studentPerformance.map((row) => [
                `${row.lastName}, ${row.firstName}`,
                `${row.subjectCode}`,
                row.blendedScore ?? '--',
                row.isAtRisk ? 'Yes' : 'No',
                row.thresholdApplied ?? '--',
              ])}
            />
          </TabsContent>

          <TabsContent value="interventionParticipation">
            <SimpleTableCard
              title="Intervention Participation"
              description="Track case status, completion rates, and earned XP for assigned learners."
              empty="No intervention cases matched the selected filters."
              headers={['Student', 'Class', 'Status', 'Completion', 'XP']}
              rows={interventionParticipation.map((row) => [
                row.studentName || row.email || row.studentId,
                row.subjectCode ?? '--',
                row.status,
                `${row.completionRate}%`,
                row.xpTotal,
              ])}
            />
          </TabsContent>

          <TabsContent value="assessmentSummary">
            <SimpleTableCard
              title="Assessment Summary"
              description="See assessment throughput and score health without leaving the reports flow."
              empty="No assessments matched the selected filters."
              headers={['Title', 'Class', 'Quarter', 'Submissions', 'Average']}
              rows={assessmentSummary.map((row) => [
                row.title,
                row.subjectCode ?? '--',
                row.quarter ?? '--',
                row.submittedAttempts,
                row.averageScore ?? '--',
              ])}
            />
          </TabsContent>

          <TabsContent value="systemUsage" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Lesson Completions"
                value={systemUsage?.lessonCompletions ?? 0}
                caption="Learning progress events"
              />
              <SummaryCard
                label="Assessment Submissions"
                value={systemUsage?.assessmentSubmissions ?? 0}
                caption="Submitted attempts"
              />
              <SummaryCard
                label="Intervention Opens"
                value={systemUsage?.interventionOpens ?? 0}
                caption="Cases started"
                tone="accent"
              />
              <SummaryCard
                label="Tracked Actions"
                value={totalUsageActions}
                caption="Top activity volume"
                tone="accent"
              />
            </div>
            <SimpleTableCard
              title="Top Actions"
              description="The most frequent user actions captured inside the selected date range."
              empty="No usage activity matched the selected filters."
              headers={['Action', 'Count']}
              rows={(systemUsage?.topActions ?? []).map((row) => [row.action, row.total])}
            />
          </TabsContent>
        </Tabs>
      )}
    </TeacherPageShell>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: 'default' | 'accent' | 'danger';
}) {
  return (
    <div
      className={cn(
        'teacher-soft-panel teacher-panel-hover rounded-[1.5rem] px-5 py-5',
        tone === 'accent' && 'teacher-highlight',
        tone === 'danger' && 'bg-rose-50/75 dark:bg-rose-950/20',
      )}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--teacher-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-3 text-3xl font-black tracking-tight text-[var(--teacher-text-strong)]',
          tone === 'danger' && 'text-rose-600 dark:text-rose-300',
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-2 text-xs font-medium text-[var(--teacher-text-muted)]">{caption}</p>
      ) : null}
    </div>
  );
}

function SimpleTableCard({
  title,
  description,
  headers,
  rows,
  empty,
}: {
  title: string;
  description?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  empty: string;
}) {
  return (
    <TeacherSectionCard title={title} description={description}>
      {rows.length === 0 ? (
        <TeacherEmptyState title={`No data for ${title.toLowerCase()}`} description={empty} />
      ) : (
        <div className="teacher-table-shell">
          <Table>
            <TableHeader className="teacher-table-head [&_tr]:border-white/15">
              <TableRow className="border-white/10 hover:bg-transparent">
                {headers.map((header) => (
                  <TableHead
                    key={header}
                    className="h-12 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {rows.map((row, rowIndex) => (
                <TableRow
                  key={`${title}-${rowIndex}`}
                  className="teacher-table-row border-white/10"
                >
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={`${title}-${rowIndex}-${cellIndex}`}
                      className="text-[13px] text-[var(--teacher-text-strong)]"
                    >
                      {cell ?? '--'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </TeacherSectionCard>
  );
}
