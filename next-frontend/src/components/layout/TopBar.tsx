/**
 * TopBar - welcome text, notifications, messages, profile
 */

'use client';

import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Moon, User } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/lib/auth-actions';
import { getProfileRoute } from '@/utils/profile';
import {
  normalizeDashboardRole,
  type DashboardRole,
} from '@/lib/dashboard-route-access';

interface TopBarProps {
  onMenuToggle: () => void;
  shellRole?: DashboardRole | null;
  showAdminDesktopMenu?: boolean;
  showTeacherDesktopMenu?: boolean;
  showStudentDesktopMenu?: boolean;
}

export function TopBar({
  onMenuToggle,
  shellRole = null,
  showAdminDesktopMenu = false,
  showTeacherDesktopMenu = false,
  showStudentDesktopMenu = false,
}: TopBarProps) {
  const router = useRouter();
  const { user, role } = useAuth();
  const { unreadCount } = useNotifications();
  const effectiveRole = shellRole ?? normalizeDashboardRole(role);
  const isStudentShell = effectiveRole === 'student';
  const isTeacherShell = effectiveRole === 'teacher';
  const isAdminShell = effectiveRole === 'admin';
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
  const profileHref = getProfileRoute(effectiveRole);
  const notificationsLabel =
    unreadCount > 0
      ? `Open notifications (${unreadCount > 9 ? '9+' : unreadCount} unread)`
      : 'Open notifications';

  if (isAdminShell) {
    return (
      <header className="admin-topbar">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className={showAdminDesktopMenu ? 'admin-topbar__menu' : 'admin-topbar__menu md:hidden'}
            onClick={onMenuToggle}
            aria-label={showAdminDesktopMenu ? 'Expand sidebar' : 'Open sidebar'}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="admin-topbar__welcome">
            <p className="admin-topbar__title">
              Welcome back, <span>{firstName}</span>
            </p>
          </div>
        </div>

        <div className="admin-topbar__actions">
          <button
            type="button"
            className="admin-topbar__notif"
            onClick={() => router.push('/dashboard/notifications')}
            title={notificationsLabel}
            aria-label={notificationsLabel}
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="admin-topbar__notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              ) : null}
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="admin-topbar__profile"
                aria-label="Open profile menu"
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
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#e7edf5] p-1.5 shadow-lg">
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                onSelect={() => router.push(profileHref)}
              >
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                onSelect={() => {
                  void logoutAction();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  if (isTeacherShell) {
    return (
      <header className="teacher-topbar-shell">
        <div className="teacher-topbar-shell__left">
          <Button
            variant="ghost"
            size="icon"
            className={showTeacherDesktopMenu ? 'teacher-topbar-shell__menu' : 'teacher-topbar-shell__menu md:hidden'}
            onClick={onMenuToggle}
            aria-label={showTeacherDesktopMenu ? 'Expand sidebar' : 'Open sidebar'}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <p className="teacher-topbar-shell__welcome">
            Welcome back, <strong>{firstName}</strong>
          </p>
        </div>

        <div className="teacher-topbar-shell__actions">
          <button
            type="button"
            className="teacher-topbar-shell__notif"
            onClick={() => router.push('/dashboard/notifications')}
            title={notificationsLabel}
            aria-label={notificationsLabel}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="teacher-topbar-shell__notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            ) : null}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="teacher-topbar-shell__profile"
                aria-label="Open profile menu"
              >
                <Avatar className="h-10 w-10 border border-[#f5d4d4]">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                  <AvatarFallback className="teacher-topbar-shell__avatar">{initials}</AvatarFallback>
                </Avatar>
                <span className="teacher-topbar-shell__profile-copy">
                  <span className="teacher-topbar-shell__name">{displayName}</span>
                  <span className="teacher-topbar-shell__role">Teacher Portal</span>
                </span>
                <ChevronDown className="h-4 w-4 text-[#9aa9c5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#e7edf5] p-1.5 shadow-lg">
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                onSelect={() => router.push(profileHref)}
              >
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                onSelect={() => {
                  void logoutAction();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  if (isStudentShell) {
    return (
      <header className="student-topbar-shell">
        <div className="student-topbar-shell__left">
          <Button
            variant="ghost"
            size="icon"
            className={showStudentDesktopMenu ? 'student-topbar-shell__menu' : 'student-topbar-shell__menu md:hidden'}
            onClick={onMenuToggle}
            aria-label={showStudentDesktopMenu ? 'Expand sidebar' : 'Open sidebar'}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <p className="student-topbar-shell__welcome">
            Welcome back, <strong>{firstName}</strong>
          </p>
        </div>

        <div className="student-topbar-shell__actions">
          <button
            type="button"
            className="student-topbar-shell__icon-button"
            title="Student theme"
            aria-label="Student theme"
          >
            <Moon className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="student-topbar-shell__notif"
            onClick={() => router.push('/dashboard/notifications')}
            title={notificationsLabel}
            aria-label={notificationsLabel}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="student-topbar-shell__notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            ) : null}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="student-topbar-shell__profile"
                aria-label="Open profile menu"
              >
                <Avatar className="h-10 w-10 border border-[#f5d4d4]">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                  <AvatarFallback className="student-topbar-shell__avatar">{initials}</AvatarFallback>
                </Avatar>
                <span className="student-topbar-shell__profile-copy">
                  <span className="student-topbar-shell__name">{displayName}</span>
                  <span className="student-topbar-shell__role">Student Portal</span>
                </span>
                <ChevronDown className="h-4 w-4 text-[#9aa9c5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#e7edf5] p-1.5 shadow-lg">
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                onSelect={() => router.push(profileHref)}
              >
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                onSelect={() => {
                  void logoutAction();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  return (
    <header className={`flex h-16 items-center justify-between border-b px-4 ${isTeacherShell ? 'teacher-topbar' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className={`md:hidden ${isTeacherShell ? 'text-[var(--teacher-text-muted)] hover:bg-white/10 hover:text-[var(--teacher-text-strong)]' : ''}`} onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className={`hidden text-sm sm:block ${isTeacherShell ? 'text-[var(--teacher-text-muted)]' : 'text-muted-foreground'}`}>
          Welcome, <span className={`font-medium ${isTeacherShell ? 'text-[var(--teacher-text-strong)]' : 'text-slate-900'}`}>{displayName}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/notifications')}
          title={notificationsLabel}
          aria-label={notificationsLabel}
          className={
            isTeacherShell
                ? 'text-[var(--teacher-text-muted)] hover:bg-white/10 hover:text-[var(--teacher-text-strong)]'
                : undefined
          }
        >
          <Bell className="h-5 w-5" />
        </Button>

        <div className={`mx-2 h-6 w-px ${isTeacherShell ? 'teacher-divider' : 'bg-slate-200'}`} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-2 rounded-xl px-2 py-1 transition-colors ${isTeacherShell ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
            >
              <Avatar className="h-8 w-8">
                {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                <AvatarFallback className={`text-xs font-medium ${isTeacherShell ? 'bg-[var(--teacher-outline-strong)] text-[var(--teacher-text-strong)]' : 'bg-primary/10 text-primary'}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className={`hidden text-sm font-medium md:block ${isTeacherShell ? 'text-[var(--teacher-text-strong)]' : 'text-slate-700'}`}>Profile</span>
              <ChevronDown className={`hidden h-4 w-4 md:block ${isTeacherShell ? 'text-[var(--teacher-text-muted)]' : 'text-slate-500'}`} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#e7edf5] p-1.5 shadow-lg">
            <DropdownMenuItem
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-slate-50 focus:text-slate-900"
              onSelect={() => router.push(profileHref)}
            >
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700"
              onSelect={() => {
                void logoutAction();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
