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
  { label: '>= 8 chars', test: (v: string) => v.length >= 8 },
  { label: 'Uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'Special', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
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

    setSuccess('Password set! Redirecting to login...');
    setTimeout(() => router.push('/login?activated=true'), 1200);
  };

  const handleSkip = () => {
    router.push('/login?activated=true');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form space-y-6">
      <div>
        <h2 className="auth-title">Secure your account</h2>
        <p className="auth-subtitle">
          Your account is active. Set a personal password now, or skip and use the temporary password from your email.
        </p>
      </div>

      {success && <div className="auth-alert auth-alert-success">{success}</div>}
      {serverError && <div className="auth-alert auth-alert-error">{serverError}</div>}

      <div className="space-y-2">
        <Label htmlFor="email" className="auth-label">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          disabled
          {...register('email')}
          className="auth-input bg-slate-100 text-slate-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword" className="auth-label">
          New password
        </Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="********"
          disabled={isSubmitting}
          className="auth-input"
          {...register('newPassword')}
        />

        <div className="flex flex-wrap gap-2 pt-1">
          {strengthChecks.map(({ label, test }) => {
            const passed = test(newPassword ?? '');
            return (
              <span
                key={label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  passed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {passed ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                {label}
              </span>
            );
          })}
        </div>

        {errors.newPassword && <p className="auth-error-text">{errors.newPassword.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="auth-label">
          Confirm password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="********"
          disabled={isSubmitting}
          className="auth-input"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && <p className="auth-error-text">{errors.confirmPassword.message}</p>}
      </div>

      <div className="space-y-3">
        <Button type="submit" className="auth-primary-button w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Setting password...
            </span>
          ) : (
            'Set password and continue to login'
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="auth-secondary-button w-full"
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip - I will use my temporary password
        </Button>
      </div>

      <div className="text-center">
        <Link href="/login" className="auth-link">
          Back to login
        </Link>
      </div>
    </form>
  );
}