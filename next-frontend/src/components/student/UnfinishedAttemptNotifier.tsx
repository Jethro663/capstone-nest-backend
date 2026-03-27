'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { assessmentService } from '@/services/assessment-service';
import type { OngoingAttemptSummary } from '@/types/assessment';
import { Clock, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function UnfinishedAttemptNotifier() {
  const { role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [attempts, setAttempts] = useState<OngoingAttemptSummary[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  const isOnTakePage = pathname.includes('/take');
  const isStudent = role === 'student';

  const fetchAttempts = useCallback(async () => {
    if (!isStudent || isOnTakePage) return;
    try {
      const res = await assessmentService.getOngoingAttempts();
      if (res?.data) setAttempts(res.data);
    } catch {
      // silent — non-critical UI
    }
  }, [isStudent, isOnTakePage]);

  // Poll every 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchAttempts();
    }, 0);
    const interval = setInterval(fetchAttempts, 30_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchAttempts]);

  // Tick every second for countdown display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isStudent || isOnTakePage) return null;

  const visible = attempts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {visible.map((attempt) => (
        <div
          key={attempt.id}
          className="flex items-center gap-3 rounded-xl border border-[var(--student-outline-strong)] bg-[var(--student-elevated)] p-3 shadow-lg"
        >
          <Clock className="h-5 w-5 shrink-0 text-[var(--student-accent)]" />

          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--student-text-strong)]">
              {attempt.assessmentTitle ?? 'Assessment in progress'}
            </p>
            {attempt.expiresAt && (
              <p className="text-xs text-[var(--student-text-muted)]">
                {/* rerender driven by tick */}
                {tick >= 0 ? formatCountdown(attempt.expiresAt) : ''} remaining
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
            onClick={() =>
              router.push(`/dashboard/student/assessments/${attempt.assessmentId}/take`)
            }
          >
            Resume
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>

          <button
            aria-label="Dismiss"
            className="text-[var(--student-text-muted)] hover:text-[var(--student-text-strong)]"
            onClick={() => setDismissed((prev) => new Set(prev).add(attempt.id))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
