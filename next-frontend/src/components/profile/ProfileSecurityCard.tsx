'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '@/lib/auth-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProfileSecurityCard() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

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
      await changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });
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
    <Card className="student-panel student-panel-hover overflow-hidden rounded-[1.5rem]">
      <div className="border-b border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-6 py-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--student-text-strong)]">
          <Lock className="h-4 w-4 text-[var(--student-accent)]" /> Security
        </h3>
      </div>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Current Password</Label>
          <Input
            type="password"
            className="student-input rounded-xl"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">New Password</Label>
          <Input
            type="password"
            className="student-input rounded-xl"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase text-[var(--student-text-muted)]">Confirm New Password</Label>
          <Input
            type="password"
            className="student-input rounded-xl"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleChangePassword}
          disabled={changingPw}
          className="student-button-outline mt-2 w-full rounded-xl font-bold transition-all"
        >
          {changingPw ? 'Processing...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
}
