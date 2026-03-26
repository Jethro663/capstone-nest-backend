'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, Filter, Trash2, UserPlus, UserX, RotateCcw } from 'lucide-react';
import { userService } from '@/services/user-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import type { User } from '@/types/user';
import { getRoleName } from '@/utils/helpers';

type StatusTab = 'active' | 'pending' | 'suspended' | 'deleted';

const STATUS_MAP: Record<StatusTab, string> = {
  active: 'ACTIVE',
  pending: 'PENDING',
  suspended: 'SUSPENDED',
  deleted: 'DELETED',
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

function getStatusTone(tab: StatusTab) {
  switch (tab) {
    case 'pending':
      return 'admin-status-pill admin-status-pill--pending';
    case 'suspended':
      return 'admin-status-pill admin-status-pill--suspended';
    case 'deleted':
      return 'admin-status-pill admin-status-pill--archived';
    default:
      return 'admin-status-pill admin-status-pill--active';
  }
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<StatusTab, number>>({
    active: 0,
    pending: 0,
    suspended: 0,
    deleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('active');
  const [search, setSearch] = useState('');
  const [showSuspend, setShowSuspend] = useState<User | null>(null);
  const [showPurge, setShowPurge] = useState<User | null>(null);
  const [purgeConfirmName, setPurgeConfirmName] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const status = STATUS_MAP[tab];
      const res = await userService.getAll({ status, limit: 200 });
      const activeRes = await userService.getAll({ status: STATUS_MAP.active, limit: 1 });
      const pendingRes = await userService.getAll({ status: STATUS_MAP.pending, limit: 1 });
      const suspendedRes = await userService.getAll({ status: STATUS_MAP.suspended, limit: 1 });
      const deletedRes = await userService.getAll({ status: STATUS_MAP.deleted, limit: 1 });
      setUsers(res.users || []);
      setStatusCounts({
        active: activeRes.total,
        pending: pendingRes.total,
        suspended: suspendedRes.total,
        deleted: deletedRes.total,
      });
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchUsers();
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

  const handleSuspend = async () => {
    if (!showSuspend) return;
    try {
      await userService.suspend(showSuspend.id);
      toast.success('User suspended');
      setShowSuspend(null);
      fetchUsers();
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await userService.reactivate(id);
      toast.success('User reactivated');
      fetchUsers();
    } catch {
      toast.error('Failed to reactivate');
    }
  };

  const handleSoftDelete = (user: User) => {
    setConfirmation({
      title: 'Archive user account?',
      description: 'The user will lose login access but can still be restored or purged later.',
      confirmLabel: 'Archive User',
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
          fetchUsers();
        } catch {
          toast.error('Failed to archive');
        }
      },
    });
  };

  const handleExport = async (id: string) => {
    try {
      const blob = await userService.exportUser(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('User data exported');
    } catch {
      toast.error('Failed to export');
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
      fetchUsers();
    } catch {
      toast.error('Failed to purge');
    }
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

  if (loading) {
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
        <Tabs value={tab} onValueChange={(value) => { setTab(value as StatusTab); setSearch(''); }} className="space-y-5">
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
              <Button variant="outline" size="sm" className="admin-button-outline rounded-[1rem] px-4 font-bold">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
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

          {filtered.length === 0 ? (
            <AdminEmptyState
              title="No users found"
              description="Try another status view or a different search query."
            />
          ) : (
            <div className="admin-table-shell">
              <Table>
                <TableHeader className="admin-table-head">
                  <TableRow>
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

                    return (
                      <TableRow
                        key={entry.id}
                        className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]"
                      >
                        <TableCell>
                          <button
                            type="button"
                            className="flex items-center gap-3 text-left"
                            onClick={() => router.push(`/dashboard/admin/users/${entry.id}`)}
                          >
                            <span className="admin-avatar-chip">{getInitials(entry)}</span>
                            <span className="font-semibold text-[var(--admin-text-strong)]">
                              {entry.firstName} {entry.lastName}
                              {isSelf ? <span className="ml-2 text-xs font-bold text-[#9aaed0]">(You)</span> : null}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-[#7890b3]">{entry.email}</TableCell>
                        <TableCell>
                          <span className={getRoleTone(primaryRole)}>{primaryRole}</span>
                        </TableCell>
                        <TableCell>
                          <span className={getStatusTone(tab)}>
                            {tab === 'deleted' ? 'Deleted' : tab === 'suspended' ? 'Suspended' : tab === 'pending' ? 'Pending' : 'Active'}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#9aaed0]">{formatDate(lastLogin)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() => router.push(`/dashboard/admin/users/${entry.id}`)}
                              title="View user"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {tab === 'suspended' ? (
                              <button
                                type="button"
                                className="admin-icon-button"
                                onClick={() => handleReactivate(entry.id)}
                                title="Reactivate user"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            ) : tab === 'deleted' ? (
                              <button
                                type="button"
                                className="admin-icon-button"
                                onClick={() => handleExport(entry.id)}
                                title="Export user"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            ) : !isSelf ? (
                              <button
                                type="button"
                                className="admin-icon-button"
                                onClick={() => setShowSuspend(entry)}
                                title="Suspend user"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() => {
                                if (tab === 'deleted') {
                                  setShowPurge(entry);
                                  setPurgeConfirmName('');
                                } else {
                                  handleSoftDelete(entry);
                                }
                              }}
                              title={tab === 'deleted' ? 'Purge user' : 'Archive user'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

      <Dialog open={!!showSuspend} onOpenChange={() => setShowSuspend(null)}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-700">Suspend User</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend <strong>{showSuspend?.firstName} {showSuspend?.lastName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>The user will:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Lose login access</li>
              <li>Keep their existing data</li>
              <li>Remain restorable later</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setShowSuspend(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl font-black" onClick={handleSuspend}>Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
