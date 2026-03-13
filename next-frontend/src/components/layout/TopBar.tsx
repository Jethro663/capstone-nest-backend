/**
 * TopBar - welcome text, notifications, messages, profile
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, MessageSquare, Menu } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StudentThemeSwitcher } from '@/components/layout/StudentThemeSwitcher';
import { getProfileRoute } from '@/utils/profile';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role } = useAuth();
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email ?? 'User';
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const avatarSrc =
    user?.profile?.profilePicture ??
    user?.teacherProfile?.profilePicture ??
    user?.profilePicture;
  const profileHref = getProfileRoute(role);

  return (
    <header className={`flex h-16 items-center justify-between border-b px-4 ${isStudentRoute ? 'student-topbar' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className={`hidden text-sm sm:block ${isStudentRoute ? 'text-[var(--student-text-muted)]' : 'text-muted-foreground'}`}>
          Welcome, <span className={`font-medium ${isStudentRoute ? 'text-[var(--student-text-strong)]' : 'text-slate-900'}`}>{displayName}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        {isStudentRoute ? <StudentThemeSwitcher/> : null}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/messages')}
          title="Messages"
          className={isStudentRoute ? 'text-[var(--student-text-muted)] hover:bg-[var(--student-accent-soft)] hover:text-[var(--student-accent)]' : undefined}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/notifications')}
          title="Notifications"
          className={isStudentRoute ? 'text-[var(--student-text-muted)] hover:bg-[var(--student-accent-soft)] hover:text-[var(--student-accent)]' : undefined}
        >
          <Bell className="h-5 w-5" />
        </Button>

        <div className={`mx-2 h-6 w-px ${isStudentRoute ? 'student-divider' : 'bg-slate-200'}`} />

        <button
          onClick={() => router.push(profileHref)}
          className={`flex items-center gap-2 rounded-xl px-2 py-1 transition-colors ${isStudentRoute ? 'hover:bg-[var(--student-accent-soft)]' : 'hover:bg-slate-100'}`}
        >
          <Avatar className="h-8 w-8">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
            <AvatarFallback className={`text-xs font-medium ${isStudentRoute ? 'bg-[var(--student-accent-soft)] text-[var(--student-accent)]' : 'bg-primary/10 text-primary'}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className={`hidden text-sm font-medium md:block ${isStudentRoute ? 'text-[var(--student-text-strong)]' : 'text-slate-700'}`}>Profile</span>
        </button>
      </div>
    </header>
  );
}
