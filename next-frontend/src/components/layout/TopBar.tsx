/**
 * TopBar - welcome text, notifications, messages, profile
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfileRoute } from '@/utils/profile';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role } = useAuth();
  const { unreadCount } = useNotifications();
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const isTeacherRoute = pathname.startsWith('/dashboard/teacher');
  const isAdminRoute = pathname.startsWith('/dashboard') && !isStudentRoute && !isTeacherRoute;
  const firstName = user?.firstName ?? 'Admin';
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

  if (isAdminRoute) {
    return (
      <header className="admin-topbar">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="admin-topbar__menu md:hidden" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="admin-topbar__welcome">
            <p className="admin-topbar__title">Welcome back, {firstName}</p>
          </div>
        </div>

        <div className="admin-topbar__actions">
          <button
            type="button"
            className="admin-topbar__notif"
            onClick={() => router.push('/dashboard/notifications')}
            title="Notifications"
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="admin-topbar__notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              ) : null}
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push(profileHref)}
            className="admin-topbar__profile"
          >
            <Avatar className="h-9 w-9 border border-[#f5d4d4]">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
              <AvatarFallback className="admin-topbar__profile-avatar">{initials}</AvatarFallback>
            </Avatar>
            <span className="admin-topbar__profile-copy">
              <span className="admin-topbar__profile-name">{displayName}</span>
              <span className="admin-topbar__profile-role">Admin Portal</span>
            </span>
            <ChevronDown className="h-4 w-4 text-[#9aa9c5]" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className={`flex h-16 items-center justify-between border-b px-4 ${isStudentRoute ? 'student-topbar' : isTeacherRoute ? 'teacher-topbar' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className={`md:hidden ${isTeacherRoute ? 'text-[var(--teacher-text-muted)] hover:bg-white/10 hover:text-[var(--teacher-text-strong)]' : ''}`} onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className={`hidden text-sm sm:block ${isStudentRoute ? 'text-[var(--student-text-muted)]' : isTeacherRoute ? 'text-[var(--teacher-text-muted)]' : 'text-muted-foreground'}`}>
          Welcome, <span className={`font-medium ${isStudentRoute ? 'text-[var(--student-text-strong)]' : isTeacherRoute ? 'text-[var(--teacher-text-strong)]' : 'text-slate-900'}`}>{displayName}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/notifications')}
          title="Notifications"
          className={
            isStudentRoute
              ? 'text-[var(--student-text-muted)] hover:bg-[var(--student-accent-soft)] hover:text-[var(--student-accent)]'
              : isTeacherRoute
                ? 'text-[var(--teacher-text-muted)] hover:bg-white/10 hover:text-[var(--teacher-text-strong)]'
                : undefined
          }
        >
          <Bell className="h-5 w-5" />
        </Button>

        <div className={`mx-2 h-6 w-px ${isStudentRoute ? 'student-divider' : isTeacherRoute ? 'teacher-divider' : 'bg-slate-200'}`} />

        <button
          onClick={() => router.push(profileHref)}
          className={`flex items-center gap-2 rounded-xl px-2 py-1 transition-colors ${isStudentRoute ? 'hover:bg-[var(--student-accent-soft)]' : isTeacherRoute ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
        >
          <Avatar className="h-8 w-8">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
            <AvatarFallback className={`text-xs font-medium ${isStudentRoute ? 'bg-[var(--student-accent-soft)] text-[var(--student-accent)]' : isTeacherRoute ? 'bg-[var(--teacher-outline-strong)] text-[var(--teacher-text-strong)]' : 'bg-primary/10 text-primary'}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className={`hidden text-sm font-medium md:block ${isStudentRoute ? 'text-[var(--student-text-strong)]' : isTeacherRoute ? 'text-[var(--teacher-text-strong)]' : 'text-slate-700'}`}>Profile</span>
        </button>
      </div>
    </header>
  );
}
