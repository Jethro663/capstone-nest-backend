'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';

export function usePublicSessionProbe() {
  const { isAuthenticated, loading, refreshAuth } = useAuth();
  const hasAttemptedProbeRef = useRef(false);

  useEffect(() => {
    if (loading || isAuthenticated || hasAttemptedProbeRef.current) {
      return;
    }

    hasAttemptedProbeRef.current = true;
    void refreshAuth();
  }, [isAuthenticated, loading, refreshAuth]);
}
