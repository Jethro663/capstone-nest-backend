'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
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

type SharedCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  adminMode: boolean;
  className?: string;
};

type SummaryCardProps = {
  label: string;
  value: string | number;
  caption?: string;
  tone?: 'default' | 'accent' | 'danger';
  adminMode: boolean;
};

type SimpleTableCardProps = {
  title: string;
  description?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  empty: string;
  adminMode: boolean;
};

export function ClassRecordReportsPage({
  heading,
  description,
  scope,
}: ClassRecordReportsPageProps) {
  const isAdmin = scope === 'admin';
  const [activeTab, setActiveTab] = useState<ReportTab>('classRecord');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [average, setAverage] = useState<ClassAverageReport | null>(null);
  const [distribution, setDistribution] = useState<GradeDistributionReport | null>(null);
  const [interventions, setInterventions] = useState<InterventionReportRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [studentMasterList, setStudentMasterList] = useState<StudentMasterListRow[]>([]);
  const [classEnrollment, setClassEnrollment] = useState<ClassEnrollmentRow[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformanceReportRow[]>([]);
  const [interventionParticipation, setInterventionParticipation] = useState<InterventionParticipationRow[]>([]);
  const [assessmentSummary, setAssessmentSummary] = useState<AssessmentSummaryRow[]>([]);
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

    const endpointMap: Record<ReportTab, string> = {
      classRecord: '/api/reports/intervention-participation',
      studentMasterList: '/api/reports/student-master-list',
      classEnrollment: '/api/reports/class-enrollment',
      studentPerformance: '/api/reports/student-performance',
      interventionParticipation: '/api/reports/intervention-participation',
      assessmentSummary: '/api/reports/assessment-summary',
      systemUsage: '/api/reports/system-usage',
    };

    window.open(`${endpointMap[activeTab]}?${params.toString()}`, '_blank', 'noopener,noreferrer');
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

  const shellBadge = isAdmin ? 'Admin Reports Hub' : 'Teacher Reports Hub';
  const shellActions = (
    <Button
      variant={isAdmin ? 'outline' : 'teacher'}
      onClick={handleExport}
      className={isAdmin ? 'admin-button-outline rounded-xl px-4 font-black' : 'rounded-2xl px-5'}
    >
      <Download className="h-4 w-4" />
      Export {reportTabs.find((tab) => tab.value === activeTab)?.label ?? 'Report'}
    </Button>
  );

  const statCards = isAdmin ? (
    <>
      <AdminStatCard label="Classes Connected" value={classes.length} caption="Data sources ready for reporting" icon={Layers3} accent="sky" />
      <AdminStatCard label="Report Windows" value={records.length} caption={loadingRecords ? 'Refreshing grading records...' : 'Available grading periods'} icon={FileBarChart2} accent="violet" />
      <AdminStatCard label="Class Average" value={average ? `${average.average.toFixed(1)}%` : '--'} caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} snapshot` : 'Choose a class'} icon={BarChart3} accent="amber" />
      <AdminStatCard label="Intervention Queue" value={average?.interventionCount ?? 0} caption="Students flagged from this record" icon={GraduationCap} accent="rose" />
    </>
  ) : (
    <>
      <TeacherStatCard label="Classes Connected" value={classes.length} caption="Data sources ready for reporting" icon={Layers3} accent="sky" />
      <TeacherStatCard label="Report Windows" value={records.length} caption={loadingRecords ? 'Refreshing grading records...' : 'Available grading periods'} icon={FileBarChart2} accent="teal" />
      <TeacherStatCard label="Class Average" value={average ? `${average.average.toFixed(1)}%` : '--'} caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} snapshot` : 'Choose a class'} icon={BarChart3} accent="amber" />
      <TeacherStatCard label="Intervention Queue" value={average?.interventionCount ?? 0} caption="Students flagged from this record" icon={GraduationCap} accent="rose" />
    </>
  );

  const filterCard = (
    <SharedSectionCard adminMode={isAdmin} title="Filters & Export Controls" description="Blend grading-period data with wider reporting windows to surface cleaner trends.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          className={isAdmin ? 'admin-select w-full text-sm' : 'teacher-select w-full text-sm'}
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
          className={isAdmin ? 'admin-select w-full text-sm' : 'teacher-select w-full text-sm'}
          disabled={!selectedClassId || loadingRecords || records.length === 0}
        >
          <option value="">Select quarter...</option>
          {records.map((record) => (
            <option key={record.id} value={record.id}>
              {record.gradingPeriod} - {record.status}
            </option>
          ))}
        </select>

        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={isAdmin ? 'admin-input h-12' : 'teacher-input h-12'} />
        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={isAdmin ? 'admin-input h-12' : 'teacher-input h-12'} />
      </div>
    </SharedSectionCard>
  );

  const loadingState = loadingReports ? (
    <div className="space-y-4">
      <Skeleton className="h-20 rounded-[1.5rem]" />
      <Skeleton className="h-[32rem] rounded-[1.8rem]" />
    </div>
  ) : (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
      <TabsList className={isAdmin ? 'admin-tab-list h-auto flex-wrap justify-start' : 'teacher-tab-list h-auto flex-wrap justify-start'}>
        {reportTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className={isAdmin ? 'admin-tab px-4 py-2.5 text-sm font-bold' : 'teacher-tab px-4 py-2.5 text-sm font-bold'}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="classRecord" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard adminMode={isAdmin} label="Class" value={selectedClass?.subjectName ?? '--'} caption={selectedClass?.section?.name ?? 'No section selected'} />
          <SummaryCard adminMode={isAdmin} label="Average" value={average ? `${average.average.toFixed(2)}%` : '--'} caption="Latest computed class average" />
          <SummaryCard adminMode={isAdmin} label="Student Count" value={average?.count ?? 0} caption="Students included in the record" />
          <SummaryCard adminMode={isAdmin} label="For Intervention" value={average?.interventionCount ?? 0} caption="Students needing follow-up" tone="danger" />
        </div>

        <SharedSectionCard adminMode={isAdmin} title="Grade Distribution" description="A quick visual pulse of score clusters in the selected grading period.">
          {!distribution || distribution.total === 0 ? (
            isAdmin ? (
              <AdminEmptyState title="No finalized distribution yet" description="Once the grading period has enough finalized scores, the distribution bands will appear here." />
            ) : (
              <TeacherEmptyState title="No finalized distribution yet" description="Once the grading period has enough finalized scores, the distribution bands will appear here." />
            )
          ) : (
            <div className="grid gap-3 md:grid-cols-5">
              {Object.entries(distribution.distribution).map(([band, count], index) => (
                <div
                  key={band}
                  className={cn(
                    isAdmin
                      ? 'rounded-[1.35rem] border border-[var(--admin-outline)] bg-white px-4 py-5 shadow-[var(--admin-shadow)]'
                      : 'teacher-soft-panel teacher-panel-hover rounded-[1.35rem] px-4 py-5',
                    !isAdmin && index % 2 === 0 ? 'teacher-highlight' : '',
                    isAdmin && index % 2 === 0 ? 'bg-[linear-gradient(180deg,#fff7f7,#ffffff)]' : '',
                  )}
                >
                  <p className={cn('text-[11px] font-black uppercase tracking-[0.24em]', isAdmin ? 'text-[var(--admin-text-muted)]' : 'text-[var(--teacher-text-muted)]')}>
                    {band}
                  </p>
                  <p className={cn('mt-3 text-3xl font-black tracking-tight', isAdmin ? 'text-[var(--admin-text-strong)]' : 'text-[var(--teacher-text-strong)]')}>
                    {count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SharedSectionCard>

        <SimpleTableCard
          adminMode={isAdmin}
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
        <SimpleTableCard adminMode={isAdmin} title="Student Master List" description="A clean roster snapshot across the currently selected report window." empty="No enrolled students matched the selected filters." headers={['Student', 'Email', 'LRN', 'Class', 'Section']} rows={studentMasterList.map((row) => [`${row.lastName}, ${row.firstName}`, row.email, row.lrn ?? '--', row.subjectCode ?? '--', row.sectionName ?? '--'])} />
      </TabsContent>

      <TabsContent value="classEnrollment">
        <SimpleTableCard adminMode={isAdmin} title="Class Enrollment" description="Monitor class size and teacher ownership at a glance." empty="No class enrollment data matched the selected filters." headers={['Class', 'Section', 'Teacher', 'Enrollment']} rows={classEnrollment.map((row) => [`${row.subjectName} (${row.subjectCode})`, row.section?.name ?? '--', row.teacher ? `${row.teacher.lastName ?? ''}, ${row.teacher.firstName ?? ''}`.trim() : '--', row.enrollmentCount])} />
      </TabsContent>

      <TabsContent value="studentPerformance">
        <SimpleTableCard adminMode={isAdmin} title="Student Performance" description="Cross-check blended performance and active risk flags in one place." empty="No student performance data matched the selected filters." headers={['Student', 'Class', 'Blended', 'At Risk', 'Threshold']} rows={studentPerformance.map((row) => [`${row.lastName}, ${row.firstName}`, row.subjectCode, row.blendedScore ?? '--', row.isAtRisk ? 'Yes' : 'No', row.thresholdApplied ?? '--'])} />
      </TabsContent>

      <TabsContent value="interventionParticipation">
        <p className={cn('mb-3 text-xs', isAdmin ? 'text-[var(--admin-text-muted)]' : 'text-[var(--teacher-text-muted)]')}>
          Advisory only: intervention outcomes are non-graded metadata and never mutate official class records.
        </p>
        <SimpleTableCard adminMode={isAdmin} title="Intervention Participation" description="Track case status, completion rates, and earned XP for assigned learners." empty="No intervention cases matched the selected filters." headers={['Student', 'Class', 'Status', 'Completion', 'XP']} rows={interventionParticipation.map((row) => [row.studentName || row.email || row.studentId, row.subjectCode ?? '--', row.status, `${row.completionRate}%`, row.xpTotal])} />
      </TabsContent>

      <TabsContent value="assessmentSummary">
        <SimpleTableCard adminMode={isAdmin} title="Assessment Summary" description="See assessment throughput and score health without leaving the reports flow." empty="No assessments matched the selected filters." headers={['Title', 'Class', 'Quarter', 'Submissions', 'Average']} rows={assessmentSummary.map((row) => [row.title, row.subjectCode ?? '--', row.quarter ?? '--', row.submittedAttempts, row.averageScore ?? '--'])} />
      </TabsContent>

      <TabsContent value="systemUsage" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard adminMode={isAdmin} label="Lesson Completions" value={systemUsage?.lessonCompletions ?? 0} caption="Learning progress events" />
          <SummaryCard adminMode={isAdmin} label="Assessment Submissions" value={systemUsage?.assessmentSubmissions ?? 0} caption="Submitted attempts" />
          <SummaryCard adminMode={isAdmin} label="Intervention Opens" value={systemUsage?.interventionOpens ?? 0} caption="Cases started" tone="accent" />
          <SummaryCard adminMode={isAdmin} label="Tracked Actions" value={totalUsageActions} caption="Top activity volume" tone="accent" />
        </div>
        <SimpleTableCard adminMode={isAdmin} title="Top Actions" description="The most frequent user actions captured inside the selected date range." empty="No usage activity matched the selected filters." headers={['Action', 'Count']} rows={(systemUsage?.topActions ?? []).map((row) => [row.action, row.total])} />
      </TabsContent>
    </Tabs>
  );

  return isAdmin ? (
    <AdminPageShell badge={shellBadge} title={heading} description={description} actions={shellActions} stats={statCards}>
      {filterCard}
      {loadingState}
    </AdminPageShell>
  ) : (
    <TeacherPageShell badge={shellBadge} title={heading} description={description} actions={shellActions} stats={statCards}>
      {filterCard}
      {loadingState}
    </TeacherPageShell>
  );
}

function SharedSectionCard({
  title,
  description,
  children,
  action,
  adminMode,
  className,
}: SharedCardProps) {
  return adminMode ? (
    <AdminSectionCard title={title} description={description} action={action} className={className}>
      {children}
    </AdminSectionCard>
  ) : (
    <TeacherSectionCard title={title} description={description} action={action} className={className}>
      {children}
    </TeacherSectionCard>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  tone = 'default',
  adminMode,
}: SummaryCardProps) {
  if (adminMode) {
    return (
      <div
        className={cn(
          'rounded-[1.5rem] border border-[var(--admin-outline)] bg-white px-5 py-5 shadow-[var(--admin-shadow)]',
          tone === 'accent' && 'bg-[linear-gradient(180deg,#f8fbff,#ffffff)]',
          tone === 'danger' && 'bg-[linear-gradient(180deg,#fff2f2,#ffffff)]',
        )}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--admin-text-muted)]">{label}</p>
        <p className={cn('mt-3 text-3xl font-black tracking-tight text-[var(--admin-text-strong)]', tone === 'danger' && 'text-rose-600', tone === 'accent' && 'text-[#2563eb]')}>{value}</p>
        {caption ? <p className="mt-2 text-xs font-medium text-[var(--admin-text-muted)]">{caption}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'teacher-soft-panel teacher-panel-hover rounded-[1.5rem] px-5 py-5',
        tone === 'accent' && 'teacher-highlight',
        tone === 'danger' && 'bg-rose-50/75 dark:bg-rose-950/20',
      )}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--teacher-text-muted)]">{label}</p>
      <p className={cn('mt-3 text-3xl font-black tracking-tight text-[var(--teacher-text-strong)]', tone === 'danger' && 'text-rose-600 dark:text-rose-300')}>{value}</p>
      {caption ? <p className="mt-2 text-xs font-medium text-[var(--teacher-text-muted)]">{caption}</p> : null}
    </div>
  );
}

function SimpleTableCard({
  title,
  description,
  headers,
  rows,
  empty,
  adminMode,
}: SimpleTableCardProps) {
  return (
    <SharedSectionCard adminMode={adminMode} title={title} description={description}>
      {rows.length === 0 ? (
        adminMode ? (
          <AdminEmptyState title={`No data for ${title.toLowerCase()}`} description={empty} />
        ) : (
          <TeacherEmptyState title={`No data for ${title.toLowerCase()}`} description={empty} />
        )
      ) : (
        <div className={adminMode ? 'admin-table-shell' : 'teacher-table-shell'}>
          <Table>
            <TableHeader className={adminMode ? 'admin-table-head' : 'teacher-table-head [&_tr]:border-white/15'}>
              <TableRow className={adminMode ? 'hover:bg-transparent' : 'border-white/10 hover:bg-transparent'}>
                {headers.map((header) => (
                  <TableHead
                    key={header}
                    className={cn(
                      'h-12 text-[11px] font-black uppercase tracking-[0.22em]',
                      adminMode ? 'text-[var(--admin-text-muted)]' : 'text-[var(--teacher-text-muted)]',
                    )}
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {rows.map((row, rowIndex) => (
                <TableRow key={`${title}-${rowIndex}`} className={adminMode ? 'admin-table-row' : 'teacher-table-row border-white/10'}>
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={`${title}-${rowIndex}-${cellIndex}`}
                      className={cn('text-[13px]', adminMode ? 'text-[var(--admin-text-strong)]' : 'text-[var(--teacher-text-strong)]')}
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
    </SharedSectionCard>
  );
}
