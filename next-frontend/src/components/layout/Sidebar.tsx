/**
 * Sidebar - role-aware navigation
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  ClipboardCheck,
  Megaphone,
  FolderOpen,
  User,
  Bot,
  X,
  Menu,
  BarChart3,
  CircleUserRound,
  History,
  Layers3,
  Library,
  Upload,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/providers/AuthProvider';
import { logoutAction } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { getProfileRoute } from '@/utils/profile';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Courses', href: '/dashboard/student/courses', icon: BookOpen },
  { label: 'AI Chatbot', href: '/dashboard/student/chatbot', icon: Bot },
  { label: 'LXP', href: '/dashboard/student/lxp', icon: ClipboardList },
  { label: 'Performance', href: '/dashboard/student/performance', icon: BarChart3 },
  { label: 'Announcements', href: '/dashboard/student/announcements', icon: Megaphone },
  { label: 'Profile', href: '/dashboard/student/profile', icon: User },
];

const teacherNav: NavItem[] = [
  { label: 'My Classes', href: '/dashboard/teacher/classes', icon: BookOpen },
  { label: 'Nexora Library', href: '/dashboard/teacher/library', icon: FolderOpen },
  { label: 'My Sections', href: '/dashboard/teacher/sections', icon: Users },
  { label: 'Calendar', href: '/dashboard/teacher/calendar', icon: Activity },
  { label: 'Class Record', href: '/dashboard/teacher/class-record', icon: ClipboardList },
  { label: 'Reports', href: '/dashboard/teacher/reports', icon: BarChart3 },
  { label: 'Interventions', href: '/dashboard/teacher/interventions', icon: Users },
  { label: 'Performance', href: '/dashboard/teacher/performance', icon: BarChart3 },
  { label: 'Evaluations', href: '/dashboard/teacher/evaluations', icon: Settings },
  { label: 'Announcements', href: '/dashboard/teacher/announcements', icon: Megaphone },
  { label: 'Profile', href: '/dashboard/teacher/profile', icon: User },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'Diagnostics', href: '/dashboard/admin/diagnostics', icon: Activity },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users },
  { label: 'Sections', href: '/dashboard/admin/sections', icon: Layers3 },
  { label: 'Classes', href: '/dashboard/admin/classes', icon: BookOpen },
  { label: 'Calendar', href: '/dashboard/admin/calendar', icon: CalendarDays },
  { label: 'Nexora Library', href: '/dashboard/admin/library', icon: Library },
  { label: 'Roster Import', href: '/dashboard/admin/roster-import', icon: Upload },
  { label: 'Reports', href: '/dashboard/admin/reports', icon: BarChart3 },
  { label: 'Evaluations', href: '/dashboard/admin/evaluations', icon: ClipboardCheck },
  { label: 'Announcements', href: '/dashboard/admin/announcements', icon: Megaphone },
  { label: 'AI Chatbot', href: '/dashboard/admin/chatbot', icon: Bot },
  { label: 'Audit Trail', href: '/dashboard/admin/audit', icon: History },
  { label: 'Profile', href: '/dashboard/admin/profile', icon: CircleUserRound },
];

function getNavItems(role: string | null): NavItem[] {
  switch (role) {
    case 'teacher':
      return teacherNav;
    case 'admin':
      return adminNav;
    default:
      return studentNav;
  }
}

function getRoleLabel(role: string | null): string {
  switch (role) {
    case 'teacher':
      return 'Teacher Portal';
    case 'admin':
      return 'Admin Portal';
    default:
      return 'Student Portal';
  }
}

function isNavItemActive(pathname: string, href: string): boolean {
  const isDashboardRoot =
    href === '/dashboard/admin' ||
    href === '/dashboard/teacher' ||
    href === '/dashboard/student';

  if (isDashboardRoot) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  isAdminCollapsed?: boolean;
  onAdminCollapseToggle?: () => void;
  isTeacherCollapsed?: boolean;
  onTeacherCollapseToggle?: () => void;
}

export function Sidebar({
  open,
  onClose,
  isAdminCollapsed = false,
  onAdminCollapseToggle,
  isTeacherCollapsed = false,
  onTeacherCollapseToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user } = useAuth();
  const items = getNavItems(role).map((item) =>
    item.label === 'Profile' ? { ...item, href: getProfileRoute(role) } : item,
  );
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const isTeacherRoute = pathname.startsWith('/dashboard/teacher');
  const isAdminRoute = role === 'admin' && !isStudentRoute && !isTeacherRoute;
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email ?? 'Admin User';
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'A';

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white transition-transform duration-200 md:static md:translate-x-0',
        isStudentRoute && 'student-sidebar',
        isTeacherRoute && 'teacher-sidebar teacher-sidebar-shell',
        isAdminRoute && 'admin-sidebar',
        isAdminRoute && isAdminCollapsed && 'admin-sidebar--collapsed',
        isTeacherRoute && isTeacherCollapsed && 'teacher-sidebar--collapsed',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div
        className={cn(
          'flex h-22 items-center justify-between border-b px-4',
          isStudentRoute && 'border-[var(--student-outline)]',
          isTeacherRoute && 'border-[var(--teacher-outline)]',
          isAdminRoute && 'admin-sidebar__header',
        )}
      >
        {isAdminRoute ? (
          <div className="admin-sidebar__brand">
            <div className="admin-sidebar__logo">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="admin-sidebar__brand-copy">
              <h1 className="admin-sidebar__title">Nexora</h1>
              <p className="admin-sidebar__subtitle">Admin Portal</p>
            </div>
          </div>
        ) : isTeacherRoute ? (
          <div className="teacher-sidebar__brand">
            <div className="teacher-sidebar__logo">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="teacher-sidebar__brand-copy">
              <h1 className="teacher-sidebar__title">Nexora</h1>
              <p className="teacher-sidebar__subtitle">Teacher Portal</p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className={cn('text-xl font-bold text-primary', isStudentRoute && 'text-[var(--student-accent)]', isTeacherRoute && 'text-[var(--teacher-text-strong)]')}>Nexora</h1>
            <p className={cn('text-xs text-muted-foreground', isStudentRoute && 'text-[var(--student-text-muted)]', isTeacherRoute && 'text-[var(--teacher-text-muted)]')}>
              {getRoleLabel(role)}
            </p>
          </div>
        )}
        {isAdminRoute ? (
          <div className="admin-sidebar__header-actions">
            <button
              type="button"
              className="admin-sidebar__toggle hidden md:inline-flex"
              onClick={onAdminCollapseToggle}
              aria-label="Collapse sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="text-[var(--admin-sidebar-text)] md:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : isTeacherRoute ? (
          <div className="admin-sidebar__header-actions">
            <button
              type="button"
              className="admin-sidebar__toggle hidden md:inline-flex"
              onClick={onTeacherCollapseToggle}
              aria-label="Collapse sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="text-[var(--teacher-text-muted)] md:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button className={cn('md:hidden', isTeacherRoute && 'text-[var(--teacher-text-muted)]')} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav
        className={cn(
          'flex-1 space-y-1 overflow-y-auto p-3',
          isAdminRoute && 'admin-sidebar__nav',
          isTeacherRoute && 'teacher-sidebar__nav',
        )}
      >
        {items.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                onClose?.();
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? isStudentRoute
                    ? 'bg-[var(--student-accent-soft)] text-[var(--student-accent)]'
                    : isTeacherRoute
                      ? 'teacher-sidebar__item teacher-sidebar__item--active'
                    : isAdminRoute
                      ? 'admin-sidebar__item admin-sidebar__item--active'
                      : 'bg-primary/10 text-primary'
                  : isStudentRoute
                    ? 'text-[var(--student-text-muted)] hover:bg-[var(--student-accent-soft)] hover:text-[var(--student-accent)]'
                    : isTeacherRoute
                      ? 'teacher-sidebar__item'
                    : isAdminRoute
                      ? 'admin-sidebar__item'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4',
                  isAdminRoute && 'admin-sidebar__item-icon',
                  isTeacherRoute && 'teacher-sidebar__item-icon',
                )}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {isAdminRoute ? (
        <div className="admin-sidebar__footer-wrap">
          <div className="admin-sidebar__section-divider" />
          <div className="admin-sidebar__footer">
            <div className="admin-sidebar__profile">
              <div className="admin-sidebar__avatar">{initials}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--admin-sidebar-text-strong)]">{displayName}</p>
                <p className="truncate text-xs text-[var(--admin-sidebar-text)]">Admin</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="admin-sidebar__logout"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      ) : isTeacherRoute ? (
        <div className="teacher-sidebar__footer-wrap">
          <div className="teacher-sidebar__section-divider" />
          <div className="teacher-sidebar__footer">
            <div className="teacher-sidebar__profile">
              <div className="teacher-sidebar__avatar">{initials}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{displayName}</p>
                <p className="truncate text-xs text-[#8ea0bc]">Teacher</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="teacher-sidebar__logout"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn('border-t p-3', isStudentRoute && 'border-[var(--student-outline)]', isTeacherRoute && 'border-[var(--teacher-outline)]')}>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 text-muted-foreground hover:text-destructive',
              isStudentRoute && 'text-[var(--student-text-muted)] hover:bg-[var(--student-accent-soft)] hover:text-[var(--student-accent)]',
              isTeacherRoute && 'text-[var(--teacher-text-muted)] hover:bg-white/8 hover:text-rose-200',
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      )}
    </aside>
  );
}
