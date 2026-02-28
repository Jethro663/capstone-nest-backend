'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    switch (role) {
      case 'admin':
        router.replace('/dashboard/admin');
        break;
      case 'teacher':
        router.replace('/dashboard/teacher');
        break;
      default:
        router.replace('/dashboard/student');
    }
  }, [role, loading, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
