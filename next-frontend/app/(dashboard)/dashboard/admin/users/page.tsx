'use client';

import { useEffect, useState, useCallback } from 'react';
<<<<<<< Updated upstream
=======
import { useRouter } from 'next/navigation';
import { Download, Eye, ShieldCheck, UserPlus, Users, UserX } from 'lucide-react';
>>>>>>> Stashed changes
import { userService } from '@/services/user-service';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import type { User } from '@/types/user';
import { getRoleName } from '@/utils/helpers';
import CreateUserModal from '@/components/modals/CreateUserModal';

type StatusTab = 'active' | 'pending' | 'suspended' | 'deleted';

const STATUS_MAP: Record<StatusTab, string> = {
  active: 'ACTIVE',
  pending: 'PENDING',
  suspended: 'SUSPENDED',
  deleted: 'DELETED',
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('active');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
<<<<<<< Updated upstream

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
=======
>>>>>>> Stashed changes
  const [showSuspend, setShowSuspend] = useState<User | null>(null);
  const [showPurge, setShowPurge] = useState<User | null>(null);
  const [purgeConfirmName, setPurgeConfirmName] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const status = STATUS_MAP[tab];
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

  const filtered = users.filter((entry) => {
    const primaryRole = getRoleName(entry.roles?.[0]);
    if (roleFilter !== 'all' && primaryRole !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        entry.firstName?.toLowerCase().includes(q) ||
        entry.lastName?.toLowerCase().includes(q) ||
        entry.email?.toLowerCase().includes(q) ||
        primaryRole.toLowerCase().includes(q)
      );
    }
    return true;
  });

<<<<<<< Updated upstream
  const handleOpenCreate = () => {
    setEditUser(null);
    setShowCreate(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditUser(u);
    setShowCreate(true);
  };

  const handleModalSaved = () => {
    setShowCreate(false);
    setEditUser(null);
    fetchUsers();
  };

=======
>>>>>>> Stashed changes
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[32rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Users"
      title="User Management"
      description="The user workspace now surfaces filters, account states, and actions in a more deliberate admin layout, while keeping every existing account flow unchanged."
      actions={(
        <Button
          className="admin-button-solid rounded-2xl px-5 py-2.5 font-black shadow-[0_18px_45px_-24px_rgba(16,185,129,0.85)]"
          onClick={() => router.push('/dashboard/admin/users/create')}
        >
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      )}
      stats={(
        <>
          <AdminStatCard label="Visible Users" value={filtered.length} caption={`In the ${tab} view`} icon={Users} accent="emerald" />
          <AdminStatCard label="Teachers" value={filtered.filter((u) => getRoleName(u.roles?.[0]) === 'teacher').length} caption="Matching current filters" icon={ShieldCheck} accent="sky" />
          <AdminStatCard label="Students" value={filtered.filter((u) => getRoleName(u.roles?.[0]) === 'student').length} caption="Matching current filters" icon={Users} accent="amber" />
          <AdminStatCard label="Risk Actions" value={tab === 'deleted' ? filtered.length : tab === 'suspended' ? filtered.length : 0} caption="Accounts currently in sensitive states" icon={UserX} accent="rose" />
        </>
      )}
    >
      <Tabs value={tab} onValueChange={(v) => { setTab(v as StatusTab); setRoleFilter('all'); setSearch(''); }} className="space-y-6">
        <AdminSectionCard
          title="Account Views"
          description="Switch between account states with clearer filters, stronger visual grouping, and lighter controls."
        >
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="active" className="admin-tab rounded-xl px-4 font-black">Active</TabsTrigger>
            <TabsTrigger value="pending" className="admin-tab rounded-xl px-4 font-black">Pending</TabsTrigger>
            <TabsTrigger value="suspended" className="admin-tab rounded-xl px-4 font-black">Suspended</TabsTrigger>
            <TabsTrigger value="deleted" className="admin-tab rounded-xl px-4 font-black">Deleted</TabsTrigger>
          </TabsList>

          <div className="mt-4 admin-filter-shell">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
              <Input
                placeholder="Search name, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input"
              />
              {tab === 'active' ? (
                <div className="admin-controls">
                  {['all', 'student', 'teacher', 'admin'].map((r) => (
                    <Button
                      key={r}
                      variant="outline"
                      size="sm"
                      className={roleFilter === r ? 'admin-button-solid rounded-xl font-black' : 'admin-button-outline rounded-xl font-black'}
                      onClick={() => setRoleFilter(r)}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="admin-chip">
                  {filtered.length} account{filtered.length === 1 ? '' : 's'} in this state
                </div>
              )}
            </div>
<<<<<<< Updated upstream
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
                    <TableRow key={u.id}>
                      <TableCell>
                        {u.firstName} {u.lastName}
                        {isSelf(u.id) && <Badge variant="outline" className="ml-2">YOU</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell><Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}>{u.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)}>Edit</Button>
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
                    <TableRow key={u.id} className="opacity-90">
                      <TableCell>{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={u.isEmailVerified ? 'default' : 'outline'} className={u.isEmailVerified ? '' : 'text-amber-600 border-amber-400'}>
                          {u.isEmailVerified ? 'Verified' : 'Awaiting Verification'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)}>Edit</Button>
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
                    <TableRow key={u.id} className="opacity-80">
                      <TableCell>{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
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
                    <TableRow key={u.id} className="opacity-60">
                      <TableCell>{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
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
        user={editUser}
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditUser(null); }}
        onSaved={handleModalSaved}
      />

      {/* Suspend Confirmation */}
=======
          </div>
        </AdminSectionCard>

        {[
          {
            value: 'active',
            message: null,
          },
          {
            value: 'pending',
            message: 'These accounts are created but still waiting for email verification before login access is granted.',
          },
          {
            value: 'suspended',
            message: 'Suspended users cannot log in, but their data is preserved and they can be restored later.',
          },
          {
            value: 'deleted',
            message: 'Deleted users are archived. Export is still available before a permanent purge.',
          },
        ].map((panel) => (
          <TabsContent key={panel.value} value={panel.value} className="mt-0 space-y-6">
            <AdminSectionCard
              title={`${panel.value.charAt(0).toUpperCase()}${panel.value.slice(1)} Accounts`}
              description="The account table remains the same logically, but the shell around it is now more readable and easier to scan."
            >
              {panel.message ? (
                <div className="mb-4 admin-filter-shell text-sm text-[var(--admin-text-muted)]">{panel.message}</div>
              ) : null}
              {filtered.length === 0 ? (
                <AdminEmptyState title="No users found" description="Try a different state or search query. This table updates from the same user service filters as before." />
              ) : (
                <div className="admin-table-shell">
                  <Table>
                    <TableHeader className="admin-table-head">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        {panel.value === 'pending' ? <TableHead>Email Verified</TableHead> : panel.value === 'active' ? <TableHead>Status</TableHead> : null}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((u) => (
                        <TableRow
                          key={u.id}
                          className="cursor-pointer transition-colors duration-200 hover:bg-emerald-50/50"
                          onClick={() => router.push(`/dashboard/admin/users/${u.id}`)}
                        >
                          <TableCell className="font-medium">
                            {u.firstName} {u.lastName}
                            {isSelf(u.id) ? <Badge variant="outline" className="ml-2 admin-pill">YOU</Badge> : null}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell><Badge variant="secondary">{getRoleName(u.roles?.[0])}</Badge></TableCell>
                          {panel.value === 'pending' ? (
                            <TableCell>
                              <Badge variant={u.isEmailVerified ? 'default' : 'outline'} className={u.isEmailVerified ? '' : 'text-amber-600 border-amber-400'}>
                                {u.isEmailVerified ? 'Verified' : 'Awaiting Verification'}
                              </Badge>
                            </TableCell>
                          ) : panel.value === 'active' ? (
                            <TableCell>
                              <Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}>{u.status}</Badge>
                            </TableCell>
                          ) : null}
                          <TableCell className="space-x-1 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="admin-button-outline rounded-xl font-black"
                              onClick={() => router.push(`/dashboard/admin/users/${u.id}`)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View Details
                            </Button>
                            {panel.value === 'active' && !isSelf(u.id) ? (
                              <Button variant="outline" size="sm" className="rounded-xl border-amber-200 bg-white/70 font-black text-amber-700 hover:bg-amber-50" onClick={() => setShowSuspend(u)}>
                                Suspend
                              </Button>
                            ) : null}
                            {panel.value === 'pending' ? (
                              <Button variant="outline" size="sm" className="rounded-xl border-amber-200 bg-white/70 font-black text-amber-700 hover:bg-amber-50" onClick={() => setShowSuspend(u)}>
                                Suspend
                              </Button>
                            ) : null}
                            {panel.value === 'suspended' ? (
                              <>
                                <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => handleReactivate(u.id)}>
                                  Reactivate
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50" onClick={() => handleSoftDelete(u.id)}>
                                  Archive
                                </Button>
                              </>
                            ) : null}
                            {panel.value === 'deleted' ? (
                              <>
                                <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => handleExport(u.id)}>
                                  <Download className="mr-1 h-3.5 w-3.5" />
                                  Export
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50" onClick={() => { setShowPurge(u); setPurgeConfirmName(''); }}>
                                  Purge
                                </Button>
                              </>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </AdminSectionCard>
          </TabsContent>
        ))}
      </Tabs>

>>>>>>> Stashed changes
      <Dialog open={!!showSuspend} onOpenChange={() => setShowSuspend(null)}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-700">Suspend User</DialogTitle>
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
          <div className="text-sm space-y-3">
            <p>Type the user&apos;s full name to confirm:</p>
            <p className="font-mono text-muted-foreground">{showPurge?.firstName} {showPurge?.lastName}</p>
            <Input value={purgeConfirmName} onChange={(e) => setPurgeConfirmName(e.target.value)} placeholder="Type full name here..." className="admin-input" />
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
    </AdminPageShell>
  );
}
