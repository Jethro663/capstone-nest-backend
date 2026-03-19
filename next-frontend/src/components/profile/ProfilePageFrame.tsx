'use client';

import type { ReactNode } from 'react';
import { Mail, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';

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
  appearance?: 'student' | 'teacher' | 'admin';
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
  appearance = 'student',
}: ProfilePageFrameProps) {
  const isTeacher = appearance === 'teacher';
  const isAdmin = appearance === 'admin';
  const accentText = isTeacher
    ? 'text-[var(--teacher-text-strong)]'
    : isAdmin
      ? 'text-[var(--admin-text-strong)]'
      : 'text-[var(--student-text-strong)]';
  const mutedText = isTeacher
    ? 'text-[var(--teacher-text-muted)]'
    : isAdmin
      ? 'text-[var(--admin-text-muted)]'
      : 'text-[var(--student-text-muted)]';

  return (
    <div className={cn('mx-auto max-w-4xl space-y-8 p-6 md:p-10', isTeacher && 'teacher-page', isAdmin && 'admin-page')}>
      <section className={cn('relative overflow-hidden rounded-[1.5rem] p-6', isTeacher ? 'teacher-panel' : isAdmin ? 'admin-panel' : 'student-panel')}>
        <div className={cn('absolute top-0 right-0 h-full w-32 -skew-x-12 translate-x-8', isTeacher ? 'bg-sky-300/15' : isAdmin ? 'bg-emerald-300/15' : 'bg-[var(--student-hero-stripe)]')} />
        {isTeacher || isAdmin ? (
          <>
            <div className={cn('absolute inset-0 opacity-90', isTeacher ? 'teacher-highlight' : 'admin-highlight')} />
            <div className={cn('absolute -left-10 top-0 h-36 w-36 rounded-full blur-3xl', isTeacher ? 'bg-sky-300/20' : 'bg-emerald-300/20')} />
            <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
          </>
        ) : null}

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest', isTeacher ? 'teacher-kicker' : isAdmin ? 'admin-kicker' : 'student-kicker')}>
              <Sparkles className="h-3 w-3" /> Account Settings
            </div>
            <h1 className={cn('text-3xl font-black tracking-tight', accentText)}>{title}</h1>
            <div className={cn('flex flex-wrap items-center gap-2 text-sm font-medium', mutedText)}>
              {email ? (
                <>
                  <Mail className="h-3.5 w-3.5" /> {email}
                  <span>|</span>
                </>
              ) : null}
              <Badge
                variant="secondary"
                className={cn(
                  'font-bold uppercase text-[9px]',
                  isTeacher
                    ? 'border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-[var(--teacher-text-muted)]'
                    : isAdmin
                      ? 'border border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] text-[var(--admin-text-muted)]'
                      : 'border border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]',
                )}
              >
                {roleLabel}
              </Badge>
            </div>
            <p className={cn('max-w-xl text-sm', mutedText)}>{subtitle}</p>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className={cn('h-20 w-20 rounded-[1.5rem] shadow-lg shadow-black/5', isTeacher ? 'border border-[var(--teacher-outline)]' : isAdmin ? 'border border-[var(--admin-outline)]' : 'border border-[var(--student-outline)]')}>
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={title} /> : null}
              <AvatarFallback className={cn('rounded-[1.5rem] text-xl font-black', isTeacher ? 'bg-[var(--teacher-accent)] text-white' : isAdmin ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--student-accent)] text-[var(--student-accent-contrast)]')}>
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
          <div className={cn('rounded-2xl p-6', isTeacher ? 'teacher-soft-panel' : isAdmin ? 'admin-soft-panel' : 'student-note-danger')}>
            <div className={cn('mb-2 flex items-center gap-2', isTeacher ? 'text-[var(--teacher-accent)]' : isAdmin ? 'text-[var(--admin-accent)]' : 'text-[var(--student-accent)]')}>
              <Users className="h-5 w-5" />
              <p className="font-black text-xs uppercase tracking-widest">Privacy Note</p>
            </div>
            <p className={cn('text-xs font-medium leading-relaxed', mutedText)}>
              Your profile information is visible to administrators and relevant staff to support your school records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
