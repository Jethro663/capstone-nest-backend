'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Copy, KeyRound, ShieldCheck, UserCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '@/services/user-service';
import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { getRoleName, formatDate } from '@/utils/helpers';
import type { UpdateUserDto, User } from '@/types/user';

type UserFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  lrn: string;
  gradeLevel: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  familyName: string;
  familyRelationship: string;
  familyContact: string;
};

const EMPTY_FORM: UserFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  role: 'student',
  lrn: '',
  gradeLevel: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  address: '',
  familyName: '',
  familyRelationship: '',
  familyContact: '',
};

function toFormState(user: User): UserFormState {
  const role = getRoleName(user.roles?.[0]) || 'student';
  return {
    firstName: user.firstName ?? '',
    middleName: user.middleName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    role: role === 'teacher' || role === 'admin' ? role : 'student',
    lrn: String(user.lrn ?? ''),
    gradeLevel: String(user.gradeLevel ?? ''),
    dateOfBirth: String(user.dateOfBirth ?? user.dob ?? '').slice(0, 10),
    gender: String(user.gender ?? ''),
    phone: String(user.phone ?? ''),
    address: String(user.address ?? ''),
    familyName: String(user.familyName ?? ''),
    familyRelationship: String(user.familyRelationship ?? ''),
    familyContact: String(user.familyContact ?? ''),
  };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetResult, setShowResetResult] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const role = useMemo(() => form.role, [form.role]);
  const isStudent = role === 'student';

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await userService.getById(userId);
      const loadedUser = response.data.user;

      if (!loadedUser) {
        toast.error('User not found');
        router.push('/dashboard/admin/users');
        return;
      }

      setUser(loadedUser);
      setForm(toFormState(loadedUser));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load user details'));
      router.push('/dashboard/admin/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setField = (field: keyof UserFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleResetPassword = async () => {
    try {
      setResetting(true);
      const response = await userService.resetPassword(userId);
      setGeneratedPassword(response.generatedPassword);
      setShowResetConfirm(false);
      setShowResetResult(true);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to reset password'));
    } finally {
      setResetting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Failed to copy password');
    }
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }

    if (isStudent) {
      if (!/^[0-9]{12}$/.test(form.lrn.trim())) {
        toast.error('Student LRN must be exactly 12 digits');
        return;
      }
      if (!form.gradeLevel) {
        toast.error('Grade level is required for student accounts');
        return;
      }
    }

    const payload: UpdateUserDto = {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || undefined,
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      lrn: isStudent ? form.lrn.trim() : undefined,
      gradeLevel: isStudent ? form.gradeLevel || undefined : undefined,
      dateOfBirth: isStudent ? form.dateOfBirth || undefined : undefined,
      gender: isStudent ? form.gender || undefined : undefined,
      phone: isStudent ? form.phone || undefined : undefined,
      address: isStudent ? form.address || undefined : undefined,
      familyName: isStudent ? form.familyName || undefined : undefined,
      familyRelationship: isStudent ? (form.familyRelationship || undefined) : undefined,
      familyContact: isStudent ? form.familyContact || undefined : undefined,
    };

    try {
      setSaving(true);
      const response = await userService.update(userId, payload);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      setForm(toFormState(updatedUser));
      toast.success('User details updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update user details'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
        <Skeleton className="h-[32rem] rounded-[1.7rem]" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground">User not found.</p>;
  }

  return (
    <AdminPageShell
      badge="Admin Users"
      title={`${form.firstName} ${form.lastName}`}
      description="User details now live inside a stronger admin profile workspace, with the same edit and reset actions presented in a more readable way."
      actions={(
        <>
          <Button variant="outline" className="admin-button-outline rounded-xl px-4 font-black" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="outline" className="admin-button-outline rounded-xl px-4 font-black" onClick={() => setShowResetConfirm(true)} disabled={resetting}>
            <KeyRound className="h-4 w-4" />
            {resetting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </>
      )}
      stats={(
        <>
          <AdminStatCard label="Status" value={user.status} caption="Current account state" icon={ShieldCheck} accent="emerald" />
          <AdminStatCard label="Role" value={role} caption="Primary role assignment" icon={UserCircle2} accent="sky" />
          <AdminStatCard label="Created" value={user.createdAt ? formatDate(user.createdAt) : 'Unknown'} caption="Account creation date" icon={Users} accent="amber" />
          <AdminStatCard label="Last Login" value={user.lastLoginAt ? formatDate(String(user.lastLoginAt)) : 'Never'} caption="Most recent sign-in" icon={KeyRound} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Identity Snapshot" description="High-signal account facts stay visible at the top while you manage the details below.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="admin-metric">
            <span>User ID</span>
            <strong className="break-all">{user.id}</strong>
          </div>
          <div className="admin-metric">
            <span>Status</span>
            <strong>{user.status}</strong>
          </div>
          <div className="admin-metric">
            <span>Role</span>
            <strong>{role}</strong>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Account Details"
        description="Core identity, email, and role assignment stay editable here, but the layout now mirrors the upgraded admin workspace."
        action={(
          <div className="flex items-center gap-2">
            <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>{user.status}</Badge>
            <Badge variant="outline">{role}</Badge>
          </div>
        )}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="First Name">
            <Input value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} className="admin-input" />
          </Field>
          <Field label="Middle Name">
            <Input value={form.middleName} onChange={(event) => setField('middleName', event.target.value)} className="admin-input" />
          </Field>
          <Field label="Last Name">
            <Input value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} className="admin-input" />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Email Address">
            <Input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} className="admin-input" />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(event) => setField('role', event.target.value as 'student' | 'teacher' | 'admin')} className="admin-select w-full text-sm font-semibold">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </div>
      </AdminSectionCard>

      {isStudent ? (
        <AdminSectionCard
          title="Student Profile"
          description="Student-specific profile fields stay separate, but now sit in the same polished detail workspace."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="LRN">
              <Input value={form.lrn} onChange={(event) => setField('lrn', event.target.value)} placeholder="12-digit LRN" className="admin-input" />
            </Field>
            <Field label="Grade Level">
              <select value={form.gradeLevel} onChange={(event) => setField('gradeLevel', event.target.value)} className="admin-select w-full text-sm font-semibold">
                <option value="">Select grade</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
              </select>
            </Field>
            <Field label="Date of Birth">
              <Input type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} className="admin-input" />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Gender">
              <select value={form.gender} onChange={(event) => setField('gender', event.target.value)} className="admin-select w-full text-sm font-semibold">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(event) => setField('phone', event.target.value)} className="admin-input" />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Address">
              <Input value={form.address} onChange={(event) => setField('address', event.target.value)} className="admin-input" />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Guardian Name">
              <Input value={form.familyName} onChange={(event) => setField('familyName', event.target.value)} className="admin-input" />
            </Field>
            <Field label="Relationship">
              <select value={form.familyRelationship} onChange={(event) => setField('familyRelationship', event.target.value)} className="admin-select w-full text-sm font-semibold">
                <option value="">Select relationship</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Guardian Contact">
              <Input value={form.familyContact} onChange={(event) => setField('familyContact', event.target.value)} className="admin-input" />
            </Field>
          </div>
        </AdminSectionCard>
      ) : null}

      <div className="flex justify-end">
        <Button className="admin-button-solid rounded-xl px-5 font-black" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              This will generate a new temporary password for {form.firstName} {form.lastName}. The password will be emailed to the user.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setShowResetConfirm(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button className="admin-button-solid rounded-xl font-black" onClick={handleResetPassword} disabled={resetting}>
              {resetting ? 'Resetting...' : 'Confirm Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showResetResult}
        onOpenChange={(open) => {
          setShowResetResult(open);
          if (!open) {
            setGeneratedPassword('');
          }
        }}
      >
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle>New Temporary Password</DialogTitle>
            <DialogDescription>
              Share this securely. This value is shown once in this admin view.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-[var(--admin-outline)] bg-white/75 p-3">
            <p className="break-all font-mono text-sm">{generatedPassword}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={handleCopyPassword}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Password
            </Button>
            <Button className="admin-button-solid rounded-xl font-black" onClick={() => setShowResetResult(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
