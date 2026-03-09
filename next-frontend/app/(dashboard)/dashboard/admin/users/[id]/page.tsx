'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { userService } from '@/services/user-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      familyRelationship: isStudent
        ? (form.familyRelationship || undefined)
        : undefined,
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
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground">User not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {form.firstName} {form.lastName}
            </h1>
            <p className="text-muted-foreground">
              Review and update account details, role assignment, and student
              profile fields from one page.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {user.status}
          </Badge>
          <Badge variant="outline">{role}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              User ID
            </p>
            <p className="mt-1 break-all text-sm">{user.id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Created
            </p>
            <p className="mt-1 text-sm">
              {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last Login
            </p>
            <p className="mt-1 text-sm">
              {user.lastLoginAt ? formatDate(String(user.lastLoginAt)) : 'Never'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold">Account details</h2>
            <p className="text-sm text-muted-foreground">
              Core identity, email, and role assignment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="First Name">
              <Input
                value={form.firstName}
                onChange={(event) => setField('firstName', event.target.value)}
              />
            </Field>
            <Field label="Middle Name">
              <Input
                value={form.middleName}
                onChange={(event) => setField('middleName', event.target.value)}
              />
            </Field>
            <Field label="Last Name">
              <Input
                value={form.lastName}
                onChange={(event) => setField('lastName', event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email Address">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(event) =>
                  setField(
                    'role',
                    event.target.value as 'student' | 'teacher' | 'admin',
                  )
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>
        </CardContent>
      </Card>

      {isStudent ? (
        <Card>
          <CardContent className="space-y-6 p-6">
            <div>
              <h2 className="text-lg font-semibold">Student profile</h2>
              <p className="text-sm text-muted-foreground">
                Profile fields now live outside the core user identity model.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="LRN">
                <Input
                  value={form.lrn}
                  onChange={(event) => setField('lrn', event.target.value)}
                  placeholder="12-digit LRN"
                />
              </Field>
              <Field label="Grade Level">
                <select
                  value={form.gradeLevel}
                  onChange={(event) => setField('gradeLevel', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select grade</option>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    setField('dateOfBirth', event.target.value)
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(event) => setField('gender', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                />
              </Field>
            </div>

            <Field label="Address">
              <Input
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Guardian Name">
                <Input
                  value={form.familyName}
                  onChange={(event) => setField('familyName', event.target.value)}
                />
              </Field>
              <Field label="Relationship">
                <select
                  value={form.familyRelationship}
                  onChange={(event) =>
                    setField('familyRelationship', event.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Guardian Contact">
                <Input
                  value={form.familyContact}
                  onChange={(event) =>
                    setField('familyContact', event.target.value)
                  }
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
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
