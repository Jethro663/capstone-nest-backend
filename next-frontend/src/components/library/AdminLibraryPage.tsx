'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useLibraryWorkspace } from '@/hooks/use-library-workspace';
import { LibraryWorkspaceView } from '@/components/library/LibraryWorkspaceView';

export function AdminLibraryPage() {
  const router = useRouter();
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  const workspace = useLibraryWorkspace({
    role: 'admin',
    userId: isAdmin ? user?.id : undefined,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (role === 'teacher') {
      router.replace('/dashboard/teacher/library');
    }
  }, [role, router]);

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Nexora Library is available to teachers and admins only.</p>;
  }

  return <LibraryWorkspaceView variant="admin" workspace={workspace} />;
}
