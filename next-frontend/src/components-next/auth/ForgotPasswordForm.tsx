/**
 * Forgot Password Form Component
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as authService from '@/lib/auth-service';
import { Loader2 } from 'lucide-react';

interface FormErrors {
  email?: string;
  general?: string;
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (!email) {
        setErrors({ email: 'Email is required' });
        setLoading(false);
        return;
      }

      const response = await authService.forgotPassword(email);

      if (!response.success) {
        setErrors({
          general: response.message || 'Failed to send reset email',
        });
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 3000);
    } catch (error: any) {
      setErrors({
        general: error.message || 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a password reset link to <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Check your email and follow the link to reset your password. You will be redirected shortly...
        </div>

        <div className="text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reset password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errors.general}
        </div>
      )}

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-900">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className={`mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
            errors.email
              ? 'border-destructive bg-destructive/5'
              : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email}</p>
        )}
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
            Sending...
          </span>
        ) : (
          'Send reset link'
        )}
      </button>

      {/* Login Link */}
      <div className="text-center">
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </form>
  );
}
