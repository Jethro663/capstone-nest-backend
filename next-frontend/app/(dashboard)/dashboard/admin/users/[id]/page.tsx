'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '@/services/user-service';
import {
  AdminPageShell,
  AdminSectionCard,
} from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDate, getRoleName } from '@/utils/helpers';
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
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-[1.2rem]" />
        <Skeleton className="h-[30rem] rounded-[1.2rem]" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground">User not found.</p>;
  }

  return (
    <AdminPageShell
      badge="Admin Users"
      title={`${form.firstName} ${form.lastName}`.trim()}
      description="Review and update account details in the same compact form layout used for new users."
      variant="compact-form"
      actions={(
        <>
          <Button variant="outline" className="admin-button-outline h-9 rounded-lg px-4 text-sm font-semibold" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="outline" className="admin-button-outline h-9 rounded-lg px-4 text-sm font-semibold" onClick={() => setShowResetConfirm(true)} disabled={resetting}>
            <KeyRound className="h-4 w-4" />
            {resetting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </>
      )}
      meta={(
        <>
          <MetaItem label="Status" value={user.status} />
          <MetaItem label="Role" value={role} />
          <MetaItem label="Created" value={user.createdAt ? formatDate(user.createdAt) : 'Unknown'} />
          <MetaItem label="Last login" value={user.lastLoginAt ? formatDate(String(user.lastLoginAt)) : 'Never'} />
        </>
      )}
    >
      <AdminSectionCard
        title="Account Details"
        description="Core identity, email, and role assignment."
        density="compact"
        contentClassName="space-y-4"
      >
        <p className="text-xs text-[var(--admin-text-muted)]">
          User ID:{' '}
          <span className="font-semibold text-[var(--admin-text-strong)] break-all">
            {user.id}
          </span>
        </p>

        <div className="admin-form-grid admin-form-grid--three">
          <Field label="First Name">
            <Input value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} className="admin-input rounded-lg" />
          </Field>
          <Field label="Middle Name">
            <Input value={form.middleName} onChange={(event) => setField('middleName', event.target.value)} className="admin-input rounded-lg" />
          </Field>
          <Field label="Last Name">
            <Input value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} className="admin-input rounded-lg" />
          </Field>
        </div>

        <div className="admin-form-grid admin-form-grid--two">
          <Field label="Email Address">
            <Input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} className="admin-input rounded-lg" />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(event) => setField('role', event.target.value as 'student' | 'teacher' | 'admin')} className="admin-select w-full rounded-lg text-sm font-semibold">
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
          description="Student details stay available in the same compact layout."
          density="compact"
          contentClassName="space-y-4"
        >
          <div className="admin-form-grid admin-form-grid--three">
            <Field label="LRN">
              <Input value={form.lrn} onChange={(event) => setField('lrn', event.target.value)} placeholder="12-digit LRN" className="admin-input rounded-lg" />
            </Field>
            <Field label="Grade Level">
              <select value={form.gradeLevel} onChange={(event) => setField('gradeLevel', event.target.value)} className="admin-select w-full rounded-lg text-sm font-semibold">
                <option value="">Select grade</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
              </select>
            </Field>
            <Field label="Date of Birth">
              <Input type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} className="admin-input rounded-lg" />
            </Field>
          </div>

          <div className="admin-form-grid admin-form-grid--two">
            <Field label="Gender">
              <select value={form.gender} onChange={(event) => setField('gender', event.target.value)} className="admin-select w-full rounded-lg text-sm font-semibold">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(event) => setField('phone', event.target.value)} className="admin-input rounded-lg" />
            </Field>
          </div>

          <Field label="Address">
            <Input value={form.address} onChange={(event) => setField('address', event.target.value)} className="admin-input rounded-lg" />
          </Field>

          <div className="admin-form-grid admin-form-grid--three">
            <Field label="Guardian Name">
              <Input value={form.familyName} onChange={(event) => setField('familyName', event.target.value)} className="admin-input rounded-lg" />
            </Field>
            <Field label="Relationship">
              <select value={form.familyRelationship} onChange={(event) => setField('familyRelationship', event.target.value)} className="admin-select w-full rounded-lg text-sm font-semibold">
                <option value="">Select relationship</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Guardian Contact">
              <Input value={form.familyContact} onChange={(event) => setField('familyContact', event.target.value)} className="admin-input rounded-lg" />
            </Field>
          </div>
        </AdminSectionCard>
      ) : null}

      <div className="admin-form-actions">
        <Button className="admin-button-solid h-9 rounded-lg px-4 text-sm font-semibold" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="rounded-[1.1rem] border border-[var(--admin-outline)] bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Generate a new temporary password for {form.firstName} {form.lastName}. The password will be emailed to the user.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline h-9 rounded-lg px-4 text-sm font-semibold" onClick={() => setShowResetConfirm(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button className="admin-button-solid h-9 rounded-lg px-4 text-sm font-semibold" onClick={handleResetPassword} disabled={resetting}>
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
        <DialogContent className="rounded-[1.1rem] border border-[var(--admin-outline)] bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle>New Temporary Password</DialogTitle>
            <DialogDescription>
              Share this securely. This value is shown once in this admin view.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[var(--admin-outline)] bg-slate-50 p-3">
            <p className="break-all font-mono text-sm">{generatedPassword}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline h-9 rounded-lg px-4 text-sm font-semibold" onClick={handleCopyPassword}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Password
            </Button>
            <Button className="admin-button-solid h-9 rounded-lg px-4 text-sm font-semibold" onClick={() => setShowResetResult(false)}>
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
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="admin-compact-meta__item">
      <span className="admin-compact-meta__label">{label}</span>
      <span>{value}</span>
    </div>
  );
}
