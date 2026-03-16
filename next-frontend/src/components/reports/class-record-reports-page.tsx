'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { classRecordService } from '@/services/class-record-service';
import { classService } from '@/services/class-service';
import { dashboardService } from '@/services/dashboard-service';
import type {
  ClassAverageReport,
  ClassRecord,
  GradeDistributionReport,
  InterventionReportRow,
} from '@/types/class-record';
import type { ClassItem } from '@/types/class';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export function ClassRecordReportsPage({
  heading,
  description,
  scope,
}: ClassRecordReportsPageProps) {
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

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
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

  const fetchReports = useCallback(async () => {
    if (!selectedRecordId) {
      setAverage(null);
      setDistribution(null);
      setInterventions([]);
      return;
    }

    try {
      setLoadingReports(true);
      const [averageRes, distributionRes, interventionRes] = await Promise.all([
        classRecordService.getClassAverageReport(selectedRecordId),
        classRecordService.getDistributionReport(selectedRecordId),
        classRecordService.getInterventionReport(selectedRecordId),
      ]);
      setAverage(averageRes.data);
      setDistribution(distributionRes.data);
      setInterventions(interventionRes.data ?? []);
    } catch {
      toast.error('Failed to load class record reports');
      setAverage(null);
      setDistribution(null);
      setInterventions([]);
    } finally {
      setLoadingReports(false);
    }
  }, [selectedRecordId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchClassRecords();
  }, [fetchClassRecords]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
      <div>
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-3">
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
      </div>

      {!selectedClassId ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a class to view report data.
          </CardContent>
        </Card>
      ) : loadingRecords ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No class records available for the selected class yet.
          </CardContent>
        </Card>
      ) : loadingReports ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-60 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
