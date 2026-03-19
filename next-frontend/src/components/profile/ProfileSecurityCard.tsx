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
}: {
  appearance?: 'student' | 'teacher' | 'admin';
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const isTeacher = appearance === 'teacher';
  const isAdmin = appearance === 'admin';

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
    <Card className={cn('overflow-hidden rounded-[1.5rem]', isTeacher ? 'teacher-panel teacher-panel-hover' : isAdmin ? 'admin-panel' : 'student-panel student-panel-hover')}>
      <div className={cn('border-b px-6 py-4', isTeacher ? 'border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)]' : isAdmin ? 'border-[var(--admin-outline)] bg-[var(--admin-surface-soft)]' : 'border-[var(--student-outline)] bg-[var(--student-surface-soft)]')}>
        <h3 className={cn('flex items-center gap-2 text-sm font-black uppercase tracking-widest', isTeacher ? 'text-[var(--teacher-text-strong)]' : isAdmin ? 'text-[var(--admin-text-strong)]' : 'text-[var(--student-text-strong)]')}>
          <Lock className={cn('h-4 w-4', isTeacher ? 'text-[var(--teacher-accent)]' : isAdmin ? 'text-[var(--admin-accent)]' : 'text-[var(--student-accent)]')} /> Security
        </h3>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label className={cn('text-[10px] font-black uppercase', isTeacher ? 'text-[var(--teacher-text-muted)]' : isAdmin ? 'text-[var(--admin-text-muted)]' : 'text-[var(--student-text-muted)]')}>Current Password</Label>
          <Input type="password" className={cn('rounded-xl', isTeacher ? 'teacher-input' : isAdmin ? 'admin-input' : 'student-input')} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className={cn('text-[10px] font-black uppercase', isTeacher ? 'text-[var(--teacher-text-muted)]' : isAdmin ? 'text-[var(--admin-text-muted)]' : 'text-[var(--student-text-muted)]')}>New Password</Label>
          <Input type="password" className={cn('rounded-xl', isTeacher ? 'teacher-input' : isAdmin ? 'admin-input' : 'student-input')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className={cn('text-[10px] font-black uppercase', isTeacher ? 'text-[var(--teacher-text-muted)]' : isAdmin ? 'text-[var(--admin-text-muted)]' : 'text-[var(--student-text-muted)]')}>Confirm New Password</Label>
          <Input type="password" className={cn('rounded-xl', isTeacher ? 'teacher-input' : isAdmin ? 'admin-input' : 'student-input')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={changingPw}
          className={cn(
            'mt-2 w-full rounded-xl font-bold transition-all',
            isTeacher ? 'teacher-button-outline' : isAdmin ? 'admin-button-outline' : 'student-button-outline',
          )}
          variant="outline"
        >
          {changingPw ? 'Processing...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
}
