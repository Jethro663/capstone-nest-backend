'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getProfileRoute } from '@/utils/profile';

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { loading, role } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(getProfileRoute(role));
  }, [loading, role, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
    </div>
  );
}
