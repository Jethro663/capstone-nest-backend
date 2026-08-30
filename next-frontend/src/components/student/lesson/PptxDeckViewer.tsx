'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parsePptxSlides, type PptxSlide } from '@/lib/pptx-viewer';
import { cn } from '@/utils/cn';

interface PptxDeckViewerProps {
  title: string;
  subtitle?: string;
  loadFile: () => Promise<Blob>;
  onDownload: () => Promise<void> | void;
}

export function PptxDeckViewer({
  title,
  subtitle,
  loadFile,
  onDownload,
}: PptxDeckViewerProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [slides, setSlides] = useState<PptxSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeSlide = slides[activeIndex] ?? null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const blob = await loadFile();
        const parsedSlides = await parsePptxSlides(blob);
        if (cancelled) return;
        setSlides(parsedSlides);
        setActiveIndex(0);
      } catch {
        if (!cancelled) {
          setSlides([]);
          setActiveIndex(0);
          setError('This PowerPoint can be downloaded, but its slide text could not be previewed in the browser.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadFile]);

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(slides.length - 1, current + 1));
  }, [slides.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrevious]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await viewerRef.current?.requestFullscreen();
    } catch {
      setIsFullscreen(false);
    }
  }, []);

  return (
    <article
      ref={viewerRef}
      className={cn(
        'student-pptx-viewer overflow-hidden rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] shadow-sm',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-0 bg-[var(--student-navy)]',
      )}
      aria-label={`${title} PowerPoint viewer`}
    >
      <header className="student-pptx-viewer__header flex flex-wrap items-start justify-between gap-3 border-b border-[var(--student-outline)] bg-white px-4 py-4">
        <div className="min-w-0">
          <p className="student-pptx-viewer__eyebrow text-xs font-black uppercase tracking-[0.12em] text-[var(--student-accent)]">Deck Preview</p>
          <h2 className="mt-1 truncate text-lg font-black text-[var(--student-navy)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-semibold text-[var(--student-text-muted)]">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="student-pptx-viewer__download rounded-full"
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? 'Exit full screen' : 'Full screen'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="student-pptx-viewer__download rounded-full"
            onClick={() => void onDownload()}
          >
            <Download className="h-4 w-4" />
            Download deck
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="student-pptx-viewer__state flex min-h-44 items-center justify-center gap-2 px-4 py-8 text-sm font-bold text-[var(--student-navy-soft)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading PowerPoint preview...
        </div>
      ) : error ? (
        <div
          className="student-pptx-viewer__state student-pptx-viewer__state--warning m-4 flex items-start gap-2 rounded-[0.9rem] border border-[var(--student-warning-border)] bg-[var(--student-warning-bg)] px-4 py-4 text-sm font-semibold text-[var(--student-warning-text)]"
          role="status"
        >
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : activeSlide ? (
        <div className={cn('grid gap-0 bg-[var(--student-surface-soft)]', isFullscreen ? 'h-[calc(100vh-81px)] md:grid-cols-[13rem_minmax(0,1fr)]' : 'md:grid-cols-[12rem_minmax(0,1fr)]')}>
          <aside className="student-pptx-viewer__rail flex gap-2 overflow-x-auto border-b border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-3 md:max-h-[38rem] md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {slides.map((slide, index) => (
              <button
                key={slide.slideNumber}
                type="button"
                aria-label={`Open slide ${slide.slideNumber}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                className={cn(
                  'grid min-w-36 gap-2 rounded-lg border bg-white p-2 text-left shadow-sm transition md:min-w-0',
                  index === activeIndex
                    ? 'border-[var(--student-accent)] ring-2 ring-[var(--student-danger-border)]'
                    : 'border-[var(--student-outline)] hover:border-[var(--student-outline)]',
                )}
                onClick={() => setActiveIndex(index)}
              >
                <span className="text-[0.68rem] font-black uppercase text-[var(--student-text-muted)]">Slide {slide.slideNumber}</span>
                <span className="aspect-video overflow-hidden rounded border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] px-2 py-2">
                  <span className="line-clamp-2 block text-xs font-black leading-snug text-[var(--student-navy)]">
                    {slide.title}
                  </span>
                </span>
              </button>
            ))}
          </aside>

          <div className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="student-pptx-viewer__toolbar flex flex-wrap items-center justify-between gap-2 border-b border-[var(--student-outline)] bg-white px-4 py-3 text-sm font-bold text-[var(--student-navy-soft)]">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--student-outline)] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={goPrevious}
                disabled={activeIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span>
                Slide {activeIndex + 1} of {slides.length}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--student-outline)] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={goNext}
                disabled={activeIndex >= slides.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-[22rem] items-center justify-center bg-[var(--student-surface-soft)] p-4 md:p-8">
              <section
                className="student-pptx-viewer__slide aspect-video w-full max-w-5xl rounded-md border border-[var(--student-outline)] bg-white px-[6%] py-[5%] shadow-xl"
                aria-live="polite"
              >
                <p className="student-pptx-viewer__slide-number text-xs font-black uppercase tracking-[0.12em] text-[var(--student-text-muted)]">Slide {activeSlide.slideNumber}</p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-[var(--student-navy)] md:text-4xl">{activeSlide.title}</h3>
                <div className="student-pptx-viewer__slide-lines mt-6 grid gap-3 text-sm leading-6 text-[var(--student-navy-soft)] md:text-lg">
                  {activeSlide.lines.map((line, index) => (
                    <p key={`${activeSlide.slideNumber}-${index}`}>{line}</p>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
