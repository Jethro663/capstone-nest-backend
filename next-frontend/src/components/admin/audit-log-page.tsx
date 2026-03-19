'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, History, LineChart, Users } from 'lucide-react';
import { adminService } from '@/services/admin-service';
import type { AuditLogEntry, UsageSummary } from '@/types/audit';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

function UsageCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[32rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Audit Trail"
      title="Audit and Usage Oversight"
      description="Sensitive actions and usage summaries now sit in a cleaner oversight workspace, with stronger filters, clearer tabs, and more readable tables."
      actions={(
        <Button variant="outline" className="admin-button-outline rounded-xl px-4 font-black" asChild>
          <a href={adminService.getActivityExportUrl({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      )}
      stats={(
        <>
          <AdminStatCard label="Matching Logs" value={total} caption="For the current filters" icon={History} accent="emerald" />
          <AdminStatCard label="Teachers" value={usageSummary?.activeTeachers ?? 0} caption="Active in the selected date range" icon={Users} accent="sky" />
          <AdminStatCard label="Students" value={usageSummary?.activeStudents ?? 0} caption="Active in the selected date range" icon={Users} accent="amber" />
          <AdminStatCard label="Top Actions" value={usageSummary?.topActions?.length ?? 0} caption="Tracked usage categories" icon={LineChart} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Filters" description="Filter the audit trail with a more deliberate control panel rather than a plain form row.">
        <div className="grid gap-3 xl:grid-cols-4">
          <Input value={action} onChange={(event) => { setPage(1); setAction(event.target.value); }} placeholder="Filter by action" className="admin-input" />
          <Input value={actorId} onChange={(event) => { setPage(1); setActorId(event.target.value); }} placeholder="Filter by actor ID" className="admin-input" />
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="admin-input" />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="admin-input" />
        </div>
      </AdminSectionCard>

      <Tabs defaultValue="audit" className="space-y-6">
        <AdminSectionCard title="Audit Views" description="Switch between raw audit records and the usage summary without leaving the same admin shell.">
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="audit" className="admin-tab rounded-xl px-4 font-black">Audit Trail</TabsTrigger>
            <TabsTrigger value="usage" className="admin-tab rounded-xl px-4 font-black">Usage Summary</TabsTrigger>
          </TabsList>
        </AdminSectionCard>

        <TabsContent value="audit" className="mt-0">
          <AdminSectionCard title="Activity Log" description={`${total} matching record(s) across the current filter set.`}>
            {rows.length === 0 ? (
              <AdminEmptyState title="No audit log entries found" description="Try widening your filter range or switching over to the usage summary tab." />
            ) : (
              <>
                <div className="admin-table-shell">
                  <Table>
                    <TableHeader className="admin-table-head">
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
                          <TableCell>{row.targetType}: <span className="text-muted-foreground">{row.targetId}</span></TableCell>
                          <TableCell className="max-w-[320px] truncate">{row.metadata ? JSON.stringify(row.metadata) : 'No metadata'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                    Previous
                  </Button>
                  <p className="text-sm text-[var(--admin-text-muted)]">Page {page} of {Math.max(totalPages, 1)}</p>
                  <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages}>
                    Next
                  </Button>
                </div>
              </>
            )}
          </AdminSectionCard>
        </TabsContent>

        <TabsContent value="usage" className="mt-0 space-y-6">
          <AdminSectionCard title="Usage Snapshot" description="A more polished view of the same usage metrics already tracked by the admin service.">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <UsageCard label="Active Teachers" value={usageSummary?.activeTeachers ?? 0} />
              <UsageCard label="Active Students" value={usageSummary?.activeStudents ?? 0} />
              <UsageCard label="Assessment Submissions" value={usageSummary?.assessmentSubmissions ?? 0} />
              <UsageCard label="Lesson Completions" value={usageSummary?.lessonCompletions ?? 0} />
              <UsageCard label="Intervention Opens" value={usageSummary?.interventionOpens ?? 0} />
              <UsageCard label="Intervention Closures" value={usageSummary?.interventionClosures ?? 0} />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Top Actions" description="See which platform actions are surfacing most often in the selected date window.">
            {(usageSummary?.topActions?.length ?? 0) === 0 ? (
              <AdminEmptyState title="No usage data found" description="Try expanding the date range to surface more usage events." />
            ) : (
              <div className="admin-table-shell">
                <Table>
                  <TableHeader className="admin-table-head">
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
              </div>
            )}
          </AdminSectionCard>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
