/**
 * Email Verification Form Component
 * 
 * Client component for verifying email with OTP
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmailAction, resendOTPAction } from '@/lib/auth-actions';
import { Loader2 } from 'lucide-react';

interface FormErrors {
  email?: string;
  code?: string;
  general?: string;
}

export function EmailVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // Get email from search params on mount
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');
    setLoading(true);

    try {
      if (!email) {
        setErrors({ email: 'Email is required' });
        setLoading(false);
        return;
      }

      if (!code) {
        setErrors({ code: 'Verification code is required' });
        setLoading(false);
        return;
      }

      const result = await verifyEmailAction({ email, code });

      if (!result.success) {
        setErrors({
          general: result.message || 'Verification failed. Please try again.',
        });
        return;
      }

      setSuccessMessage('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      setErrors({
        general: error.message || 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    setResending(true);
    setSuccessMessage('');

    try {
      const result = await resendOTPAction(email);

      if (!result.success) {
        setErrors({
          general: result.message || 'Failed to resend OTP',
        });
      } else {
        setSuccessMessage('OTP sent to your email. Check your inbox.');
        setResendCooldown(60);
      }
    } catch (error: any) {
      setErrors({
        general: error.message || 'Failed to resend OTP',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Verify your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a verification code to <span className="font-medium">{email}</span>
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* General Error */}
      {errors.general && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errors.general}
        </div>
      )}

      {/* Code Field */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-900">
          Verification code
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={loading}
          maxLength={6}
          className={`mt-2 w-full rounded-md border px-3 py-2 text-center text-2xl font-bold letter-spacing outline-none transition ${
            errors.code
              ? 'border-destructive bg-destructive/5'
              : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          placeholder="000000"
        />
        {errors.code && (
          <p className="mt-1 text-xs text-destructive">{errors.code}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Enter the 6-digit code from your email
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </span>
        ) : (
          'Verify email'
        )}
      </button>

      {/* Resend Section */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending || !email}
          className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </span>
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            'Resend code'
          )}
        </button>
      </div>

      {/* Change Email Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Wrong email?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up again
          </Link>
        </p>
      </div>
    </form>
  );
}
