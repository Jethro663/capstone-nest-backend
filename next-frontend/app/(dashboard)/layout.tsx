'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { StudentTutorLauncher } from '@/components/student/StudentTutorLauncher';
import { UnfinishedAttemptNotifier } from '@/components/student/UnfinishedAttemptNotifier';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading, isAuthenticated, isProfileIncomplete } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const shouldRedirect = !loading && (!isAuthenticated || isProfileIncomplete);
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const isTeacherRoute = pathname.startsWith('/dashboard/teacher');
  const isAdminRoute = pathname.startsWith('/dashboard') && !isStudentRoute && !isTeacherRoute;
  const shellClass = isStudentRoute
    ? 'student-shell'
    : isTeacherRoute
      ? 'teacher-shell'
      : isAdminRoute
        ? 'admin-dashboard-shell'
        : 'bg-slate-50';

  useEffect(() => {
    if (!shouldRedirect) return;
    router.replace(!isAuthenticated ? '/login' : '/complete-profile');
  }, [shouldRedirect, isAuthenticated, router]);

  // Show a loading spinner while auth state is being resolved
  if (loading || shouldRedirect) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main
          className={`flex-1 overflow-y-auto p-4 md:p-6 ${isTeacherRoute ? 'teacher-page' : ''} ${isAdminRoute ? 'admin-main p-5 lg:p-8' : ''}`}
        >
          {children}
        </main>
      </div>

      <UnfinishedAttemptNotifier />
      <StudentTutorLauncher />
    </div>
  );
}
