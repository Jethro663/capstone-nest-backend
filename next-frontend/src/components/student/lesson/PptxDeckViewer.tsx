'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parsePptxSlides, type PptxSlide } from '@/lib/pptx-viewer';

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
  const [slides, setSlides] = useState<PptxSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  return (
    <article
      className="student-pptx-viewer rounded-[1rem] border border-[#d7deea] bg-white shadow-sm"
      aria-label={`${title} PowerPoint viewer`}
    >
      <header className="student-pptx-viewer__header flex flex-wrap items-start justify-between gap-3 border-b border-[#e5eaf2] px-4 py-4">
        <div>
          <p className="student-pptx-viewer__eyebrow text-xs font-black uppercase tracking-[0.12em] text-[#a32d2d]">Deck Preview</p>
          <h2 className="mt-1 text-lg font-black text-[#172033]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-semibold text-[#64748b]">{subtitle}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="student-pptx-viewer__download rounded-full"
          onClick={() => void onDownload()}
        >
          <Download className="h-4 w-4" />
          Download deck
        </Button>
      </header>

      {loading ? (
        <div className="student-pptx-viewer__state flex min-h-44 items-center justify-center gap-2 px-4 py-8 text-sm font-bold text-[#5f6b7a]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading PowerPoint preview...
        </div>
      ) : error ? (
        <div
          className="student-pptx-viewer__state student-pptx-viewer__state--warning m-4 flex items-start gap-2 rounded-[0.9rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-900"
          role="status"
        >
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : activeSlide ? (
        <>
          <div className="student-pptx-viewer__toolbar flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-[#475569]">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[#dbe3ef] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="inline-flex items-center gap-1 rounded-full border border-[#dbe3ef] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={goNext}
              disabled={activeIndex >= slides.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <section className="student-pptx-viewer__slide m-4 rounded-[0.9rem] border border-[#dbe3ef] bg-[#f8fafc] px-4 py-5" aria-live="polite">
            <p className="student-pptx-viewer__slide-number text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">Slide {activeSlide.slideNumber}</p>
            <h3 className="mt-2 text-xl font-black text-[#111827]">{activeSlide.title}</h3>
            <div className="student-pptx-viewer__slide-lines mt-4 grid gap-2 text-sm leading-6 text-[#334155]">
              {activeSlide.lines.map((line, index) => (
                <p key={`${activeSlide.slideNumber}-${index}`}>{line}</p>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </article>
  );
}
