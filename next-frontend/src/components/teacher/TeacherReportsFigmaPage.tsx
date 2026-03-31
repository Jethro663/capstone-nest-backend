'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  BarChart3,
  ClipboardList,
  Download,
  Filter,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { classRecordService } from '@/services/class-record-service';
import { dashboardService } from '@/services/dashboard-service';
import { reportService } from '@/services/report-service';
import type {
  ClassAverageReport,
  ClassRecord,
  GradeDistributionReport,
  InterventionReportRow,
} from '@/types/class-record';
import type { ClassItem } from '@/types/class';
import type {
  ReportQuery,
  StudentMasterListRow,
  StudentPerformanceReportRow,
} from '@/types/report';
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
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

type TeacherReportView = 'studentMasterList' | 'studentPerformance' | 'classRecord';

const teacherViews: Array<{ value: TeacherReportView; label: string; icon: ElementType }> = [
  { value: 'studentMasterList', label: 'Master List', icon: ListChecks },
  { value: 'studentPerformance', label: 'Student Performance', icon: TrendingUp },
  { value: 'classRecord', label: 'Class Record', icon: ClipboardList },
];

function formatStudentName(row: InterventionReportRow): string {
  const first = row.student?.firstName?.trim() ?? '';
  const last = row.student?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return row.student?.email ?? row.studentId;
}

export function TeacherReportsFigmaPage() {
  const [activeView, setActiveView] = useState<TeacherReportView>('studentMasterList');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [studentMasterList, setStudentMasterList] = useState<StudentMasterListRow[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformanceReportRow[]>([]);
  const [average, setAverage] = useState<ClassAverageReport | null>(null);
  const [distribution, setDistribution] = useState<GradeDistributionReport | null>(null);
  const [interventions, setInterventions] = useState<InterventionReportRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

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
      const nextClasses = (await dashboardService.getTeacherClasses()).data ?? [];
      setClasses(nextClasses);
      setSelectedClassId((current) => current || nextClasses[0]?.id || '');
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  const fetchClassRecords = useCallback(async () => {
    if (!selectedClassId) {
      setRecords([]);
      setSelectedRecordId('');
      return;
    }

    try {
      setLoadingRecords(true);
      const response = await classRecordService.getByClass(selectedClassId);
      const nextRecords = Array.isArray(response.data) ? response.data : [];
      setRecords(nextRecords);
      setSelectedRecordId((current) => {
        if (current && nextRecords.some((entry) => entry.id === current)) return current;
        return nextRecords[0]?.id ?? '';
      });
    } catch {
      toast.error('Failed to load grading periods');
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
      setLoadingData(true);
      await fetchClassRecordSummary();
      const [masterListRes, studentPerformanceRes] = await Promise.all([
        reportService.getStudentMasterList(reportQuery),
        reportService.getStudentPerformance(reportQuery),
      ]);
      setStudentMasterList(masterListRes.data ?? []);
      setStudentPerformance(studentPerformanceRes.data ?? []);
    } catch {
      toast.error('Failed to load reports');
      setStudentMasterList([]);
      setStudentPerformance([]);
      setAverage(null);
      setDistribution(null);
      setInterventions([]);
    } finally {
      setLoadingData(false);
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

    const endpointMap: Record<TeacherReportView, string> = {
      studentMasterList: '/api/reports/student-master-list',
      studentPerformance: '/api/reports/student-performance',
      classRecord: '/api/reports/intervention-participation',
    };

    window.open(`${endpointMap[activeView]}?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-16 rounded-[15px]" />
        <Skeleton className="h-[28rem] rounded-[15px]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Teacher Reports"
      title="Reports"
      description="Class and student performance analytics"
      actions={
        <Button variant="teacher" className="rounded-xl px-4" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      }
      stats={
        <>
          <TeacherStatCard
            label="Avg Class Grade"
            value={average ? `${average.average.toFixed(1)}%` : '--'}
            caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} snapshot` : 'Select a class'}
            icon={BarChart3}
            accent="teal"
          />
          <TeacherStatCard
            label="Passing Rate"
            value={average && average.count > 0 ? `${(((average.count - average.interventionCount) / average.count) * 100).toFixed(0)}%` : '--'}
            caption="Learners above intervention threshold"
            icon={TrendingUp}
            accent="sky"
          />
          <TeacherStatCard
            label="Highest Grade"
            value={
              interventions.length > 0
                ? Math.max(...interventions.map((row) => Number(row.finalPercentage))).toFixed(1)
                : '--'
            }
            caption="Highest finalized grade"
            icon={ListChecks}
            accent="amber"
          />
          <TeacherStatCard
            label="At Risk Students"
            value={average?.interventionCount ?? 0}
            caption="Students flagged for intervention"
            icon={ClipboardList}
            accent="rose"
          />
        </>
      }
    >
      <TeacherSectionCard title="Filters" className="teacher-figma-stagger">
        <div className="teacher-figma-toolbar">
          <div className="teacher-figma-toolbar__left">
            <Button
              type="button"
              variant="teacherOutline"
              className="rounded-xl px-3"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="teacher-select min-w-[190px] text-sm"
            >
              <option value="">Select class...</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subjectName} ({item.subjectCode})
                </option>
              ))}
            </select>
            <select
              value={selectedRecordId}
              onChange={(event) => setSelectedRecordId(event.target.value)}
              className="teacher-select min-w-[190px] text-sm"
              disabled={!selectedClassId || loadingRecords || records.length === 0}
            >
              <option value="">Select quarter...</option>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.gradingPeriod} - {record.status}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-figma-toolbar__right">
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="teacher-input h-10 w-[170px]"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="teacher-input h-10 w-[170px]"
            />
          </div>
        </div>
      </TeacherSectionCard>

      <div className="teacher-figma-segment teacher-figma-stagger">
        {teacherViews.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.value;
          return (
            <button
              key={view.value}
              type="button"
              className={cn('teacher-figma-segment__item', isActive && 'is-active')}
              onClick={() => setActiveView(view.value)}
            >
              <Icon className="h-4 w-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-[15px]" />
          <Skeleton className="h-[28rem] rounded-[15px]" />
        </div>
      ) : null}

      {!loadingData && activeView === 'studentMasterList' ? (
        <TeacherSectionCard
          title="Student Master List"
          description="Comprehensive class roster for the selected class and date range."
          className="teacher-figma-stagger"
        >
          {studentMasterList.length === 0 ? (
            <TeacherEmptyState
              title="No students found"
              description="No enrollment rows matched the current class and date filters."
            />
          ) : (
            <div className="teacher-table-shell">
              <Table>
                <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-0">
                  {studentMasterList.map((row) => (
                    <TableRow key={row.enrollmentId} className="teacher-table-row border-white/10">
                      <TableCell className="font-medium text-[var(--teacher-text-strong)]">
                        {row.lastName}, {row.firstName}
                      </TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">{row.email}</TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">{row.lrn ?? '--'}</TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">{row.subjectCode ?? '--'}</TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">{row.sectionName ?? '--'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TeacherSectionCard>
      ) : null}

      {!loadingData && activeView === 'studentPerformance' ? (
        <TeacherSectionCard
          title="Student Performance"
          description="Blended and risk-aware class performance snapshot."
          className="teacher-figma-stagger"
        >
          {studentPerformance.length === 0 ? (
            <TeacherEmptyState
              title="No performance rows found"
              description="No performance rows matched the selected filters."
            />
          ) : (
            <div className="teacher-table-shell">
              <Table>
                <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Class Record</TableHead>
                    <TableHead>Blended</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-0">
                  {studentPerformance.map((row) => (
                    <TableRow key={`${row.classId}-${row.studentId}`} className="teacher-table-row border-white/10">
                      <TableCell className="font-medium text-[var(--teacher-text-strong)]">
                        {row.lastName}, {row.firstName}
                      </TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">{row.subjectCode}</TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">{row.assessmentAverage?.toFixed(1) ?? '--'}</TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">{row.classRecordAverage?.toFixed(1) ?? '--'}</TableCell>
                      <TableCell className="font-semibold text-[var(--teacher-text-strong)]">{row.blendedScore?.toFixed(1) ?? '--'}</TableCell>
                      <TableCell className="text-[var(--teacher-text-strong)]">
                        {row.isAtRisk ? (
                          <span className="teacher-badge-danger border-0 px-2 py-1">At Risk</span>
                        ) : (
                          <span className="teacher-badge-success border-0 px-2 py-1">Stable</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TeacherSectionCard>
      ) : null}

      {!loadingData && activeView === 'classRecord' ? (
        <div className="space-y-4 teacher-figma-stagger">
          <TeacherSectionCard
            title="Grade Distribution"
            description="Distribution of finalized grades from the selected grading period."
          >
            {!distribution || distribution.total === 0 ? (
              <TeacherEmptyState
                title="No finalized distribution yet"
                description="Distribution appears after finalized class record scores are available."
              />
            ) : (
              <div className="space-y-3">
                {Object.entries(distribution.distribution).map(([band, count]) => {
                  const ratio = distribution.total > 0 ? (count / distribution.total) * 100 : 0;
                  return (
                    <div key={band} className="teacher-figma-distribution">
                      <div className="teacher-figma-distribution__meta">
                        <span>{band}</span>
                        <strong>{count}</strong>
                      </div>
                      <div className="teacher-figma-distribution__track">
                        <div className="teacher-figma-distribution__fill" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TeacherSectionCard>

          <TeacherSectionCard
            title="At-Risk Students"
            description="Students currently flagged by the selected class record window."
          >
            {interventions.length === 0 ? (
              <TeacherEmptyState
                title="No students marked at risk"
                description="At-risk rows appear here when learners fall below intervention threshold."
              />
            ) : (
              <div className="teacher-table-shell">
                <Table>
                  <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead>Student</TableHead>
                      <TableHead>Final Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Computed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {interventions.map((row) => (
                      <TableRow key={row.id} className="teacher-table-row border-white/10">
                        <TableCell className="font-medium text-[var(--teacher-text-strong)]">{formatStudentName(row)}</TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">{Number(row.finalPercentage).toFixed(1)}%</TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">{row.remarks}</TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">{new Date(row.computedAt).toLocaleDateString('en-US')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TeacherSectionCard>
        </div>
      ) : null}
    </TeacherPageShell>
  );
}
