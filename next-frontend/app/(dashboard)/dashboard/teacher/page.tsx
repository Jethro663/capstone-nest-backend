'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { dashboardService } from '@/services/dashboard-service';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/utils/helpers';
import type { Lesson } from '@/types/lesson';
import type { ClassItem } from '@/types/class';
import type { Assessment } from '@/types/assessment';

export default function TeacherDashboardPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [interval, setInterval] = useState(30000);

  const fetchData = useCallback(async () => {
    try {
      const [lessonsRes, classesRes, assessmentsRes] = await Promise.all([
        dashboardService.getTeacherLessons(),
        dashboardService.getTeacherClasses(),
        dashboardService.getTeacherAssessments(),
      ]);
      setLessons(lessonsRes.data || []);
      setClasses(classesRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setLastUpdated(new Date());
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData, interval, autoRefresh);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/teacher/lessons">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">My Lessons</p>
              <p className="text-3xl font-bold text-blue-600">{lessons.length}</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">My Classes</p>
            <p className="text-3xl font-bold text-green-600">{classes.length}</p>
          </CardContent>
        </Card>
        <Link href="/dashboard/teacher/assessments">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Assessments</p>
              <p className="text-3xl font-bold text-purple-600">{assessments.length}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No lessons created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.slice(0, 5).map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell className="font-medium">{lesson.title}</TableCell>
                    <TableCell className="text-muted-foreground">{lesson.classId.slice(0, 8)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(lesson.createdAt || '')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assessments created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.slice(0, 5).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="uppercase text-muted-foreground">{a.type}</TableCell>
                    <TableCell className="text-muted-foreground">{a.dueDate ? formatDate(a.dueDate) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
