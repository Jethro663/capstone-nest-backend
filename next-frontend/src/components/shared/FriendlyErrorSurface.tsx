'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

type FriendlyErrorSurfaceProps = {
  mode?: 'embedded' | 'fullscreen';
  eyebrow?: string;
  code?: string;
  title: string;
  description: string;
  hint?: string;
  imageSrc?: string;
  imageAlt?: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void | Promise<void>;
  actionLoading?: boolean;
  className?: string;
  imageClassName?: string;
};

export function FriendlyErrorSurface({
  mode = 'embedded',
  eyebrow,
  code,
  title,
  description,
  hint,
  imageSrc,
  imageAlt = 'Error illustration',
  actionLabel,
  actionHref,
  onAction,
  actionLoading = false,
  className,
  imageClassName,
}: FriendlyErrorSurfaceProps) {
  const isFullscreen = mode === 'fullscreen';

  return (
    <section
      className={cn(
        'flex w-full items-center justify-center px-4 py-8',
        isFullscreen ? 'min-h-screen bg-slate-50' : 'min-h-[70vh]',
        className,
      )}
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-rose-50 to-orange-50 shadow-sm">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-rose-200/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-24 h-64 w-64 rounded-full bg-orange-200/45 blur-3xl" />
        <div className="relative grid gap-6 p-8 md:grid-cols-[1.05fr_1fr] md:items-center md:p-10">
          <div className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-600">
              {eyebrow || 'Something Went Sideways'}
            </p>
            {code ? <p className="text-6xl font-black leading-none text-slate-900">{code}</p> : null}
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{title}</h1>
            <p className="text-sm leading-6 text-slate-600 md:text-base">{description}</p>
            {hint ? <p className="text-sm font-semibold text-slate-700">{hint}</p> : null}
            {actionHref ? (
              <Link href={actionHref} className="inline-block">
                <Button className="mt-2 h-11 rounded-xl px-6 text-sm font-semibold">{actionLabel}</Button>
              </Link>
            ) : (
              <Button
                type="button"
                onClick={onAction}
                className="mt-2 h-11 rounded-xl px-6 text-sm font-semibold"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {actionLabel}
              </Button>
            )}
          </div>
          <div className="rounded-[1.6rem] border border-rose-200 bg-white/85 p-4">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={640}
                height={420}
                className={cn('mx-auto h-auto w-full max-w-[420px] object-contain', imageClassName)}
                sizes="(max-width: 768px) 90vw, 420px"
              />
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-[1.2rem] border border-dashed border-rose-300 bg-rose-50/60 text-center text-sm font-semibold text-rose-700">
                Drop in a replacement illustration here later.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
