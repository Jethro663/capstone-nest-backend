'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { UnfinishedAttemptNotifier } from '@/components/student/UnfinishedAttemptNotifier';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading, isAuthenticated, isProfileIncomplete } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const shouldRedirect = !loading && (!isAuthenticated || isProfileIncomplete);
  const isStudentRoute = pathname.startsWith('/dashboard/student');

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
    <div className={`flex h-screen overflow-hidden ${isStudentRoute ? 'student-shell' : 'bg-slate-50'}`}>
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      <UnfinishedAttemptNotifier />
    </div>
  );
}
