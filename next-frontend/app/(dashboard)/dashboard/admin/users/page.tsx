'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Download, Filter, Trash2, UserPlus, UserX, RotateCcw } from 'lucide-react';
import {
  type BulkUserLifecycleAction,
  userService,
} from '@/services/user-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig, type ConfirmationTone } from '@/components/shared/ConfirmationDialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import type { User } from '@/types/user';
import { getRoleName } from '@/utils/helpers';

type StatusTab = 'active' | 'pending' | 'suspended' | 'deleted';
type RoleFilter = 'all' | 'student' | 'teacher' | 'admin';

interface BulkActionOption {
  action: BulkUserLifecycleAction;
  label: string;
  confirmLabel: string;
  title: string;
  description: string;
  tone: ConfirmationTone;
}

const STATUS_MAP: Record<StatusTab, string> = {
  active: 'ACTIVE',
  pending: 'PENDING',
  suspended: 'SUSPENDED',
  deleted: 'DELETED',
};

const ROLE_FILTER_LABELS: Record<RoleFilter, string> = {
  all: 'All roles',
  student: 'Students',
  teacher: 'Teachers',
  admin: 'Admins',
};

function formatDate(value?: string) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toISOString().slice(0, 10);
}

function getInitials(user: User) {
  const first = user.firstName?.[0] ?? '';
  const last = user.lastName?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || 'U';
}

function getRoleTone(role: string) {
  switch (role) {
    case 'teacher':
      return 'admin-role-pill admin-role-pill--teacher';
    case 'admin':
      return 'admin-role-pill admin-role-pill--admin';
    default:
      return 'admin-role-pill admin-role-pill--student';
  }
}

function getStatusTone(status?: string) {
  switch (status) {
    case 'PENDING':
      return 'admin-status-pill admin-status-pill--pending';
    case 'SUSPENDED':
      return 'admin-status-pill admin-status-pill--suspended';
    case 'DELETED':
      return 'admin-status-pill admin-status-pill--archived';
    default:
      return 'admin-status-pill admin-status-pill--active';
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'SUSPENDED':
      return 'Suspended';
    case 'DELETED':
      return 'Deleted';
    default:
      return 'Active';
  }
}

function getBulkActions(tab: StatusTab): BulkActionOption[] {
  switch (tab) {
    case 'suspended':
      return [
        {
          action: 'reactivate',
          label: 'Reactivate selected',
          confirmLabel: 'Reactivate users',
          title: 'Reactivate selected users?',
          description: 'Selected suspended accounts will regain access immediately.',
          tone: 'default',
        },
        {
          action: 'archive',
          label: 'Archive selected',
          confirmLabel: 'Archive users',
          title: 'Archive selected users?',
          description: 'Selected suspended accounts will move to deleted status and can still be purged later.',
          tone: 'danger',
        },
      ];
    case 'deleted':
      return [
        {
          action: 'purge',
          label: 'Purge selected',
          confirmLabel: 'Purge users',
          title: 'Permanently delete selected users?',
          description: 'This permanently removes the selected deleted accounts from the system.',
          tone: 'danger',
        },
      ];
    default:
      return [
        {
          action: 'suspend',
          label: 'Suspend selected',
          confirmLabel: 'Suspend users',
          title: 'Suspend selected users?',
          description: 'Selected active or pending accounts will lose login access but remain restorable.',
          tone: 'danger',
        },
      ];
  }
}

function getBulkResultMessage(actionLabel: string, successCount: number, failureCount: number) {
  if (failureCount === 0) {
    return `${actionLabel} completed for ${successCount} user${successCount === 1 ? '' : 's'}.`;
  }

  if (successCount === 0) {
    return `${actionLabel} failed for all selected users.`;
  }

  return `${actionLabel} completed for ${successCount} user${successCount === 1 ? '' : 's'}; ${failureCount} failed.`;
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const hasLoadedRef = useRef(false);
  const [users, setUsers] = useState<User[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<StatusTab, number>>({
    active: 0,
    pending: 0,
    suspended: 0,
    deleted: 0,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tab, setTab] = useState<StatusTab>('active');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showPurge, setShowPurge] = useState<User | null>(null);
  const [purgeConfirmName, setPurgeConfirmName] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const fetchUsers = useCallback(
    async (mode: 'initial' | 'table') => {
      try {
        if (mode === 'initial') {
          setInitialLoading(true);
        } else {
          setTableLoading(true);
        }

        const res = await userService.getAll({
          status: STATUS_MAP[tab],
          role: roleFilter === 'all' ? undefined : roleFilter,
          limit: 100,
          includeStatusCounts: true,
        });
        setUsers(res.users || []);
        if (res.statusCounts) {
          setStatusCounts({
            active: res.statusCounts.ACTIVE,
            pending: res.statusCounts.PENDING,
            suspended: res.statusCounts.SUSPENDED,
            deleted: res.statusCounts.DELETED,
          });
        }
      } catch {
        toast.error('Failed to load users');
      } finally {
        if (mode === 'initial') {
          setInitialLoading(false);
        } else {
          setTableLoading(false);
        }
      }
    },
    [roleFilter, tab],
  );

  useEffect(() => {
    const mode = hasLoadedRef.current ? 'table' : 'initial';
    hasLoadedRef.current = true;
    void fetchUsers(mode);
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const query = search.toLowerCase();
    return users.filter((entry) => {
      const primaryRole = getRoleName(entry.roles?.[0]).toLowerCase();
      return (
        entry.firstName?.toLowerCase().includes(query) ||
        entry.lastName?.toLowerCase().includes(query) ||
        entry.email?.toLowerCase().includes(query) ||
        primaryRole.includes(query)
      );
    });
  }, [search, users]);

  const selectableVisibleIds = useMemo(
    () =>
      filtered
        .filter((entry) => currentUser?.id !== entry.id)
        .map((entry) => entry.id),
    [currentUser?.id, filtered],
  );

  useEffect(() => {
    const visibleSet = new Set(selectableVisibleIds);
    setSelectedUserIds((current) => current.filter((id) => visibleSet.has(id)));
  }, [selectableVisibleIds]);

  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedUserIds.includes(id));

  const bulkActions = useMemo(() => getBulkActions(tab), [tab]);

  const selectedUsers = useMemo(
    () => filtered.filter((entry) => selectedUserIds.includes(entry.id)),
    [filtered, selectedUserIds],
  );

  const refreshTable = useCallback(async () => {
    await fetchUsers('table');
  }, [fetchUsers]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleSelectAllVisible = () => {
    setSelectedUserIds(allVisibleSelected ? [] : selectableVisibleIds);
  };

  const handleSuspendPrompt = (user: User) => {
    setConfirmation({
      title: 'Suspend user?',
      description: 'The user will lose login access but all account data will stay intact.',
      confirmLabel: 'Suspend user',
      tone: 'danger',
      details: (
        <p className="text-sm font-black text-[var(--student-text-strong)]">
          {user.firstName} {user.lastName}
        </p>
      ),
      onConfirm: async () => {
        try {
          await userService.suspend(user.id);
          toast.success('User suspended');
          await refreshTable();
        } catch {
          toast.error('Failed to suspend user');
        }
      },
    });
  };

  const handleReactivate = async (id: string) => {
    try {
      await userService.reactivate(id);
      toast.success('User reactivated');
      await refreshTable();
    } catch {
      toast.error('Failed to reactivate user');
    }
  };

  const handleArchivePrompt = (user: User) => {
    setConfirmation({
      title: 'Archive user account?',
      description: 'The user will move to deleted status and can still be purged later.',
      confirmLabel: 'Archive user',
      tone: 'danger',
      details: (
        <p className="text-sm font-black text-[var(--student-text-strong)]">
          {user.firstName} {user.lastName}
        </p>
      ),
      onConfirm: async () => {
        try {
          await userService.softDelete(user.id);
          toast.success('User archived');
          await refreshTable();
        } catch {
          toast.error('Failed to archive user');
        }
      },
    });
  };

  const handleExport = async (id: string) => {
    try {
      const blob = await userService.exportUser(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-data-${id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('User data exported');
    } catch {
      toast.error('Failed to export user data');
    }
  };

  const handlePurge = async () => {
    if (!showPurge) return;
    const fullName = `${showPurge.firstName} ${showPurge.lastName}`;
    if (purgeConfirmName !== fullName) {
      toast.error('Name does not match');
      return;
    }

    try {
      await userService.purge(showPurge.id);
      toast.success('User permanently deleted');
      setShowPurge(null);
      setPurgeConfirmName('');
      await refreshTable();
    } catch {
      toast.error('Failed to purge user');
    }
  };

  const handleBulkAction = async (option: BulkActionOption) => {
    if (selectedUserIds.length === 0) return;

    try {
      const result = await userService.bulkLifecycle({
        action: option.action,
        userIds: selectedUserIds,
      });
      const successCount = result.data.succeeded.length;
      const failureCount = result.data.failed.length;
      const toastMessage = getBulkResultMessage(option.label, successCount, failureCount);

      if (successCount > 0) {
        toast.success(toastMessage);
      } else {
        toast.error(toastMessage);
      }

      if (failureCount > 0) {
        toast.error(result.data.failed[0]?.reason ?? 'Some selected users could not be updated.');
      }

      setSelectedUserIds([]);
      await refreshTable();
    } catch {
      toast.error(`Failed to ${option.label.toLowerCase()}`);
    }
  };

  const openBulkConfirmation = (option: BulkActionOption) => {
    setConfirmation({
      title: option.title,
      description: option.description,
      confirmLabel: option.confirmLabel,
      tone: option.tone,
      details: (
        <div className="space-y-2 text-sm text-[var(--student-text-strong)]">
          <p className="font-black">{selectedUserIds.length} selected</p>
          <p className="text-[var(--student-text-muted)]">
            {selectedUsers.slice(0, 3).map((user) => `${user.firstName} ${user.lastName}`).join(', ')}
            {selectedUsers.length > 3 ? ` and ${selectedUsers.length - 3} more` : ''}
          </p>
        </div>
      ),
      onConfirm: async () => {
        await handleBulkAction(option);
      },
    });
  };

  const handleExportVisible = () => {
    const payload = filtered.map((entry) => ({
      id: entry.id,
      firstName: entry.firstName,
      lastName: entry.lastName,
      email: entry.email,
      role: getRoleName(entry.roles?.[0]),
      status: entry.status,
      isEmailVerified: entry.isEmailVerified,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-users-${tab}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Visible users exported');
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[34rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Users"
      title="Users"
      description="Manage all platform accounts"
      icon={UserPlus}
      actions={(
        <Button
          className="admin-button-solid rounded-[1rem] px-4 font-bold"
          onClick={() => router.push('/dashboard/admin/users/create')}
        >
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      )}
    >
      <AdminSectionCard title="Account Directory" contentClassName="space-y-5">
        <Tabs value={tab} onValueChange={(value) => setTab(value as StatusTab)} className="space-y-5">
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="active" className="admin-tab">
              Active <span className="admin-segment-count">{statusCounts.active}</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="admin-tab">
              Pending <span className="admin-segment-count">{statusCounts.pending}</span>
            </TabsTrigger>
            <TabsTrigger value="suspended" className="admin-tab">
              Suspended <span className="admin-segment-count">{statusCounts.suspended}</span>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="admin-tab">
              Deleted <span className="admin-segment-count">{statusCounts.deleted}</span>
            </TabsTrigger>
          </TabsList>

          <div className="admin-filter-row">
            <div className="admin-search-shell min-w-[18rem] flex-1 md:max-w-[20rem]">
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="admin-input"
              />
            </div>
            <div className="admin-controls">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
                <select
                  aria-label="Filter users by role"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                  className="admin-select min-w-[11rem] appearance-none rounded-[1rem] py-2 pl-9 pr-10 text-sm font-bold text-[#6f83a3]"
                >
                  {Object.entries(ROLE_FILTER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="admin-button-outline rounded-[1rem] px-4 font-bold"
                onClick={handleExportVisible}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="admin-bulk-bar">
              <div className="admin-controls">
                <span className="admin-pill">
                  {selectedUserIds.length} selected
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="admin-button-outline rounded-[1rem] px-4 font-bold"
                  onClick={handleSelectAllVisible}
                  disabled={selectableVisibleIds.length === 0}
                >
                  {allVisibleSelected ? 'Clear visible selection' : 'Select all visible'}
                </Button>
                {roleFilter !== 'all' ? (
                  <span className="admin-filter-badge">Filtered by {ROLE_FILTER_LABELS[roleFilter]}</span>
                ) : null}
              </div>
              <div className="admin-controls">
                {bulkActions.map((option) => (
                  <Button
                    key={option.action}
                    type="button"
                    variant={option.tone === 'danger' ? 'destructive' : 'outline'}
                    size="sm"
                    className={option.tone === 'danger' ? 'rounded-[1rem] px-4 font-bold' : 'admin-button-outline rounded-[1rem] px-4 font-bold'}
                    onClick={() => openBulkConfirmation(option)}
                    disabled={selectedUserIds.length === 0}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <AdminEmptyState
              title="No users found"
              description="Try another status view, role filter, or search query."
            />
          ) : (
            <div className={`admin-table-shell${tableLoading ? ' admin-table-shell--loading' : ''}`}>
              {tableLoading ? <div className="admin-table-loading">Refreshing users...</div> : null}
              <Table>
                <TableHeader className="admin-table-head">
                  <TableRow>
                    <TableHead className="w-[6rem]">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => {
                    const primaryRole = getRoleName(entry.roles?.[0]).toLowerCase();
                    const lastLogin = entry.lastLoginAt ?? entry.updatedAt ?? entry.createdAt;
                    const isSelf = currentUser?.id === entry.id;
                    const isSelected = selectedUserIds.includes(entry.id);
                    const profilePath = `/dashboard/admin/users/${entry.id}`;

                    return (
                      <TableRow
                        key={entry.id}
                        className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]"
                      >
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            role="checkbox"
                            aria-label={`Select ${entry.firstName} ${entry.lastName}`}
                            className="admin-row-checkbox"
                            checked={isSelected}
                            disabled={isSelf}
                            onChange={() => toggleUserSelection(entry.id)}
                          />
                        </TableCell>
                        <TableCell
                          className="admin-table-row-link"
                          onClick={() => router.push(profilePath)}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <span className="admin-avatar-chip">{getInitials(entry)}</span>
                            <span className="font-semibold text-[var(--admin-text-strong)]">
                              {entry.firstName} {entry.lastName}
                              {isSelf ? <span className="ml-2 text-xs font-bold text-[#9aaed0]">(You)</span> : null}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="admin-table-row-link text-[#7890b3]" onClick={() => router.push(profilePath)}>
                          {entry.email}
                        </TableCell>
                        <TableCell className="admin-table-row-link" onClick={() => router.push(profilePath)}>
                          <span className={getRoleTone(primaryRole)}>{primaryRole}</span>
                        </TableCell>
                        <TableCell className="admin-table-row-link" onClick={() => router.push(profilePath)}>
                          <span className={getStatusTone(entry.status)}>{getStatusLabel(entry.status)}</span>
                        </TableCell>
                        <TableCell className="admin-table-row-link text-[#9aaed0]" onClick={() => router.push(profilePath)}>
                          {formatDate(lastLogin)}
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {tab === 'suspended' ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-icon-button"
                                  onClick={() => handleReactivate(entry.id)}
                                  title="Reactivate user"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="admin-icon-button"
                                  onClick={() => handleArchivePrompt(entry)}
                                  title="Archive user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : tab === 'deleted' ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-icon-button"
                                  onClick={() => handleExport(entry.id)}
                                  title="Export user"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="admin-icon-button"
                                  onClick={() => {
                                    setShowPurge(entry);
                                    setPurgeConfirmName('');
                                  }}
                                  title="Purge user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : !isSelf ? (
                              <button
                                type="button"
                                className="admin-icon-button"
                                onClick={() => handleSuspendPrompt(entry)}
                                title="Suspend user"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Tabs>
      </AdminSectionCard>

      <Dialog open={!!showPurge} onOpenChange={() => setShowPurge(null)}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Permanently Delete User</DialogTitle>
            <DialogDescription>
              This action is <strong>irreversible</strong>. All data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Type the user&apos;s full name to confirm:</p>
            <p className="font-mono text-muted-foreground">{showPurge?.firstName} {showPurge?.lastName}</p>
            <Input value={purgeConfirmName} onChange={(event) => setPurgeConfirmName(event.target.value)} placeholder="Type full name here..." className="admin-input" />
            <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => showPurge && handleExport(showPurge.id)}>
              Download Data Export First
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setShowPurge(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl font-black" onClick={handlePurge} disabled={purgeConfirmName !== `${showPurge?.firstName} ${showPurge?.lastName}`}>
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </AdminPageShell>
  );
}
