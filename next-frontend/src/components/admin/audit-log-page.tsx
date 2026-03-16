'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/admin-service';
import type { AuditLogEntry, UsageSummary } from '@/types/audit';
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

function formatActor(row: AuditLogEntry): string {
  const first = row.actor?.firstName?.trim() ?? '';
  const last = row.actor?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return row.actor?.email ?? row.actorId;
}

export function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAuditData = useCallback(async () => {
    try {
      setLoading(true);
      const [auditRes, usageRes] = await Promise.all([
        adminService.getAuditLogs({
          page,
          limit: 20,
          action: action || undefined,
          actorId: actorId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        adminService.getUsageSummary({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      ]);
      setRows(auditRes.data ?? []);
      setTotal(auditRes.total);
      setTotalPages(auditRes.totalPages);
      setUsageSummary(usageRes.data ?? null);
    } catch {
      toast.error('Failed to load audit data');
      setRows([]);
      setUsageSummary(null);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [action, actorId, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Trail</h1>
          <p className="text-sm text-muted-foreground">
            Review recent sensitive system actions and usage summaries across the
            platform.
          </p>
        </div>
        <Button
          variant="outline"
          asChild
        >
          <a
            href={adminService.getActivityExportUrl({
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
            })}
          >
            Export CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            value={action}
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value);
            }}
            placeholder="Filter by action"
            className="max-w-xs"
          />
          <Input
            value={actorId}
            onChange={(event) => {
              setPage(1);
              setActorId(event.target.value);
            }}
            placeholder="Filter by actor ID"
            className="max-w-xs"
          />
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

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="usage">Usage Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{total} matching record(s)</p>

              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No audit log entries found for the current filters.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{new Date(row.createdAt).toLocaleString('en-US')}</TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell className="font-medium">{formatActor(row)}</TableCell>
                        <TableCell>
                          {row.targetType}:{' '}
                          <span className="text-muted-foreground">{row.targetId}</span>
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {row.metadata ? JSON.stringify(row.metadata) : 'No metadata'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {page} of {Math.max(totalPages, 1)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <UsageCard label="Active Teachers" value={usageSummary?.activeTeachers ?? 0} />
            <UsageCard label="Active Students" value={usageSummary?.activeStudents ?? 0} />
            <UsageCard
              label="Assessment Submissions"
              value={usageSummary?.assessmentSubmissions ?? 0}
            />
            <UsageCard
              label="Lesson Completions"
              value={usageSummary?.lessonCompletions ?? 0}
            />
            <UsageCard
              label="Intervention Opens"
              value={usageSummary?.interventionOpens ?? 0}
            />
            <UsageCard
              label="Intervention Closures"
              value={usageSummary?.interventionClosures ?? 0}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {(usageSummary?.topActions?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No usage data found for the selected date range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageSummary?.topActions.map((row) => (
                      <TableRow key={row.action}>
                        <TableCell>{row.action}</TableCell>
                        <TableCell>{row.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsageCard({ label, value }: { label: string; value: number }) {
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
