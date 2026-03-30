'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '@/lib/auth-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

export function ProfileSecurityCard({
  appearance = 'student',
  layout = 'default',
}: {
  appearance?: 'student' | 'teacher' | 'admin';
  layout?: 'default' | 'teacher-parity';
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const isTeacher = appearance === 'teacher';
  const isAdmin = appearance === 'admin';
  const isTeacherParity = isTeacher && layout === 'teacher-parity';

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setChangingPw(true);
      await changePassword({ oldPassword, newPassword, confirmPassword });
      toast.success('Password changed');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[1.5rem]',
        isTeacherParity
          ? 'rounded-[1.65rem] border border-[#d7deea] bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.38)]'
          : isTeacher
            ? 'teacher-panel teacher-panel-hover'
            : isAdmin
              ? 'admin-panel'
              : 'student-panel student-panel-hover',
      )}
    >
      <div
        className={cn(
          'border-b px-6 py-4',
          isTeacherParity
            ? 'border-[#e1e7f0] bg-white'
            : isTeacher
              ? 'border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)]'
              : isAdmin
                ? 'border-[var(--admin-outline)] bg-[var(--admin-surface-soft)]'
                : 'border-[var(--student-outline)] bg-[var(--student-surface-soft)]',
        )}
      >
        <h3
          className={cn(
            'flex items-center gap-2',
            isTeacherParity
              ? 'text-[2.03rem] font-semibold tracking-tight text-[#0d2345]'
              : isTeacher
                ? 'text-sm font-black uppercase tracking-widest text-[var(--teacher-text-strong)]'
                : isAdmin
                  ? 'text-sm font-black uppercase tracking-widest text-[var(--admin-text-strong)]'
                  : 'text-sm font-black uppercase tracking-widest text-[var(--student-text-strong)]',
          )}
        >
          <Lock
            className={cn(
              isTeacherParity
                ? 'h-6 w-6 text-[#ef0018]'
                : 'h-4 w-4',
              isTeacher && !isTeacherParity
                ? 'text-[var(--teacher-accent)]'
                : isAdmin
                  ? 'text-[var(--admin-accent)]'
                  : !isTeacherParity
                    ? 'text-[var(--student-accent)]'
                    : undefined,
            )}
          />
          {isTeacherParity ? 'Password & Security' : 'Security'}
        </h3>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label
            className={cn(
              isTeacherParity
                ? 'text-[1.02rem] font-medium text-[#2d4c77]'
                : 'text-[10px] font-black uppercase',
              isTeacher && !isTeacherParity
                ? 'text-[var(--teacher-text-muted)]'
                : isAdmin
                  ? 'text-[var(--admin-text-muted)]'
                  : !isTeacherParity
                    ? 'text-[var(--student-text-muted)]'
                    : undefined,
            )}
          >
            Current Password
          </Label>
          <Input
            type="password"
            className={cn(
              isTeacherParity
                ? 'h-[46px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[1.02rem] text-[#0f2748]'
                : 'rounded-xl',
              isTeacher && !isTeacherParity
                ? 'teacher-input'
                : isAdmin
                  ? 'admin-input'
                  : !isTeacherParity
                    ? 'student-input'
                    : undefined,
            )}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            className={cn(
              isTeacherParity
                ? 'text-[1.02rem] font-medium text-[#2d4c77]'
                : 'text-[10px] font-black uppercase',
              isTeacher && !isTeacherParity
                ? 'text-[var(--teacher-text-muted)]'
                : isAdmin
                  ? 'text-[var(--admin-text-muted)]'
                  : !isTeacherParity
                    ? 'text-[var(--student-text-muted)]'
                    : undefined,
            )}
          >
            New Password
          </Label>
          <Input
            type="password"
            className={cn(
              isTeacherParity
                ? 'h-[46px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[1.02rem] text-[#0f2748]'
                : 'rounded-xl',
              isTeacher && !isTeacherParity
                ? 'teacher-input'
                : isAdmin
                  ? 'admin-input'
                  : !isTeacherParity
                    ? 'student-input'
                    : undefined,
            )}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            className={cn(
              isTeacherParity
                ? 'text-[1.02rem] font-medium text-[#2d4c77]'
                : 'text-[10px] font-black uppercase',
              isTeacher && !isTeacherParity
                ? 'text-[var(--teacher-text-muted)]'
                : isAdmin
                  ? 'text-[var(--admin-text-muted)]'
                  : !isTeacherParity
                    ? 'text-[var(--student-text-muted)]'
                    : undefined,
            )}
          >
            Confirm New Password
          </Label>
          <Input
            type="password"
            className={cn(
              isTeacherParity
                ? 'h-[46px] rounded-full border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[1.02rem] text-[#0f2748]'
                : 'rounded-xl',
              isTeacher && !isTeacherParity
                ? 'teacher-input'
                : isAdmin
                  ? 'admin-input'
                  : !isTeacherParity
                    ? 'student-input'
                    : undefined,
            )}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={changingPw}
          className={cn(
            isTeacherParity
              ? 'mt-1 inline-flex h-[46px] min-w-[204px] rounded-full bg-[#ef0018] px-7 text-[1.04rem] font-semibold text-white hover:bg-[#da0016]'
              : 'mt-2 w-full rounded-xl font-bold transition-all',
            isTeacher && !isTeacherParity
              ? 'teacher-button-outline'
              : isAdmin
                ? 'admin-button-outline'
                : !isTeacherParity
                  ? 'student-button-outline'
                  : undefined,
          )}
          variant={isTeacherParity ? 'default' : 'outline'}
        >
          {changingPw ? 'Processing...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
}
