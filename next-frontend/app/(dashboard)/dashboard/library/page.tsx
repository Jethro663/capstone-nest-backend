'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export default function DashboardLibraryAliasPage() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (role === 'teacher') {
      router.replace('/dashboard/teacher/library');
      return;
    }

    if (role === 'admin') {
      router.replace('/dashboard/admin/library');
    }
  }, [loading, role, router]);

  if (loading || role === 'teacher' || role === 'admin') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Nexora Library is available to teachers and admins only.</p>;
}
