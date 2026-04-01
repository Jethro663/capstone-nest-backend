'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { StudentTutorLauncher } from '@/components/student/StudentTutorLauncher';
import { UnfinishedAttemptNotifier } from '@/components/student/UnfinishedAttemptNotifier';
import { AppOrbitLoader } from '@/components/shared/AppOrbitLoader';
import { resolveLoaderVariant } from '@/utils/loader-variant';
import { logoutAction } from '@/lib/auth-actions';
import {
  isDashboardRolePathAllowed,
  normalizeDashboardRole,
} from '@/lib/dashboard-route-access';

const ADMIN_SIDEBAR_STORAGE_KEY = 'nexora.adminSidebarCollapsed';
const TEACHER_SIDEBAR_STORAGE_KEY = 'nexora.teacherSidebarCollapsed';
const STUDENT_SIDEBAR_STORAGE_KEY = 'nexora.studentSidebarCollapsed';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const [teacherSidebarCollapsed, setTeacherSidebarCollapsed] = useState(false);
  const [studentSidebarCollapsed, setStudentSidebarCollapsed] = useState(false);
  const hasTriggeredMismatchLogoutRef = useRef(false);
  const { loading, isAuthenticated, isProfileIncomplete, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const normalizedRole = normalizeDashboardRole(role);
  const shouldRedirect = !loading && (!isAuthenticated || isProfileIncomplete);
  const shouldHandleRoleMismatch =
    !loading &&
    isAuthenticated &&
    !isProfileIncomplete &&
    !isDashboardRolePathAllowed(pathname, normalizedRole);
  const loaderVariant = resolveLoaderVariant(pathname);
  const isStudentShell = normalizedRole === 'student';
  const isTeacherShell = normalizedRole === 'teacher';
  const isAdminShell = normalizedRole === 'admin';
  const shellClass = isStudentShell
    ? 'student-shell'
    : isTeacherShell
      ? 'teacher-shell'
      : isAdminShell
        ? 'admin-dashboard-shell'
        : 'bg-slate-50';

  useEffect(() => {
    if (!shouldRedirect) return;
    router.replace(!isAuthenticated ? '/login' : '/complete-profile');
  }, [shouldRedirect, isAuthenticated, router]);

  useEffect(() => {
    if (!shouldHandleRoleMismatch) return;
    if (hasTriggeredMismatchLogoutRef.current) return;

    hasTriggeredMismatchLogoutRef.current = true;
    void logoutAction('role-mismatch');
  }, [shouldHandleRoleMismatch]);

  useEffect(() => {
    const savedState = window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY);

    if (savedState !== 'true') return;

    const frame = window.requestAnimationFrame(() => {
      setAdminSidebarCollapsed(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const savedState = window.localStorage.getItem(TEACHER_SIDEBAR_STORAGE_KEY);

    if (savedState !== 'true') return;

    const frame = window.requestAnimationFrame(() => {
      setTeacherSidebarCollapsed(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const savedState = window.localStorage.getItem(STUDENT_SIDEBAR_STORAGE_KEY);

    if (savedState !== 'true') return;

    const frame = window.requestAnimationFrame(() => {
      setStudentSidebarCollapsed(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setPersistedAdminSidebarCollapsed = (collapsed: boolean) => {
    setAdminSidebarCollapsed(collapsed);
    window.localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false');
  };

  const setPersistedTeacherSidebarCollapsed = (collapsed: boolean) => {
    setTeacherSidebarCollapsed(collapsed);
    window.localStorage.setItem(TEACHER_SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false');
  };

  const setPersistedStudentSidebarCollapsed = (collapsed: boolean) => {
    setStudentSidebarCollapsed(collapsed);
    window.localStorage.setItem(STUDENT_SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false');
  };

  const handleSidebarToggle = () => {
    if (isAdminShell && window.matchMedia('(min-width: 768px)').matches) {
      setPersistedAdminSidebarCollapsed(!adminSidebarCollapsed);
      return;
    }

    if (isTeacherShell && window.matchMedia('(min-width: 768px)').matches) {
      setPersistedTeacherSidebarCollapsed(!teacherSidebarCollapsed);
      return;
    }

    if (isStudentShell && window.matchMedia('(min-width: 768px)').matches) {
      setPersistedStudentSidebarCollapsed(!studentSidebarCollapsed);
      return;
    }

    setSidebarOpen((open) => !open);
  };

  if (loading || shouldRedirect || shouldHandleRoleMismatch) {
    return <AppOrbitLoader variant={loaderVariant} />;
  }

  return (
    <div className={`flex h-screen overflow-hidden ${shellClass}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        shellRole={normalizedRole}
        isAdminCollapsed={adminSidebarCollapsed}
        onAdminCollapseToggle={() => setPersistedAdminSidebarCollapsed(true)}
        isTeacherCollapsed={teacherSidebarCollapsed}
        onTeacherCollapseToggle={() => setPersistedTeacherSidebarCollapsed(true)}
        isStudentCollapsed={studentSidebarCollapsed}
        onStudentCollapseToggle={() => setPersistedStudentSidebarCollapsed(true)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuToggle={handleSidebarToggle}
          shellRole={normalizedRole}
          showAdminDesktopMenu={adminSidebarCollapsed}
          showTeacherDesktopMenu={teacherSidebarCollapsed}
          showStudentDesktopMenu={studentSidebarCollapsed}
        />
        <main
          className={`flex-1 overflow-y-auto p-4 md:p-6 ${isTeacherShell ? 'teacher-page' : ''} ${isAdminShell ? 'admin-main p-5 lg:p-8' : ''}`}
        >
          {children}
        </main>
      </div>

      <UnfinishedAttemptNotifier />
      <StudentTutorLauncher />
    </div>
  );
}
