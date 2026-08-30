import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AiOutageNoticeProps {
  className?: string;
  message?: string;
  mode?: 'ja' | 'lxp' | 'teacher';
}

export function AiOutageNotice({
  className,
  message,
  mode = 'ja',
}: AiOutageNoticeProps) {
  const title = mode === 'teacher' ? 'AI tools are paused' : 'JA is taking a break';
  const body =
    mode === 'teacher'
      ? 'Saved class data stays available, but AI generation and analysis actions are view-only until the service is back.'
      : mode === 'lxp'
        ? 'Your path is still open, but replay help may be paused until JA is back online.'
        : 'JA Hub is view-only right now. Saved history is still available, but new AI help is paused.';

  return (
    <section
      className={cn(
        'flex items-center gap-4 rounded-2xl border border-[var(--student-warning-border)] bg-[var(--student-warning-bg)] p-4 text-[var(--student-warning-text)] shadow-sm',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/75">
        <Image
          src="/images/JA/ja_sad.png"
          alt="JA looks sad while AI help is offline"
          fill
          sizes="64px"
          className="object-contain p-1"
        />
      </div>
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--student-warning-text)]">
          <AlertTriangle className="h-3.5 w-3.5" />
          AI offline
        </p>
        <h2 className="mt-1 text-lg font-bold text-[var(--student-warning-text)]">
          {title}
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--student-warning-text)]">
          {body}
        </p>
        {message ? (
          <p className="mt-1 text-xs font-medium text-[var(--student-warning-text)]">{message}</p>
        ) : null}
      </div>
    </section>
  );
}
