/**
 * Forgot Password Form
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas/auth';
import { forgotPasswordAction } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setServerError('');
    const result = await forgotPasswordAction(data.email);
    if (!result.success) {
      setServerError(result.message || 'Failed to send reset email');
      return;
    }
    setSentEmail(data.email);
    setSent(true);
    setTimeout(() => {
      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
    }, 3000);
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a reset code to <span className="font-medium">{sentEmail}</span>
          </p>
        </div>
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Check your email for the reset code. You will be redirected shortly…
        </div>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reset password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a code to reset your password
        </p>
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          disabled={isSubmitting}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </span>
        ) : (
          'Send reset code'
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
