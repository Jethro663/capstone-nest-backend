'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/admin-service';
import type { AuditLogEntry } from '@/types/audit';
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getAuditLogs({
        page,
        limit: 20,
        action: action || undefined,
        actorId: actorId || undefined,
      });
      setRows(res.data ?? []);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast.error('Failed to load audit logs');
      setRows([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [action, actorId, page]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

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
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Review recent sensitive system actions across class records, enrollments,
          and interventions.
        </p>
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
        </CardContent>
      </Card>

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
    </div>
  );
}
