/**
 * TopBar - welcome text, notifications, messages, profile
 */

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/lib/auth-actions';
import { getProfileRoute, resolveUserProfilePicture } from '@/utils/profile';
import {
  normalizeDashboardRole,
  type DashboardRole,
} from '@/lib/dashboard-route-access';
import { SystemInfoButton } from './SystemInfoButton';
import { StudentThemeSwitcher } from './StudentThemeSwitcher';
import { NotificationBellDropdown } from '@/components/notifications/NotificationBellDropdown';

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
  const avatarSrc = resolveUserProfilePicture(user);
  const profileHref = getProfileRoute(effectiveRole);
  const studentApkHref = 'https://expo.dev/accounts/marcdizon2005/projects/nexora-lms-mobile/builds/f2cd8d4e-5d47-48d3-95bc-f1982c15bd06';

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
          <SystemInfoButton buttonClassName="admin-topbar__notif" />

          <NotificationBellDropdown
            buttonClassName="admin-topbar__notif"
            badgeClassName="admin-topbar__notif-badge"
          />

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
          <SystemInfoButton buttonClassName="teacher-topbar-shell__notif" />

          <NotificationBellDropdown
            buttonClassName="teacher-topbar-shell__notif"
            badgeClassName="teacher-topbar-shell__notif-badge"
          />

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
          <p className="student-topbar-shell__welcome max-[430px]:text-sm">
            Welcome back, <strong>{firstName}</strong>
          </p>
        </div>

        <div className="student-topbar-shell__actions">
          <StudentThemeSwitcher />

          <a
            href={studentApkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="student-topbar-shell__icon-button"
            title="Download Nexora Mobile for Android (v0.1.2)"
            aria-label="Download Nexora Mobile for Android (v0.1.2)"
          >
            <span className="student-topbar-shell__apk-art" aria-hidden="true">
              <Image
                src="/images/JA/apk_logo.png"
                alt=""
                width={64}
                height={64}
                className="student-topbar-shell__apk-logo"
              />
            </span>
          </a>

          <SystemInfoButton buttonClassName="student-topbar-shell__icon-button" />

          <NotificationBellDropdown
            buttonClassName="student-topbar-shell__notif"
            badgeClassName="student-topbar-shell__notif-badge"
          />

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
                <span className="student-topbar-shell__profile-copy !hidden sm:!grid">
                  <span className="student-topbar-shell__name">{displayName}</span>
                  <span className="student-topbar-shell__role">Student Portal</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-[#9aa9c5] sm:block" />
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
        <SystemInfoButton
          buttonClassName={
            isTeacherShell
              ? 'inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--teacher-text-muted)] transition hover:bg-white/10 hover:text-[var(--teacher-text-strong)]'
              : 'inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
          }
        />

        <NotificationBellDropdown
          buttonClassName={
            isTeacherShell
              ? 'inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--teacher-text-muted)] transition hover:bg-white/10 hover:text-[var(--teacher-text-strong)]'
              : 'inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
          }
          badgeClassName="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e70012] px-1 text-[10px] font-black text-white"
        />

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
