import { CheckCircle2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SharedQuestionNavigator({
  questionIds,
  currentIdx,
  answeredById,
  onNavigate,
  navigationLocked,
}: {
  questionIds: string[];
  currentIdx: number;
  answeredById: Record<string, boolean>;
  onNavigate: (index: number) => void;
  navigationLocked: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-[var(--student-text-strong)]">Question Navigator</p>
      <div className="grid grid-cols-4 gap-2">
        {questionIds.map((questionId, index) => {
          const answered = Boolean(answeredById[questionId]);
          return (
            <Button
              key={questionId}
              variant="outline"
              size="sm"
              disabled={navigationLocked && index !== currentIdx}
              onClick={() => {
                if (navigationLocked && index !== currentIdx) return;
                onNavigate(index);
              }}
              className={
                index === currentIdx
                  ? 'border-[var(--student-accent)] bg-[var(--student-accent)] text-[var(--student-accent-contrast)] hover:opacity-90'
                  : answered
                    ? 'border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]'
                    : ''
              }
            >
              {index + 1}
            </Button>
          );
        })}
      </div>
      <div className="mt-3 space-y-1 text-xs student-muted-text">
        <p className="flex items-center gap-1">
          <Flag className="h-3.5 w-3.5 text-[var(--student-accent)]" /> Current
        </p>
        <p className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--student-success-text)]" /> Answered
        </p>
      </div>
    </div>
  );
}

