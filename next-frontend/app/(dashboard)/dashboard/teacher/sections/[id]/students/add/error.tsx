'use client';

import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';

export default function TeacherAddStudentsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardStatePanel
      kind="error"
      title="Could not open Add Students"
      description="Try the page again. If the problem continues, return to your classes."
      primaryAction={{ label: 'Try again', onClick: reset }}
      secondaryAction={{ label: 'Back to classes', href: '/dashboard/teacher/classes' }}
      className="mx-auto mt-8 max-w-2xl"
    />
  );
}
