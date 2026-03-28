'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin-service';
import type { AuditLogEntry } from '@/types/audit';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type DateRange = 'all' | 'today' | '7d' | '30d';

type AuditRow = AuditLogEntry & {
  actorLabel: string;
  actorInitials: string;
  targetLabel: string;
  ipLabel: string;
};

const PAGE_SIZE = 20;

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

function actorLabel(row: AuditLogEntry): string {
  const first = row.actor?.firstName?.trim() ?? '';
  const last = row.actor?.lastName?.trim() ?? '';
  const fullName = [first, last].filter(Boolean).join(' ');
  if (fullName) return fullName;
  if (row.actor?.email) return row.actor.email;
  return 'Admin System';
}

function initials(value: string): string {
  const tokens = value.split(' ').filter(Boolean);
  if (tokens.length === 0) return 'AS';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
}

function targetLabel(row: AuditLogEntry): string {
  const metadata = asRecord(row.metadata);
  const fromMetadata =
    metadata.targetLabel ??
    metadata.targetName ??
    metadata.entityName ??
    metadata.displayName;

  if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
    return fromMetadata;
  }

  const targetType = row.targetType?.replace(/_/g, ' ') ?? 'record';
  const baseLabel = targetType
    .split(' ')
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ');
  return `${baseLabel} - ${row.targetId}`;
}

function ipLabel(row: AuditLogEntry): string {
  const metadata = asRecord(row.metadata);
  const raw =
    metadata.ip ??
    metadata.ipAddress ??
    metadata.clientIp ??
    metadata.remoteIp;
  if (typeof raw === 'string' && raw.trim()) return raw;
  return '-';
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function rangeParams(range: DateRange): { dateFrom?: string; dateTo?: string } {
  if (range === 'all') return {};

  const now = new Date();
  const end = now.toISOString();

  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString(), dateTo: end };
  }

  const start = new Date(now);
  start.setDate(start.getDate() - (range === '7d' ? 7 : 30));
  return { dateFrom: start.toISOString(), dateTo: end };
}

export function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = rangeParams(dateRange);
      const response = await adminService.getAuditLogs({
        page,
        limit: PAGE_SIZE,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        actorId: actorFilter !== 'all' ? actorFilter : undefined,
        dateFrom,
        dateTo,
      });
      const mapped = (response.data ?? []).map((row) => {
        const name = actorLabel(row);
        return {
          ...row,
          actorLabel: name,
          actorInitials: initials(name),
          targetLabel: targetLabel(row),
          ipLabel: ipLabel(row),
        } satisfies AuditRow;
      });
      setRows(mapped);
      setTotal(response.total ?? 0);
      setTotalPages(Math.max(response.totalPages ?? 1, 1));
    } catch {
      toast.error('Failed to load audit logs.');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, actorFilter, dateRange, page]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const actorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((row) => {
      if (!seen.has(row.actorId)) seen.set(row.actorId, row.actorLabel);
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [rows]);

  const actionOptions = useMemo(() => {
    const unique = new Set<string>();
    rows.forEach((row) => unique.add(row.action));
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const searchToken = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (actorFilter !== 'all' && row.actorId !== actorFilter) return false;
      if (actionFilter !== 'all' && row.action !== actionFilter) return false;
      if (!searchToken) return true;

      const haystack = [
        row.actorLabel,
        row.action,
        row.targetLabel,
        row.ipLabel,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchToken);
    });
  }, [actionFilter, actorFilter, rows, search]);

  const pageSummary =
    filteredRows.length === rows.length
      ? `${rows.length} log${rows.length === 1 ? '' : 's'} on this page`
      : `${filteredRows.length} matching log${filteredRows.length === 1 ? '' : 's'} on this page`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.8rem]" />
        <Skeleton className="h-[30rem] rounded-[1.8rem]" />
      </div>
    );
  }

  const { dateFrom, dateTo } = rangeParams(dateRange);

  return (
    <AdminPageShell
      badge="Admin Audit Trail"
      title="Audit Trail"
      description="Track all platform activity and changes"
      icon={Shield}
      actions={(
        <Button variant="outline" className="admin-button-outline rounded-xl px-4 font-black" asChild>
          <a href={adminService.getActivityExportUrl({ dateFrom, dateTo })}>
            <Download className="h-4 w-4" />
            Export Log
          </a>
        </Button>
      )}
    >
      <AdminSectionCard
        title="Activity Log"
        description="Search and filter historical activity across the platform."
      >
        <div className="admin-audit-filters">
          <div className="admin-audit-search">
            <Search className="h-4 w-4 text-[var(--admin-text-muted)]" />
            <Input
              className="admin-input border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search logs..."
            />
          </div>

          <select
            className="admin-select admin-audit-select"
            value={actorFilter}
            onChange={(event) => {
              setPage(1);
              setActorFilter(event.target.value);
            }}
          >
            <option value="all">Actor</option>
            {actorOptions.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.label}
              </option>
            ))}
          </select>

          <select
            className="admin-select admin-audit-select"
            value={actionFilter}
            onChange={(event) => {
              setPage(1);
              setActionFilter(event.target.value);
            }}
          >
            <option value="all">Action Type</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            className="admin-select admin-audit-select"
            value={dateRange}
            onChange={(event) => {
              setPage(1);
              setDateRange(event.target.value as DateRange);
            }}
          >
            <option value="all">Date Range</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {filteredRows.length === 0 ? (
          <AdminEmptyState
            title="No audit entries found"
            description="Try a wider date range or clear filters to see more entries."
          />
        ) : (
          <div className="admin-table-shell mt-5">
            <table className="admin-audit-table">
              <thead className="admin-table-head">
                <tr>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Timestamp</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-audit-actor">
                        <span className="admin-audit-avatar">{row.actorInitials}</span>
                        <span>{row.actorLabel}</span>
                      </div>
                    </td>
                    <td>{row.action}</td>
                    <td>{row.targetLabel}</td>
                    <td>{formatTimestamp(row.createdAt)}</td>
                    <td>{row.ipLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--admin-border-soft)] pt-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-[var(--admin-text-muted)]">
            <span>{pageSummary}</span>
            <span className="mx-2 text-[var(--admin-border-strong)]">|</span>
            <span>{total} total log{total === 1 ? '' : 's'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="admin-button-outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="min-w-28 text-center text-sm font-semibold text-[var(--admin-text-strong)]">
              Page {page} of {Math.max(totalPages, 1)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="admin-button-outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
