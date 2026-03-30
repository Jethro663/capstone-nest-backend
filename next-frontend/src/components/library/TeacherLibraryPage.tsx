'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useLibraryWorkspace } from '@/hooks/use-library-workspace';
import { LibraryWorkspaceView } from '@/components/library/LibraryWorkspaceView';

export function TeacherLibraryPage() {
  const router = useRouter();
  const { role, user } = useAuth();
  const isTeacher = role === 'teacher';
  const workspace = useLibraryWorkspace({
    role: 'teacher',
    userId: isTeacher ? user?.id : undefined,
    enabled: isTeacher,
  });

  useEffect(() => {
    if (role === 'admin') {
      router.replace('/dashboard/admin/library');
    }
  }, [role, router]);

  if (!isTeacher) {
    return <p className="text-sm text-muted-foreground">Nexora Library is available to teachers and admins only.</p>;
  }

  return <LibraryWorkspaceView variant="teacher" workspace={workspace} />;
}
