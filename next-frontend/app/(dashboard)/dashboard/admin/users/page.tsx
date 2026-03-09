'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { userService } from '@/services/user-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import type { User } from '@/types/user';
import { getRoleName } from '@/utils/helpers';
import CreateUserModal from '@/components/modals/CreateUserModal';

type StatusTab = 'active' | 'pending' | 'suspended' | 'deleted';

export default function UserManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('active');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showSuspend, setShowSuspend] = useState<User | null>(null);
  const [showPurge, setShowPurge] = useState<User | null>(null);
  const [purgeConfirmName, setPurgeConfirmName] = useState('');

  const statusMap: Record<StatusTab, string> = {
    active: 'ACTIVE',
    pending: 'PENDING',
    suspended: 'SUSPENDED',
    deleted: 'DELETED',
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const status = statusMap[tab];
      const res = await userService.getAll({ status, limit: 200 });
      setUsers(res.users || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const primaryRole = getRoleName(u.roles?.[0]);
    if (roleFilter !== 'all' && primaryRole !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        primaryRole.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    setShowCreate(true);
  };

  const handleOpenView = (userId: string) => {
    router.push(`/dashboard/admin/users/${userId}`);
  };

  const handleModalSaved = () => {
    setShowCreate(false);
    fetchUsers();
  };

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

  const handleSoftDelete = async (id: string) => {
    if (!confirm('Archive & delete this user? They can be purged later.')) return;
    try {
      await userService.softDelete(id);
      toast.success('User archived');
      fetchUsers();
    } catch {
      toast.error('Failed to archive');
    }
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

  const isSelf = (id: string) => currentUser?.id === id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage all user accounts</p>
        </div>
        <Button onClick={handleOpenCreate}>+ Create User</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as StatusTab); setRoleFilter('all'); setSearch(''); }}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="deleted">Deleted</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4 mt-4">
          <Input placeholder="Search name, email, role..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          {tab === 'active' && (
            <div className="flex gap-2">
              {['all', 'student', 'teacher', 'admin'].map((r) => (
                <Button key={r} variant={roleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter(r)}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Active Users */}
        <TabsContent value="active" className="mt-4">
          {loading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleOpenView(u.id)}
                    >
                      <TableCell>
                        {u.firstName} {u.lastName}
                        {isSelf(u.id) && <Badge variant="outline" className="ml-2">YOU</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell><Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}>{u.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenView(u.id)}>View</Button>
                        {!isSelf(u.id) && (
                          <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => setShowSuspend(u)}>Suspend</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Pending Users */}
        <TabsContent value="pending" className="mt-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            These accounts have been created but the user has not yet verified their email. They cannot log in until verification is complete. To remove access, suspend the account first — then archive it from the Suspended tab.
          </div>
          {loading ? <Skeleton className="h-64 rounded-lg" /> : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email Verified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pending accounts.</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer opacity-90 hover:bg-gray-50"
                      onClick={() => handleOpenView(u.id)}
                    >
                      <TableCell>{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={u.isEmailVerified ? 'default' : 'outline'} className={u.isEmailVerified ? '' : 'text-amber-600 border-amber-400'}>
                          {u.isEmailVerified ? 'Verified' : 'Awaiting Verification'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenView(u.id)}>View</Button>
                        <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => setShowSuspend(u)}>Suspend</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Suspended Users */}
        <TabsContent value="suspended" className="mt-4">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            Suspended users cannot log in, but their data is preserved and they can be reactivated.
          </div>
          {loading ? <Skeleton className="h-64 rounded-lg" /> : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No suspended users.</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer opacity-80 hover:bg-gray-50"
                      onClick={() => handleOpenView(u.id)}
                    >
                      <TableCell>{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenView(u.id)}>View</Button>
                        <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleReactivate(u.id)}>Reactivate</Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleSoftDelete(u.id)}>Archive & Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Deleted Users */}
        <TabsContent value="deleted" className="mt-4">
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Deleted users have been archived. You can export their data or permanently purge them.
          </div>
          {loading ? <Skeleton className="h-64 rounded-lg" /> : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No deleted users.</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer opacity-60 hover:bg-gray-50"
                      onClick={() => handleOpenView(u.id)}
                    >
                      <TableCell>{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenView(u.id)}>View</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleExport(u.id)}>Export</Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setShowPurge(u); setPurgeConfirmName(''); }}>Purge</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit User Modal */}
      <CreateUserModal
        user={null}
        open={showCreate}
        onClose={() => { setShowCreate(false); }}
        onSaved={handleModalSaved}
      />

      {/* Suspend Confirmation */}
      <Dialog open={!!showSuspend} onOpenChange={() => setShowSuspend(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-600">Suspend User</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend <strong>{showSuspend?.firstName} {showSuspend?.lastName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2 text-muted-foreground">
            <p>The user will:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Not be able to log in</li>
              <li>Have their data preserved</li>
              <li>Be reactivatable later</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspend(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend}>Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Confirmation */}
      <Dialog open={!!showPurge} onOpenChange={() => setShowPurge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Delete User</DialogTitle>
            <DialogDescription>
              This action is <strong>irreversible</strong>. All data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-3">
            <p>Type the user&apos;s full name to confirm:</p>
            <p className="font-mono text-muted-foreground">{showPurge?.firstName} {showPurge?.lastName}</p>
            <Input
              value={purgeConfirmName}
              onChange={(e) => setPurgeConfirmName(e.target.value)}
              placeholder="Type full name here..."
            />
            <Button variant="outline" size="sm" onClick={() => showPurge && handleExport(showPurge.id)}>
              Download Data Export First
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurge(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={purgeConfirmName !== `${showPurge?.firstName} ${showPurge?.lastName}`}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
