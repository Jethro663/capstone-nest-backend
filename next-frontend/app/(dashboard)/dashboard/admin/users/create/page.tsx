'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AdminPageShell,
  AdminSectionCard,
} from '@/components/admin/AdminPageShell';
import { userService } from '@/services/user-service';
import { profileService } from '@/services/profile-service';

type UserRole = 'student' | 'teacher' | 'admin';

type FormData = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  role: UserRole;
  studentId: string;
  gradeLevel: string;
  employeeId: string;
  contactNumber: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const APPROVED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'aol.com',
  'protonmail.com',
  'zoho.com',
  'nu-moa.edu.ph',
];

const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9-]{1,20}$/;
const PH_MOBILE_REGEX = /^(?:\+63|0)9\d{9}$/;

function validateField(name: keyof FormData, value: string, formData: FormData): string {
  switch (name) {
    case 'firstName':
    case 'lastName': {
      if (!value.trim()) return `${name === 'firstName' ? 'First' : 'Last'} name is required`;
      if (/[0-9]/.test(value)) return 'Numbers are not allowed';
      if (/[^a-zA-Z\s]/.test(value)) return 'Special characters are not allowed';
      return '';
    }
    case 'middleName': {
      if (!value) return '';
      if (/[0-9]/.test(value)) return 'Numbers are not allowed';
      if (/[^a-zA-Z\s]/.test(value)) return 'Special characters are not allowed';
      return '';
    }
    case 'email': {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return 'Email is required';
      if (!/^\S+@\S+\.\S+$/.test(normalized)) return 'Invalid email format';
      const domain = normalized.split('@')[1] ?? '';
      if (!APPROVED_EMAIL_DOMAINS.includes(domain)) {
        return 'Use an approved email provider (Gmail, Yahoo, Outlook, etc.)';
      }
      return '';
    }
    case 'studentId': {
      if (formData.role !== 'student') return '';
      if (!value.trim()) return 'Student ID is required';
      if (!/^[0-9]{12}$/.test(value.trim())) return 'Student ID must be exactly 12 digits';
      return '';
    }
    case 'gradeLevel': {
      if (formData.role === 'student' && !value) return 'Grade level is required';
      return '';
    }
    case 'employeeId': {
      if (formData.role !== 'teacher') return '';
      if (!value.trim()) return 'Employee ID is required for teacher accounts';
      if (!EMPLOYEE_ID_REGEX.test(value.trim())) {
        return 'Employee ID must be 1-20 letters, numbers, or hyphens';
      }
      return '';
    }
    case 'contactNumber': {
      if (formData.role !== 'teacher') return '';
      if (!value.trim()) return 'Contact number is required for teacher accounts';
      if (!PH_MOBILE_REGEX.test(value.trim())) {
        return 'Use PH format: 09171234567 or +639171234567';
      }
      return '';
    }
    default:
      return '';
  }
}

export default function AdminCreateUserPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    role: 'student',
    studentId: '',
    gradeLevel: '',
    employeeId: '',
    contactNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const isTeacher = formData.role === 'teacher';
  const isStudent = formData.role === 'student';

  const handleFieldChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'role') {
        if (value !== 'student') {
          next.studentId = '';
          next.gradeLevel = '';
        }
        if (value !== 'teacher') {
          next.employeeId = '';
          next.contactNumber = '';
        }
      }
      return next;
    });

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value, { ...formData, [name]: value }),
    }));
  };

  const isFormValid = useMemo(() => {
    const required: (keyof FormData)[] = ['firstName', 'lastName', 'email', 'role'];
    if (isStudent) required.push('studentId', 'gradeLevel');
    if (isTeacher) required.push('employeeId', 'contactNumber');
    const allFilled = required.every((field) => formData[field].trim() !== '');
    const noErrors = !Object.values(errors).some(Boolean);
    return allFilled && noErrors;
  }, [formData, errors, isStudent, isTeacher]);

  const runFullValidation = (): boolean => {
    const nextErrors: FormErrors = {};
    (Object.keys(formData) as (keyof FormData)[]).forEach((field) => {
      const message = validateField(field, formData[field], formData);
      if (message) nextErrors[field] = message;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!runFullValidation()) {
      toast.error('Please fix highlighted validation errors first');
      return;
    }

    setLoading(true);
    try {
      const res = await userService.create({
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        lrn: isStudent ? formData.studentId.trim() : undefined,
        employeeId: isTeacher ? formData.employeeId.trim() : undefined,
        contactNumber: isTeacher ? formData.contactNumber.trim() : undefined,
      });

      const savedUserId = res?.data?.user?.id;
      if (isStudent && savedUserId) {
        await profileService.update(savedUserId, {
          gradeLevel: formData.gradeLevel as '7' | '8' | '9' | '10',
        });
      }

      toast.success('User created successfully. Verification email sent.');
      router.push('/dashboard/admin/users');
      router.refresh();
    } catch (err: unknown) {
      if (err !== null && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { data?: { message?: string; errors?: Record<string, string> } };
        };
        const message = axiosErr.response?.data?.message ?? 'Failed to create user';
        const fieldErrors = axiosErr.response?.data?.errors;
        if (fieldErrors) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        toast.error(message);
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPageShell
      badge="Admin Users"
      title="Create User"
      description="Add a new user with the same validation and onboarding flow, but in a tighter form layout that is easier to scan."
      variant="compact-form"
      actions={(
        <Button
          variant="outline"
          className="admin-button-outline h-9 rounded-lg px-4 text-sm font-semibold"
          onClick={() => router.push('/dashboard/admin/users')}
          disabled={loading}
        >
          Back to Users
        </Button>
      )}
      meta={(
        <>
          <MetaItem label="Role" value={formData.role} />
          <MetaItem label="Validation" value={isFormValid ? 'Ready' : 'In progress'} />
        </>
      )}
    >
      <AdminSectionCard
        title="Account Details"
        description="Core identity, email, and role selection come first."
        density="compact"
        contentClassName="space-y-4"
      >
        <div className="admin-form-grid admin-form-grid--three">
          <FieldWrapper label="First Name" error={errors.firstName}>
            <Input value={formData.firstName} maxLength={30} disabled={loading} placeholder="John" onChange={(e) => handleFieldChange('firstName', e.target.value)} className={errors.firstName ? 'border-red-500' : 'admin-input rounded-lg'} />
          </FieldWrapper>
          <FieldWrapper label="Middle Name" error={errors.middleName}>
            <Input value={formData.middleName} maxLength={30} disabled={loading} placeholder="Quincy (optional)" onChange={(e) => handleFieldChange('middleName', e.target.value)} className={errors.middleName ? 'border-red-500' : 'admin-input rounded-lg'} />
          </FieldWrapper>
          <FieldWrapper label="Last Name" error={errors.lastName}>
            <Input value={formData.lastName} maxLength={30} disabled={loading} placeholder="Doe" onChange={(e) => handleFieldChange('lastName', e.target.value)} className={errors.lastName ? 'border-red-500' : 'admin-input rounded-lg'} />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Email Address" error={errors.email}>
          <Input type="email" value={formData.email} maxLength={100} disabled={loading} placeholder="john.doe@gmail.com" onChange={(e) => handleFieldChange('email', e.target.value)} className={errors.email ? 'border-red-500' : 'admin-input rounded-lg'} />
        </FieldWrapper>

        <div className="admin-form-grid admin-form-grid--three">
          <FieldWrapper label="User Role">
            <Select value={formData.role} disabled={loading} onValueChange={(v) => handleFieldChange('role', v as UserRole)}>
              <SelectTrigger className="admin-input rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Student ID (LRN)" error={isStudent ? errors.studentId : undefined}>
            <div className="relative">
              <Input
                value={isStudent ? formData.studentId : ''}
                maxLength={12}
                disabled={!isStudent || loading}
                placeholder={isStudent ? '12-digit LRN' : 'N/A'}
                onChange={(e) => handleFieldChange('studentId', e.target.value)}
                className={!isStudent ? 'admin-input cursor-not-allowed rounded-lg bg-muted pr-8 text-muted-foreground' : errors.studentId ? 'border-red-500' : 'admin-input rounded-lg'}
              />
              {!isStudent ? <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /> : null}
            </div>
          </FieldWrapper>

          <FieldWrapper label="Grade Level" error={isStudent ? errors.gradeLevel : undefined}>
            <Select value={isStudent ? formData.gradeLevel : ''} disabled={!isStudent || loading} onValueChange={(v) => handleFieldChange('gradeLevel', v)}>
              <SelectTrigger className={isStudent && errors.gradeLevel ? 'border-red-500' : 'admin-input rounded-lg'}>
                <SelectValue placeholder={isStudent ? 'Select grade' : 'N/A'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Grade 7</SelectItem>
                <SelectItem value="8">Grade 8</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
              </SelectContent>
            </Select>
          </FieldWrapper>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Role-Specific Details"
        description="Teacher fields stay available here when the selected role needs them."
        density="compact"
        contentClassName="space-y-4"
      >
        <div className="admin-form-grid admin-form-grid--two">
          <FieldWrapper label="Teacher Employee ID" error={isTeacher ? errors.employeeId : undefined}>
            <div className="relative">
              <Input
                value={isTeacher ? formData.employeeId : ''}
                maxLength={20}
                disabled={!isTeacher || loading}
                placeholder={isTeacher ? 'e.g. TCH-2026-001' : 'N/A'}
                onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                className={!isTeacher ? 'admin-input cursor-not-allowed rounded-lg bg-muted pr-8 text-muted-foreground' : errors.employeeId ? 'border-red-500' : 'admin-input rounded-lg'}
              />
              {!isTeacher ? <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /> : null}
            </div>
          </FieldWrapper>

          <FieldWrapper label="Teacher Contact Number" error={isTeacher ? errors.contactNumber : undefined}>
            <div className="relative">
              <Input
                value={isTeacher ? formData.contactNumber : ''}
                disabled={!isTeacher || loading}
                placeholder={isTeacher ? '09171234567 or +639171234567' : 'N/A'}
                onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
                className={!isTeacher ? 'admin-input cursor-not-allowed rounded-lg bg-muted pr-8 text-muted-foreground' : errors.contactNumber ? 'border-red-500' : 'admin-input rounded-lg'}
              />
              {!isTeacher ? <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /> : null}
            </div>
          </FieldWrapper>
        </div>

        <div className="admin-inline-note">
          <Info size={16} className="mt-0.5 shrink-0 text-[var(--admin-accent)]" />
          <div>
            <p className="admin-inline-note__title">OTP onboarding enabled</p>
            <p>The user receives a verification email with OTP and sets their password after verifying email.</p>
          </div>
        </div>

        <div className="admin-form-actions">
          <Button variant="outline" className="admin-button-outline h-9 rounded-lg px-4 text-sm font-semibold" onClick={() => router.push('/dashboard/admin/users')} disabled={loading}>
            Cancel
          </Button>
          <Button className="admin-button-solid h-9 rounded-lg px-4 text-sm font-semibold" onClick={handleSubmit} disabled={loading || !isFormValid}>
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}

function FieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-semibold uppercase tracking-wide">{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
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
