'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { verifyEmailAction, resendOTPAction } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const OTP_LENGTH = 6;

export function EmailVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email] = useState(() => searchParams.get('email') ?? '');
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const flow = searchParams.get('flow'); // 'activation' = admin-created account
  const code = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const focusInput = (index: number) => {
    if (index < 0 || index >= OTP_LENGTH) return;
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const applyDigits = (rawValue: string, startIndex = 0) => {
    const cleaned = rawValue.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex);
    if (!cleaned) return;

    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < cleaned.length; i += 1) {
        next[startIndex + i] = cleaned[i] ?? '';
      }
      return next;
    });

    const targetIndex = Math.min(startIndex + cleaned.length, OTP_LENGTH - 1);
    focusInput(targetIndex);
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!value) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) return;

    if (cleaned.length > 1) {
      applyDigits(cleaned, index);
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });

    if (index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = '';
          return next;
        }
        const prevIndex = Math.max(0, index - 1);
        next[prevIndex] = '';
        focusInput(prevIndex);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    applyDigits(pasted, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || code.length !== OTP_LENGTH) {
      setError('Email and 6-digit code are required');
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
      setSuccess('Email verified! Setting up your account...');
      setTimeout(() => router.push(`/set-initial-password?email=${encodeURIComponent(email)}`), 1200);
    } else {
      setSuccess('Email verified! Redirecting to login...');
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
      setSuccess('Code resent. Check your inbox.');
      setDigits(Array(OTP_LENGTH).fill(''));
      setCooldown(60);
      focusInput(0);
    } else {
      setError(result.message || 'Failed to resend');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form space-y-6">
      <div>
        <h2 className="auth-title">Verify your email</h2>
        <p className="auth-subtitle">
          Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{email || 'your email'}</span>
        </p>
      </div>

      {success && <div className="auth-alert auth-alert-success">{success}</div>}
      {error && <div className="auth-alert auth-alert-error">{error}</div>}

      <div className="space-y-3">
        <Label htmlFor="otp-0" className="auth-label">
          Verification code
        </Label>
        <div className="auth-otp-grid" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={`otp-${index}`}
              id={`otp-${index}`}
              ref={(node) => {
                inputRefs.current[index] = node;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              disabled={loading}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="auth-otp-input"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <Button type="submit" className="auth-primary-button w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
          </span>
        ) : (
          'Verify email'
        )}
      </Button>

      <div className="space-y-3 border-t border-slate-200/70 pt-4">
        <p className="text-sm text-slate-500">Did not receive the code?</p>
        <Button
          type="button"
          variant="outline"
          className="auth-secondary-button w-full"
          disabled={cooldown > 0 || resending || !email}
          onClick={handleResend}
        >
          {resending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Sending...
            </span>
          ) : cooldown > 0 ? (
            `Resend in ${cooldown}s`
          ) : (
            'Resend code'
          )}
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