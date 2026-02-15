/**
 * Reset Password Form Component
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordAction } from '@/lib/auth-actions';
import { Loader2 } from 'lucide-react';

interface FormErrors {
  email?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    if (emailParam) setEmail(emailParam);
    if (codeParam) setCode(codeParam);
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email) newErrors.email = 'Email is required';
    if (!code) newErrors.code = 'Reset code is required';
    if (!password) newErrors.password = 'Password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Password confirmation is required';

    if (password && password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await resetPasswordAction({
        email,
        code,
        password,
        confirmPassword,
      });

      if (!result.success) {
        setErrors({
          general: result.message || 'Password reset failed. Please try again.',
        });
        return;
      }

      setSuccessMessage('Password reset successfully! Redirecting to login...');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your new password below
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

      {/* Email Field (readonly) */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed"
        />
      </div>

      {/* Reset Code Field */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-900">
          Reset code
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
          className={`mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
            errors.code
              ? 'border-destructive bg-destructive/5'
              : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          placeholder="Reset code from email"
        />
        {errors.code && (
          <p className="mt-1 text-xs text-destructive">{errors.code}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-900">
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className={`mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
            errors.password
              ? 'border-destructive bg-destructive/5'
              : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          At least 8 characters
        </p>
      </div>

      {/* Confirm Password Field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-900">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          className={`mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
            errors.confirmPassword
              ? 'border-destructive bg-destructive/5'
              : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>
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
            Resetting...
          </span>
        ) : (
          'Reset password'
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
