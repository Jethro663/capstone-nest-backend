/**
 * Email Verification Form
 *
 * Handles both standard OTP verification and first‑time account activation.
 * On first‑time accounts (admin‑created), this page verifies the OTP and
 * then the user is redirected to /set-initial-password to set their password.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { verifyEmailAction, resendOTPAction } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EmailVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const flow = searchParams.get('flow'); // 'activation' = admin-created account

  useEffect(() => {
    const e = searchParams.get('email');
    if (e) setEmail(e);
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email || !code) {
      setError('Email and code are required');
      return;
    }
    setLoading(true);

    const result = await verifyEmailAction({ email, code });
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Verification failed');
      return;
    }

    if (flow === 'activation') {
      setSuccess('Email verified! Setting up your account…');
      setTimeout(
        () => router.push(`/set-initial-password?email=${encodeURIComponent(email)}`),
        1200,
      );
    } else {
      setSuccess('Email verified! Redirecting to login…');
      setTimeout(() => router.push('/login'), 2000);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    setError('');
    const result = await resendOTPAction(email);
    setResending(false);
    if (result.success) {
      setSuccess('Code resent — check your inbox.');
      setCooldown(60);
    } else {
      setError(result.message || 'Failed to resend');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Verify your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6‑digit code sent to{' '}
          <span className="font-medium">{email || 'your email'}</span>
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={loading}
          maxLength={6}
          className="text-center text-2xl font-bold tracking-[0.5em]"
          placeholder="000000"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </span>
        ) : (
          'Verify email'
        )}
      </Button>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm text-muted-foreground">Didn&apos;t receive the code?</p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={cooldown > 0 || resending || !email}
          onClick={handleResend}
        >
          {resending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
            </span>
          ) : cooldown > 0 ? (
            `Resend in ${cooldown}s`
          ) : (
            'Resend code'
          )}
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
