'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="min-w-[260px] rounded-md border px-3 py-2 text-sm"
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
            className="min-w-[220px] rounded-md border px-3 py-2 text-sm"
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
            className="max-w-[180px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="max-w-[180px]"
          />
        </CardContent>
      </Card>

      {loadingReports ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
          <TabsList className="h-auto flex-wrap justify-start">
            {reportTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="classRecord" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{selectedClass?.subjectName ?? '--'}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedClass?.section?.name ?? '--'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {average ? `${average.average.toFixed(2)}%` : '--'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Student Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{average?.count ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">For Intervention</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-rose-600">
                    {average?.interventionCount ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {!distribution || distribution.total === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No finalized grade distribution available yet.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-5">
                    {Object.entries(distribution.distribution).map(([band, count]) => (
                      <div key={band} className="rounded-lg border p-4">
                        <p className="text-xs text-muted-foreground">{band}</p>
                        <p className="mt-2 text-2xl font-bold">{count}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intervention List</CardTitle>
              </CardHeader>
              <CardContent>
                {interventions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students are currently marked for intervention in this record.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Final Percentage</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Computed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interventions.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {formatStudentName(row)}
                          </TableCell>
                          <TableCell>{Number(row.finalPercentage).toFixed(2)}%</TableCell>
                          <TableCell>{row.remarks}</TableCell>
                          <TableCell>
                            {new Date(row.computedAt).toLocaleString('en-US')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="studentMasterList">
            <SimpleTableCard
              title="Student Master List"
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
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Lesson Completions" value={systemUsage?.lessonCompletions ?? 0} />
              <SummaryCard
                label="Assessment Submissions"
                value={systemUsage?.assessmentSubmissions ?? 0}
              />
              <SummaryCard label="Intervention Opens" value={systemUsage?.interventionOpens ?? 0} />
              <SummaryCard
                label="Intervention Closures"
                value={systemUsage?.interventionClosures ?? 0}
              />
            </div>
            <SimpleTableCard
              title="Top Actions"
              empty="No usage activity matched the selected filters."
              headers={['Action', 'Count']}
              rows={(systemUsage?.topActions ?? []).map((row) => [row.action, row.total])}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SimpleTableCard({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={`${title}-${rowIndex}-${cellIndex}`}>
                      {cell ?? '--'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
