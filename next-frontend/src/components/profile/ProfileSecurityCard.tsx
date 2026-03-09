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
    <Card className="border-[1.5px] border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm hover:border-red-200 transition-colors">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-500" /> Security
        </h3>
      </div>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase text-slate-400">Current Password</Label>
          <Input
            type="password"
            className="rounded-xl border-slate-200 focus-visible:ring-red-500"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase text-slate-400">New Password</Label>
          <Input
            type="password"
            className="rounded-xl border-slate-200 focus-visible:ring-red-500"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase text-slate-400">Confirm New Password</Label>
          <Input
            type="password"
            className="rounded-xl border-slate-200 focus-visible:ring-red-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleChangePassword}
          disabled={changingPw}
          className="w-full border-slate-200 font-bold hover:border-red-500 hover:text-red-500 transition-all rounded-xl mt-2"
        >
          {changingPw ? 'Processing...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
}
