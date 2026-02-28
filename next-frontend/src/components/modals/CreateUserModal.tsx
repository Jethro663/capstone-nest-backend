'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Eye, EyeOff, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { userService } from '@/services/user-service';
import { profileService } from '@/services/profile-service';
import type { User } from '@/types/user';

// ─── Types ─────────────────────────────────────────────────────────────────

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  userRole: 'student' | 'teacher';
  studentId: string;   // LRN — 12 digits, student only
  gradeLevel: string;  // '7' | '8' | '9' | '10', student only
  password: string;
  resetPassword: boolean; // edit mode only
}

type FormErrors = Partial<Record<keyof FormData, string>>;

interface ApiError {
  title: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

interface CreateUserModalProps {
  /** Pass a user to enter edit mode; pass null/undefined for create mode. */
  user?: User | null;
  open: boolean;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its list. */
  onSaved: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function validateField(
  name: keyof FormData,
  value: string | boolean,
  formData: FormData,
  isEditMode: boolean,
): string {
  const strVal = typeof value === 'string' ? value : '';

  switch (name) {
    case 'firstName':
    case 'lastName': {
      if (!strVal.trim())
        return `${name === 'firstName' ? 'First' : 'Last'} name is required`;
      if (/[0-9]/.test(strVal)) return 'Numbers are not allowed';
      if (/[^a-zA-Z\s]/.test(strVal)) return 'Special characters are not allowed';
      return '';
    }
    case 'middleName': {
      if (strVal) {
        if (/[0-9]/.test(strVal)) return 'Numbers are not allowed';
        if (/[^a-zA-Z\s]/.test(strVal)) return 'Special characters are not allowed';
      }
      return '';
    }
    case 'email': {
      if (!strVal.trim()) return 'Email is required';
      if (!/^\S+@\S+\.\S+$/.test(strVal)) return 'Invalid email format';
      return '';
    }
    case 'studentId': {
      if (formData.userRole === 'student') {
        if (!strVal.trim()) return 'Student ID is required';
        if (!/^[0-9]{12}$/.test(strVal))
          return 'Student ID must be exactly 12 digits';
      }
      return '';
    }
    case 'gradeLevel': {
      if (formData.userRole === 'student' && !strVal)
        return 'Grade level is required';
      return '';
    }
    case 'password': {
      if (isEditMode && formData.resetPassword && !strVal)
        return 'Password is required';
      return '';
    }
    default:
      return '';
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CreateUserModal({
  user,
  open,
  onClose,
  onSaved,
}: CreateUserModalProps) {
  const isEditMode = !!user;

  const blankForm = (): FormData => ({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    userRole: 'student',
    studentId: '',
    gradeLevel: '',
    password: '',
    resetPassword: false,
  });

  const [formData, setFormData] = useState<FormData>(blankForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Populate form when opening in edit mode
  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      setShowPassword(false);
      if (user) {
        setFormData({
          firstName: user.firstName ?? '',
          middleName: user.middleName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? '',
          // Roles come as raw strings like 'ROLE_STUDENT' — getRoleName normalises them,
          // but for the form we only need student/teacher so we match loosely.
          userRole:
            (user.roles?.[0] ?? '').toLowerCase().includes('teacher')
              ? 'teacher'
              : 'student',
          studentId: user.lrn ?? '',
          gradeLevel: user.gradeLevel ?? '',
          password: '',
          resetPassword: false,
        });
      } else {
        setFormData(blankForm());
      }
    }
  }, [open, user]);

  // ── Field change handler ────────────────────────────────────────────────

  const handleChange = useCallback(
    (name: keyof FormData, value: string | boolean) => {
      setFormData((prev) => {
        const next: FormData = { ...prev, [name]: value };

        // When role changes away from student, clear student-only fields
        if (name === 'userRole' && value !== 'student') {
          next.studentId = '';
          next.gradeLevel = '';
        }

        // Clear password + showPassword flag when resetPassword is unchecked
        if (name === 'resetPassword' && value === false) {
          next.password = '';
        }

        // Validate the changed field against next state
        setErrors((prevErr) => ({
          ...prevErr,
          [name]: validateField(name, value, next, isEditMode),
        }));

        // Re-validate student-only fields when role changes
        if (name === 'userRole') {
          setErrors((prevErr) => ({
            ...prevErr,
            studentId: validateField('studentId', next.studentId, next, isEditMode),
            gradeLevel: validateField('gradeLevel', next.gradeLevel, next, isEditMode),
          }));
        }

        return next;
      });
    },
    [isEditMode],
  );

  // ── Password strength ───────────────────────────────────────────────────

  const passwordChecks = useMemo(
    () => ({
      hasNumber: /\d/.test(formData.password),
      hasLower: /[a-z]/.test(formData.password),
      hasUpper: /[A-Z]/.test(formData.password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
    }),
    [formData.password],
  );

  const passwordStrengthOk = Object.values(passwordChecks).every(Boolean);

  // ── Form validity ───────────────────────────────────────────────────────

  const isFormValid = useMemo(() => {
    const required: (keyof FormData)[] = ['firstName', 'lastName', 'email'];

    if (formData.userRole === 'student') {
      required.push('studentId', 'gradeLevel');
    }

    if (isEditMode && formData.resetPassword) {
      required.push('password');
    }

    const allFilled = required.every((f) => {
      const v = formData[f];
      return typeof v === 'string' ? v.trim() !== '' : !!v;
    });

    const noErrors = !Object.values(errors).some((e) => !!e);

    const passwordOk =
      !isEditMode || !formData.resetPassword || passwordStrengthOk;

    return allFilled && noErrors && passwordOk;
  }, [formData, errors, isEditMode, passwordStrengthOk]);

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setLoading(true);
    setApiError(null);

    try {
      let savedUserId: string | undefined;

      if (isEditMode && user) {
        // ── Edit mode ───────────────────────────────────────────────────
        const updatePayload: Parameters<typeof userService.update>[1] = {
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim() || undefined,
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          ...(formData.resetPassword && formData.password
            ? { password: formData.password }
            : {}),
        };

        await userService.update(user.id, updatePayload);
        savedUserId = user.id;
        toast.success('User updated successfully');
      } else {
        // ── Create mode ─────────────────────────────────────────────────
        const createPayload: Parameters<typeof userService.create>[0] = {
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim() || undefined,
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.userRole,
          lrn:
            formData.userRole === 'student'
              ? formData.studentId.trim()
              : undefined,
          // No password — backend sends OTP verification email
        };

        const res = await userService.create(createPayload);
        savedUserId = res?.data?.user?.id;
        toast.success(
          'User created. A verification email with OTP has been sent for password setup.',
        );
      }

      // ── Profile update for students ─────────────────────────────────
      if (formData.userRole === 'student' && savedUserId) {
        try {
          await profileService.update(savedUserId, {
            gradeLevel: formData.gradeLevel as
              | '7'
              | '8'
              | '9'
              | '10'
              | undefined,
          });
        } catch (profileErr: unknown) {
          const msg =
            profileErr instanceof Error
              ? profileErr.message
              : 'Unknown error';
          console.error('Profile update failed:', profileErr);
          toast.error('User saved but grade level update failed', {
            description: msg,
          });
        }
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      // Try to extract structured API errors
      if (
        err !== null &&
        typeof err === 'object' &&
        'response' in err
      ) {
        const axiosErr = err as {
          response?: {
            data?: {
              message?: string;
              errors?: Record<string, string>;
            };
          };
        };
        const data = axiosErr.response?.data;
        const fieldErrors = data?.errors;

        if (fieldErrors) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }

        setApiError({
          title: 'Save Failed',
          message: data?.message ?? 'An unexpected error occurred.',
          fieldErrors,
        });
      } else {
        const msg =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        setApiError({ title: 'Save Failed', message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setApiError(null);
    setErrors({});
    onClose();
  };

  const isTeacher = formData.userRole === 'teacher';

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? 'Update the user account information below.'
              : 'Fill in the details to register a new system account.'}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── API Error Banner ─────────────────────────────────────────── */}
          {apiError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">{apiError.title}</p>
              <p>{apiError.message}</p>
            </div>
          )}

          {/* ── Name Row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldWrapper label="First Name" error={errors.firstName}>
              <Input
                value={formData.firstName}
                maxLength={30}
                disabled={loading}
                placeholder="John"
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={errors.firstName ? 'border-red-500' : ''}
              />
            </FieldWrapper>

            <FieldWrapper label="Middle Name" error={errors.middleName}>
              <Input
                value={formData.middleName}
                maxLength={30}
                disabled={loading}
                placeholder="Quincy (optional)"
                onChange={(e) => handleChange('middleName', e.target.value)}
                className={errors.middleName ? 'border-red-500' : ''}
              />
            </FieldWrapper>

            <FieldWrapper label="Last Name" error={errors.lastName}>
              <Input
                value={formData.lastName}
                maxLength={30}
                disabled={loading}
                placeholder="Doe"
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={errors.lastName ? 'border-red-500' : ''}
              />
            </FieldWrapper>
          </div>

          {/* ── Email ────────────────────────────────────────────────────── */}
          <FieldWrapper label="Email Address" error={errors.email}>
            <Input
              type="email"
              value={formData.email}
              maxLength={100}
              disabled={loading}
              placeholder="john.doe@gmail.com"
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
          </FieldWrapper>

          {/* ── Role / Student ID / Grade Level ──────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Role — only changeable on create */}
            <FieldWrapper label="User Role">
              {isEditMode ? (
                <Input
                  value={formData.userRole.charAt(0).toUpperCase() + formData.userRole.slice(1)}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              ) : (
                <Select
                  value={formData.userRole}
                  disabled={loading}
                  onValueChange={(v) =>
                    handleChange('userRole', v as 'student' | 'teacher')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FieldWrapper>

            {/* Student ID (LRN) */}
            <FieldWrapper label="Student ID (LRN)" error={!isTeacher ? errors.studentId : undefined}>
              <div className="relative">
                <Input
                  value={isTeacher ? '' : formData.studentId}
                  maxLength={12}
                  disabled={isTeacher || loading}
                  placeholder={isTeacher ? 'N/A — Teacher' : '12-digit LRN'}
                  onChange={(e) => handleChange('studentId', e.target.value)}
                  className={
                    isTeacher
                      ? 'bg-muted text-muted-foreground cursor-not-allowed pr-8'
                      : errors.studentId
                      ? 'border-red-500'
                      : ''
                  }
                />
                {isTeacher && (
                  <Lock
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                )}
              </div>
            </FieldWrapper>

            {/* Grade Level — students only */}
            {formData.userRole === 'student' && (
              <FieldWrapper label="Grade Level" error={errors.gradeLevel}>
                <Select
                  value={formData.gradeLevel}
                  disabled={loading}
                  onValueChange={(v) => handleChange('gradeLevel', v)}
                >
                  <SelectTrigger
                    className={errors.gradeLevel ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Grade 7</SelectItem>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWrapper>
            )}
          </div>

          {/* ── Password section ──────────────────────────────────────────── */}
          {!isEditMode ? (
            /* Create mode: OTP onboarding info — no password field */
            <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <Info size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">OTP Onboarding Enabled</p>
                <p className="text-blue-700">
                  The user will receive a verification email with a one-time
                  password. They must verify their email and set their own
                  password before logging in.
                </p>
              </div>
            </div>
          ) : (
            /* Edit mode: optional "Reset Password" toggle */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="resetPassword"
                  type="checkbox"
                  checked={formData.resetPassword}
                  disabled={loading}
                  onChange={(e) =>
                    handleChange('resetPassword', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 accent-red-600"
                />
                <Label htmlFor="resetPassword" className="cursor-pointer text-sm">
                  Reset this user&apos;s password
                </Label>
              </div>

              {formData.resetPassword && (
                <div className="space-y-2">
                  <FieldWrapper label="New Password" error={errors.password}>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        disabled={loading}
                        placeholder="Enter new password"
                        onChange={(e) =>
                          handleChange('password', e.target.value)
                        }
                        className={
                          errors.password ? 'border-red-500 pr-10' : 'pr-10'
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </FieldWrapper>

                  {/* Password strength rules */}
                  <div className="space-y-1 text-xs">
                    <PasswordRule
                      label="At least 1 number"
                      valid={passwordChecks.hasNumber}
                    />
                    <PasswordRule
                      label="At least 1 lowercase letter"
                      valid={passwordChecks.hasLower}
                    />
                    <PasswordRule
                      label="At least 1 uppercase letter"
                      valid={passwordChecks.hasUpper}
                    />
                    <PasswordRule
                      label="At least 1 special character (e.g. @ ! #)"
                      valid={passwordChecks.hasSpecial}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading
              ? 'Saving…'
              : isEditMode
              ? 'Save Changes'
              : 'Register User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
      <Label className="text-xs font-semibold uppercase tracking-wide">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PasswordRule({ label, valid }: { label: string; valid: boolean }) {
  return (
    <p className={valid ? 'text-green-600' : 'text-red-500'}>
      {valid ? '✓' : '✗'} {label}
    </p>
  );
}
