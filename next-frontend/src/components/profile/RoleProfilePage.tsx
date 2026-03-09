'use client';

import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfilePageFrame } from '@/components/profile/ProfilePageFrame';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';

interface RoleProfilePageProps {
  roleLabel: 'Teacher' | 'Admin';
  title: string;
  subtitle: string;
}

export function RoleProfilePage({
  roleLabel,
  title,
  subtitle,
}: RoleProfilePageProps) {
  const { user } = useAuth();
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : roleLabel[0];

  return (
    <ProfilePageFrame
      email={user?.email}
      roleLabel={roleLabel}
      title={title}
      subtitle={subtitle}
      initials={initials}
      left={
        <Card className="border-[1.5px] border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm hover:border-red-200 transition-colors">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-500" /> Account Information
            </h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {subtitle}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">First Name</Label>
                <Input className="rounded-xl border-slate-200" value={user?.firstName ?? ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">Middle Name</Label>
                <Input className="rounded-xl border-slate-200" value={user?.middleName ?? ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">Last Name</Label>
                <Input className="rounded-xl border-slate-200" value={user?.lastName ?? ''} disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400">Email Address</Label>
              <Input className="rounded-xl border-slate-200" value={user?.email ?? ''} disabled />
            </div>
          </CardContent>
        </Card>
      }
      right={<ProfileSecurityCard />}
    />
  );
}
