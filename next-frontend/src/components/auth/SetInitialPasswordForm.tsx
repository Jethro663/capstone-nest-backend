/**
 * Set Activation Password Form
 *
 * Reached after OTP verification has already activated the account.
 * The student can choose a new personal password (replaces the admin-generated
 * temporary password) or skip — in which case they use the temp password to log in.
 *
 * Uses POST /auth/set-activation-password (no OTP code required — account ACTIVE
 * status is the gate). On success, auto-logs the user in and sends them to /dashboard.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, CircleDashed } from 'lucide-react';

import {
  setActivationPasswordSchema,
  type SetActivationPasswordFormValues,
} from '@/schemas/auth';
import { completeActivationPasswordAction } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const strengthChecks = [
  { label: '≥ 8 chars', test: (v: string) => v.length >= 8 },
  { label: 'Uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Number',    test: (v: string) => /[0-9]/.test(v) },
  { label: 'Special',   test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export function SetInitialPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SetActivationPasswordFormValues>({
    resolver: zodResolver(setActivationPasswordSchema),
  });

  // Watch password for real-time strength indicator
  const newPassword = useWatch({ control, name: 'newPassword', defaultValue: '' });

  useEffect(() => {
    const e = searchParams.get('email');
    if (e) setValue('email', e);
  }, [searchParams, setValue]);

  const onSubmit = async (data: SetActivationPasswordFormValues) => {
    setServerError('');
    const result = await completeActivationPasswordAction({
      email: data.email,
      newPassword: data.newPassword,
    });

    if (!result.success) {
      setServerError(result.message || 'Failed to set password');
      return;
    }

    setSuccess('Password set! Redirecting to login…');
    setTimeout(() => router.push('/login?activated=true'), 1200);
  };

  const handleSkip = () => {
    router.push('/login?activated=true');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Secure your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is now active! Set a personal password below, or skip and log in with the
          temporary password sent to your email.
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}
      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Email — read-only, pre-filled from URL */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          disabled
          {...register('email')}
          className="bg-slate-50 text-slate-500"
        />
      </div>

      {/* New Password + real-time strength pills */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="••••••••"
          disabled={isSubmitting}
          {...register('newPassword')}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {strengthChecks.map(({ label, test }) => {
            const passed = test(newPassword ?? '');
            return (
              <span
                key={label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  passed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {passed ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {label}
              </span>
            );
          })}
        </div>
        {errors.newPassword && (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          disabled={isSubmitting}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Setting password…
            </span>
          ) : (
            'Set password & continue to login'
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip — I&apos;ll use my temporary password
        </Button>
      </div>

      <div className="text-center">
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </form>
  );
}
