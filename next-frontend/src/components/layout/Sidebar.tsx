/**
 * Sidebar — role‑aware navigation
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  Megaphone,
  FolderOpen,
  User,
  Bot,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/providers/AuthProvider';
import { logoutAction } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Courses', href: '/dashboard/student/courses', icon: BookOpen },
  { label: 'Announcements', href: '/dashboard/student/announcements', icon: Megaphone },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/teacher', icon: LayoutDashboard },
  { label: 'My Classes', href: '/dashboard/teacher/classes', icon: BookOpen },
  { label: 'My Sections', href: '/dashboard/teacher/sections', icon: Users },
  { label: 'Class Record', href: '/dashboard/teacher/class-record', icon: ClipboardList },
  { label: 'Announcements', href: '/dashboard/teacher/announcements', icon: Megaphone },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users },
  { label: 'Sections', href: '/dashboard/admin/sections', icon: FolderOpen },
  { label: 'Classes', href: '/dashboard/admin/classes', icon: BookOpen },
  { label: 'Roster Import', href: '/dashboard/admin/roster-import', icon: ClipboardList },
  { label: 'Announcements', href: '/dashboard/admin/announcements', icon: Megaphone },
  { label: 'AI Chatbot', href: '/dashboard/admin/chatbot', icon: Bot },
  { label: 'Audit Trail', href: '/dashboard/admin/audit', icon: Settings },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
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

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuth();
  const items = getNavItems(role);
  const isStudentRoute = pathname.startsWith('/dashboard/student');

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white transition-transform duration-200 md:static md:translate-x-0',
        isStudentRoute && 'border-red-100 bg-gradient-to-b from-white via-red-50/20 to-white',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Header */}
      <div className={cn('flex h-16 items-center justify-between border-b px-4', isStudentRoute && 'border-red-100')}>
        <div>
          <h1 className="text-xl font-bold text-primary">Nexora</h1>
          <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>
        </div>
        <button className="md:hidden" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
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
                    ? 'bg-red-100 text-red-700'
                    : 'bg-primary/10 text-primary'
                  : isStudentRoute
                    ? 'text-muted-foreground hover:bg-red-50 hover:text-red-700'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
