'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Search, UsersRound } from 'lucide-react';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  userService,
  type UserMonitoringReportItem,
} from '@/services/user-service';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';
type RoleFilter = 'all' | 'student' | 'teacher' | 'admin';

function formatDateTime(value?: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getStatusLabel(status?: string): string {
  if (status === 'DELETED') return 'Archived';
  return status ? toTitleCase(status) : 'Unknown';
}

function getStatusTone(status?: string): string {
  switch (status) {
    case 'SUSPENDED':
      return 'admin-status-pill admin-status-pill--suspended';
    case 'DELETED':
      return 'admin-status-pill admin-status-pill--archived';
    case 'PENDING':
      return 'admin-status-pill admin-status-pill--pending';
    default:
      return 'admin-status-pill admin-status-pill--active';
  }
}

function getRoleNames(entry: UserMonitoringReportItem): string[] {
  const rawRoles = Array.isArray(entry.roles) ? entry.roles : [];
  const normalized = rawRoles
    .map((role) => {
      if (typeof role === 'string') {
        return role.trim().toLowerCase();
      }
      if (
        role &&
        typeof role === 'object' &&
        'name' in role &&
        typeof (role as { name?: unknown }).name === 'string'
      ) {
        return (role as { name: string }).name.trim().toLowerCase();
      }
      return '';
    })
    .filter((role) => role.length > 0);

  return normalized.length > 0 ? normalized : ['user'];
}

function getPrimaryRole(entry: UserMonitoringReportItem): string {
  return getRoleNames(entry)[0];
}

function getRoleTone(role: string): string {
  switch (role) {
    case 'admin':
      return 'admin-role-pill admin-role-pill--admin';
    case 'teacher':
      return 'admin-role-pill admin-role-pill--teacher';
    default:
      return 'admin-role-pill admin-role-pill--student';
  }
}

export default function AdminUserReportsPage() {
  const hasLoadedRef = useRef(false);
  const [rows, setRows] = useState<UserMonitoringReportItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const fetchReports = useCallback(
    async (mode: 'initial' | 'table') => {
      try {
        if (mode === 'initial') {
          setInitialLoading(true);
        } else {
          setTableLoading(true);
        }

        const response = await userService.getMonitoringReport({
          status: statusFilter === 'all' ? undefined : statusFilter,
          role: roleFilter === 'all' ? undefined : roleFilter,
          limit: 300,
        });
        setRows(response.data.data || []);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Failed to load user monitoring reports'),
        );
      } finally {
        if (mode === 'initial') {
          setInitialLoading(false);
        } else {
          setTableLoading(false);
        }
      }
    },
    [roleFilter, statusFilter],
  );

  useEffect(() => {
    const mode = hasLoadedRef.current ? 'table' : 'initial';
    hasLoadedRef.current = true;
    void fetchReports(mode);
  }, [fetchReports]);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return rows;

    return rows.filter((entry) => {
      const name = `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim();
      const roles = getRoleNames(entry).join(' ');
      return (
        name.toLowerCase().includes(normalized) ||
        entry.email?.toLowerCase().includes(normalized) ||
        roles.includes(normalized) ||
        entry.activityIp?.toLowerCase().includes(normalized)
      );
    });
  }, [rows, search]);

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[30rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="School Setup"
      title="User Reports"
      description="Monitor account activity, login/logout timestamps, inactivity, and lifecycle states."
      icon={UsersRound}
    >
      <AdminSectionCard title="User Monitoring" contentClassName="space-y-5">
        <div className="admin-filter-row">
          <div className="admin-search-shell min-w-[18rem] flex-1 md:max-w-[24rem]">
            <Search className="h-4 w-4 text-[#8ea0bc]" />
            <Input
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="admin-input"
            />
          </div>
          <div className="admin-controls">
            <select
              aria-label="Filter by account status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
              }}
              className="admin-select min-w-[10rem] rounded-[1rem] px-3 py-2 text-sm font-bold text-[#6f83a3]"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DELETED">Archived</option>
            </select>
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleFilter);
              }}
              className="admin-select min-w-[10rem] rounded-[1rem] px-3 py-2 text-sm font-bold text-[#6f83a3]"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <AdminEmptyState
            title="No users found"
            description="Try adjusting the filters or search query."
          />
        ) : (
          <div
            className={`admin-table-shell${tableLoading ? ' admin-table-shell--loading' : ''}`}
          >
            {tableLoading ? (
              <div className="admin-table-loading">Refreshing user reports...</div>
            ) : null}
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Last Logout</TableHead>
                  <TableHead>Inactive For</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Live Activity</TableHead>
                  <TableHead>Account Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((entry) => {
                  const fullName =
                    `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim() ||
                    entry.email;
                  const primaryRole = getPrimaryRole(entry);
                  const roleLabel = getRoleNames(entry).map(toTitleCase).join(', ');

                  return (
                    <TableRow
                      key={entry.id}
                      className="border-t border-[var(--admin-outline)]"
                    >
                      <TableCell className="font-semibold text-[var(--admin-text-strong)]">
                        <div className="flex flex-col">
                          <span>{fullName}</span>
                          <span className="text-xs text-[#8ea0bc]">{entry.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={getRoleTone(primaryRole)}>
                          {roleLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#6f83a3]">
                        {formatDateTime(entry.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-[#6f83a3]">
                        {formatDateTime(entry.lastLogoutAt)}
                      </TableCell>
                      <TableCell className="text-[#6f83a3]">
                        {entry.isCurrentlyActive ? '0m' : entry.inactiveFor}
                      </TableCell>
                      <TableCell className="text-[#6f83a3]">
                        {entry.activityIp || '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            entry.isCurrentlyActive
                              ? 'admin-status-pill admin-status-pill--active'
                              : 'admin-status-pill admin-status-pill--archived'
                          }
                        >
                          {entry.isCurrentlyActive ? (
                            <span className="inline-flex items-center gap-1">
                              <Activity className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            'Inactive'
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getStatusTone(entry.status)}>
                          {getStatusLabel(entry.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
