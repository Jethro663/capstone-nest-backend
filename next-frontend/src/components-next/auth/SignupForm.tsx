/**
 * Signup Form Component
 * 
 * Client component for user registration
 * Submits to registerAction Server Action
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerAction } from '@/lib/auth-actions';
import { Loader2 } from 'lucide-react';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  general?: string;
}

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email) newErrors.email = 'Email is required';
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
      const result = await registerAction({
        email,
        password,
        confirmPassword,
        role,
      });

      if (!result.success) {
        setErrors({
          general: result.message || 'Registration failed. Please try again.',
        });
        return;
      }

      // Success - redirect to email verification
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
        <h2 className="text-2xl font-bold text-slate-900">Create account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Join Nexora to start learning
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

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-900">
          Password
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

      {/* Role Selection */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-slate-900">
          I am a
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}
          disabled={loading}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none hover:border-slate-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
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
            Creating account...
          </span>
        ) : (
          'Sign up'
        )}
      </button>

      {/* Login Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
