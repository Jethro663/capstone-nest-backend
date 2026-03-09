'use client';

import type { ReactNode } from 'react';
import { Mail, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfilePageFrameProps {
  email?: string;
  roleLabel: string;
  title: string;
  subtitle: string;
  initials: string;
  avatarSrc?: string;
  heroAction?: ReactNode;
  left: ReactNode;
  right: ReactNode;
}

export function ProfilePageFrame({
  email,
  roleLabel,
  title,
  subtitle,
  initials,
  avatarSrc,
  heroAction,
  left,
  right,
}: ProfilePageFrameProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 md:p-10">
      <section className="relative overflow-hidden rounded-[1.5rem] border-[1.5px] border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-full bg-red-500/5 -skew-x-12 translate-x-8" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500">
              <Sparkles className="h-3 w-3" /> Account Settings
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-slate-500 text-sm font-medium">
              {email ? (
                <>
                  <Mail className="h-3.5 w-3.5" /> {email}
                  <span className="text-slate-200">|</span>
                </>
              ) : null}
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                {roleLabel}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 max-w-xl">{subtitle}</p>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-[1.5rem] border border-red-100 shadow-lg shadow-red-100">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={title} /> : null}
              <AvatarFallback className="rounded-[1.5rem] bg-red-500 text-white text-xl font-black">
                {initials}
              </AvatarFallback>
            </Avatar>
            {heroAction}
          </div>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-8 space-y-6">{left}</div>
        <div className="md:col-span-4 space-y-6">
          {right}
          <div className="bg-red-50 border-[1.5px] border-red-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <Users className="h-5 w-5" />
              <p className="font-black text-xs uppercase tracking-widest">Privacy Note</p>
            </div>
            <p className="text-xs text-red-700/80 leading-relaxed font-medium">
              Your profile information is visible to administrators and relevant staff to support your school records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
