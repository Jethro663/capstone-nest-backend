/**
 * Complete Profile Form
 *
 * Shown when a user logs in but their profile is incomplete
 * (no firstName or lastName set yet).
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { completeProfileSchema, type CompleteProfileFormValues } from '@/schemas/profile';
import { updateProfileAction } from '@/lib/auth-actions';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GRADE_LEVELS } from '@/utils/constants';

export function CompleteProfileForm() {
  const router = useRouter();
  const { user, setUser, role } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileFormValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: '',
    },
  });

  const onSubmit = async (data: CompleteProfileFormValues) => {
    setServerError('');
    const result = await updateProfileAction(data);
    if (!result.success) {
      setServerError(result.message || 'Failed to update profile');
      return;
    }
    // Update context
    if (result.user) setUser(result.user);
    router.push('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Complete your profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Please fill in your details to continue
        </p>
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" disabled={isSubmitting} {...register('firstName')} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" disabled={isSubmitting} {...register('lastName')} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" placeholder="+639XXXXXXXXX" disabled={isSubmitting} {...register('phone')} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      {role === 'student' && (
        <div className="space-y-2">
          <Label htmlFor="gradeLevel">Grade level</Label>
          <Select onValueChange={(v) => setValue('gradeLevel', v)} disabled={isSubmitting}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade level" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((g) => (
                <SelectItem key={g} value={g}>
                  Grade {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.gradeLevel && <p className="text-xs text-destructive">{errors.gradeLevel.message}</p>}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        ) : (
          'Save & continue'
        )}
      </Button>
    </form>
  );
}
