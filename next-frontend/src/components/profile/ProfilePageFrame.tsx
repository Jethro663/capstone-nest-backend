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
      <section className="student-panel relative overflow-hidden rounded-[1.5rem] p-6">
        <div className="absolute top-0 right-0 h-full w-32 -skew-x-12 translate-x-8 bg-[var(--student-hero-stripe)]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="student-kicker inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="h-3 w-3" /> Account Settings
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--student-text-strong)]">{title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--student-text-muted)]">
              {email ? (
                <>
                  <Mail className="h-3.5 w-3.5" /> {email}
                  <span className="text-[var(--student-outline-strong)]">|</span>
                </>
              ) : null}
              <Badge variant="secondary" className="border border-[var(--student-outline)] bg-[var(--student-surface-soft)] font-bold uppercase text-[9px] text-[var(--student-text-muted)]">
                {roleLabel}
              </Badge>
            </div>
            <p className="max-w-xl text-sm text-[var(--student-text-muted)]">{subtitle}</p>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-[1.5rem] border border-[var(--student-outline)] shadow-lg shadow-black/5">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={title} /> : null}
              <AvatarFallback className="rounded-[1.5rem] bg-[var(--student-accent)] text-[var(--student-accent-contrast)] text-xl font-black">
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
          <div className="student-note-danger rounded-2xl p-6">
            <div className="mb-2 flex items-center gap-2 text-[var(--student-accent)]">
              <Users className="h-5 w-5" />
              <p className="font-black text-xs uppercase tracking-widest">Privacy Note</p>
            </div>
            <p className="text-xs font-medium leading-relaxed">
              Your profile information is visible to administrators and relevant staff to support your school records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
