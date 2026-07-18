'use client';

import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardStatePanel
      kind="error"
      title="We couldn't load this page"
      description="Try the page again. If the problem continues, return to your dashboard."
      primaryAction={{ label: 'Try again', onClick: reset }}
      secondaryAction={{ label: 'Return to dashboard', href: '/dashboard' }}
    />
  );
}
