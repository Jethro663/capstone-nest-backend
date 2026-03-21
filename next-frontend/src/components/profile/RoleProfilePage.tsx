'use client';

import { BriefcaseBusiness, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfilePageFrame } from '@/components/profile/ProfilePageFrame';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import { cn } from '@/utils/cn';

interface RoleProfilePageProps {
  roleLabel: 'Teacher' | 'Admin';
  title: string;
  subtitle: string;
  appearance?: 'default' | 'teacher' | 'admin';
}

export function RoleProfilePage({
  roleLabel,
  title,
  subtitle,
  appearance = 'default',
}: RoleProfilePageProps) {
  const { user } = useAuth();
  const initials = user?.firstName ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase() : roleLabel[0];
  const isTeacher = appearance === 'teacher';
  const isAdmin = appearance === 'admin';
  const frameAppearance = isTeacher ? 'teacher' : isAdmin ? 'admin' : 'student';

  return (
    <ProfilePageFrame
      email={user?.email}
      roleLabel={roleLabel}
      title={title}
      subtitle={subtitle}
      initials={initials}
      appearance={frameAppearance}
      left={
        <div className="space-y-6">
          {isTeacher || isAdmin ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className={cn('rounded-[1.35rem] px-4 py-4', isTeacher ? 'teacher-soft-panel teacher-panel-hover' : 'admin-soft-panel admin-surface-card')}>
                <div className={cn('mb-3 flex items-center gap-2', isTeacher ? 'text-[var(--teacher-accent)]' : 'text-[var(--admin-accent)]')}>
                  <BriefcaseBusiness className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.24em]">Role</span>
                </div>
                <p className={cn('text-xl font-black', isTeacher ? 'text-[var(--teacher-text-strong)]' : 'text-[var(--admin-text-strong)]')}>{roleLabel}</p>
                <p className={cn('mt-1 text-xs', isTeacher ? 'text-[var(--teacher-text-muted)]' : 'text-[var(--admin-text-muted)]')}>
                  {isTeacher ? 'Teacher-side identity snapshot' : 'Admin-side identity snapshot'}
                </p>
              </div>
              <div className={cn('rounded-[1.35rem] px-4 py-4', isTeacher ? 'teacher-soft-panel teacher-panel-hover' : 'admin-soft-panel admin-surface-card')}>
                <div className={cn('mb-3 flex items-center gap-2', isTeacher ? 'text-[var(--teacher-accent)]' : 'text-[var(--admin-accent)]')}>
                  <Mail className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.24em]">Contact</span>
                </div>
                <p className={cn('truncate text-base font-black', isTeacher ? 'text-[var(--teacher-text-strong)]' : 'text-[var(--admin-text-strong)]')}>{user?.email ?? '--'}</p>
                <p className={cn('mt-1 text-xs', isTeacher ? 'text-[var(--teacher-text-muted)]' : 'text-[var(--admin-text-muted)]')}>Primary account email</p>
              </div>
              <div className={cn('rounded-[1.35rem] px-4 py-4', isTeacher ? 'teacher-soft-panel teacher-panel-hover' : 'admin-soft-panel admin-surface-card')}>
                <div className={cn('mb-3 flex items-center gap-2', isTeacher ? 'text-[var(--teacher-accent)]' : 'text-[var(--admin-accent)]')}>
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.24em]">Status</span>
                </div>
                <p className={cn('text-xl font-black', isTeacher ? 'text-[var(--teacher-text-strong)]' : 'text-[var(--admin-text-strong)]')}>Secure</p>
                <p className={cn('mt-1 text-xs', isTeacher ? 'text-[var(--teacher-text-muted)]' : 'text-[var(--admin-text-muted)]')}>
                  Profile is visible, password remains editable
                </p>
              </div>
            </div>
          ) : null}

          <Card className={cn('overflow-hidden rounded-[1.5rem] border-[1.5px] shadow-sm transition-colors', isTeacher ? 'teacher-panel border-[var(--teacher-outline)]' : isAdmin ? 'admin-panel border-white/30' : 'student-panel border-[var(--student-outline)]')}>
            <div className={cn('border-b px-6 py-4', isTeacher ? 'border-[var(--teacher-outline)] bg-white/6' : isAdmin ? 'border-[var(--admin-outline)] bg-white/35' : 'border-[var(--student-outline)] bg-[var(--student-surface-soft)]/80')}>
              <h3 className={cn('flex items-center gap-2 text-sm font-black uppercase tracking-widest', isTeacher ? 'text-[var(--teacher-text-strong)]' : isAdmin ? 'text-[var(--admin-text-strong)]' : 'text-slate-900')}>
                <ShieldCheck className={cn('h-4 w-4', isTeacher ? 'text-[var(--teacher-accent)]' : isAdmin ? 'text-[var(--admin-accent)]' : 'text-red-500')} /> Account Information
              </h3>
            </div>
            <CardContent className="space-y-6 p-6">
              <div className={cn('rounded-2xl px-4 py-3 text-sm', isTeacher ? 'teacher-soft-panel text-[var(--teacher-text-muted)]' : isAdmin ? 'admin-soft-panel text-[var(--admin-text-muted)]' : 'border border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]')}>
                {subtitle}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  ['First Name', user?.firstName ?? ''],
                  ['Middle Name', user?.middleName ?? ''],
                  ['Last Name', user?.lastName ?? ''],
                ].map(([label, value]) => (
                  <div key={label} className="space-y-1.5">
                    <Label className={cn('text-[10px] font-black uppercase', isTeacher ? 'text-[var(--teacher-text-muted)]' : isAdmin ? 'text-[var(--admin-text-muted)]' : 'text-[var(--student-text-muted)]')}>{label}</Label>
                    <Input className={cn('rounded-xl', isTeacher ? 'teacher-input' : isAdmin ? 'admin-input' : 'student-input')} value={value} disabled />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className={cn('text-[10px] font-black uppercase', isTeacher ? 'text-[var(--teacher-text-muted)]' : isAdmin ? 'text-[var(--admin-text-muted)]' : 'text-[var(--student-text-muted)]')}>Email Address</Label>
                <Input className={cn('rounded-xl', isTeacher ? 'teacher-input' : isAdmin ? 'admin-input' : 'student-input')} value={user?.email ?? ''} disabled />
              </div>
            </CardContent>
          </Card>
        </div>
      }
      right={<ProfileSecurityCard appearance={frameAppearance} />}
    />
  );
}
