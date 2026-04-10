'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { loginSchema, type LoginFormValues } from '@/schemas/auth';
import { loginAction, validateCredentialsAction } from '@/lib/auth-actions';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, isAuthenticated, loading: authLoading } = useAuth();
  const [serverError, setServerError] = useState('');

  // If already authenticated (e.g. page reload with valid cookie), skip login.
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(searchParams.get('from') || '/dashboard');
    }
  }, [authLoading, isAuthenticated, router, searchParams]);

  // Show success toast when redirected here after account activation.
  useEffect(() => {
    if (searchParams.get('activated') === 'true') {
      toast.success('Account activated! Log in with your temporary password.');
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError('');

    const result = await loginAction(data);

    if (!result.success) {
      const msg = result.message ?? '';
      if (msg.toLowerCase().includes('not verified')) {
        const validation = await validateCredentialsAction({
          email: data.email,
          password: data.password,
        });

        if (validation.success) {
          router.push(`/verify-email?flow=activation&email=${encodeURIComponent(data.email)}`);
        } else {
          setServerError('Invalid email or password');
        }
        return;
      }
      setServerError(msg || 'Login failed. Please try again.');
      return;
    }

    if (result.user) setUser(result.user);

    const from = searchParams.get('from') || '/dashboard';
    router.push(from);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form space-y-6">
      <div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your Nexora account</p>
      </div>

      {serverError && <div className="auth-alert auth-alert-error">{serverError}</div>}

      <div className="space-y-2">
        <Label htmlFor="email" className="auth-label">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="username"
          disabled={isSubmitting}
          className="auth-input"
          {...register('email')}
        />
        {errors.email && <p className="auth-error-text">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="auth-label">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          autoComplete="current-password"
          disabled={isSubmitting}
          className="auth-input"
          {...register('password')}
        />
        {errors.password && <p className="auth-error-text">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="auth-primary-button w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
