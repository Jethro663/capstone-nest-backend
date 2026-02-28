/**
 * Reset Password Form — react‑hook‑form + zod + shadcn/ui
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas/auth';
import { resetPasswordAction } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    const e = searchParams.get('email');
    const c = searchParams.get('code');
    if (e) setValue('email', e);
    if (c) setValue('code', c);
  }, [searchParams, setValue]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setServerError('');
    const result = await resetPasswordAction({
      email: data.email,
      code: data.code,
      password: data.newPassword,
      confirmPassword: data.confirmPassword,
    });
    if (!result.success) {
      setServerError(result.message || 'Password reset failed');
      return;
    }
    setSuccess('Password reset successfully! Redirecting…');
    setTimeout(() => router.push('/login'), 2000);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter your reset code and new password</p>
      </div>

      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}
      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
      )}

      {/* Email (readonly) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" disabled {...register('email')} className="bg-slate-50 text-slate-500" />
      </div>

      {/* Code */}
      <div className="space-y-2">
        <Label htmlFor="code">Reset code</Label>
        <Input id="code" placeholder="Code from email" disabled={isSubmitting} {...register('code')} />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>

      {/* New password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" type="password" placeholder="••••••••" disabled={isSubmitting} {...register('newPassword')} />
        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
        <p className="text-xs text-muted-foreground">Must contain uppercase, lowercase, number, and special character</p>
      </div>

      {/* Confirm */}
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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
          </span>
        ) : (
          'Reset password'
        )}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </form>
  );
}
