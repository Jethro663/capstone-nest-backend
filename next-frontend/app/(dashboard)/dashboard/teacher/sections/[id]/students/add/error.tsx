'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TeacherAddStudentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Could not open Add Students</h2>
          <p className="text-sm opacity-90">
            Something went wrong while loading this page. Please try again.
          </p>
          <p className="text-xs opacity-70">{error?.message || 'Unexpected error'}</p>
          <Button type="button" onClick={reset} className="mt-2">Try again</Button>
        </div>
      </div>
    </div>
  );
}
