'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY } from '@/lib/student-announcement-board';
import type { SchoolEvent } from '@/types/school-event';

interface StudentAnnouncementBoardDialogProps {
  events: SchoolEvent[];
  now?: Date;
  storageKey?: string;
}

interface AnnouncementSlide {
  id: string;
  accent: string;
  label: string;
  image: {
    alt: string;
    src: string;
  };
  kind: 'reminder' | 'event';
  title: string;
  body: string;
  details: string[];
}

const DEFAULT_STORAGE_KEY = STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY;

function formatEventDate(event: SchoolEvent) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);

  if (event.allDay) {
    return start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return `${start.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function buildSlides(events: SchoolEvent[], now: Date): AnnouncementSlide[] {
  const upcomingEvents = events
    .filter((event) => new Date(event.endsAt).getTime() >= now.getTime())
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    )
    .slice(0, 4);

  return [
    {
      id: 'lms-reminders',
      kind: 'reminder',
      accent: 'from-sky-500 via-blue-500 to-cyan-400',
      label: 'Student guide',
      image: {
        src: '/images/JA/ja_wave.png',
        alt: 'JA waving to welcome the student',
      },
      title: 'LMS reminders',
      body: 'Keep your account, classes, and submissions clean while you study.',
      details: [
        'Check due dates before starting assessments.',
        'Submit your own work and keep uploaded files school-appropriate.',
        'Use class announcements for official updates from teachers and admins.',
      ],
    },
    ...upcomingEvents.map((event) => ({
      id: event.id,
      kind: 'event' as const,
      accent:
        event.eventType === 'holiday_break'
          ? 'from-amber-400 via-orange-400 to-rose-400'
          : 'from-indigo-500 via-sky-500 to-cyan-400',
      label:
        event.eventType === 'holiday_break' ? 'Holiday break' : 'School event',
      image: {
        src:
          event.eventType === 'holiday_break'
            ? '/images/JA/ja_cheer.png'
            : '/images/JA/ja_thinking.png',
        alt:
          event.eventType === 'holiday_break'
            ? 'JA cheering for a holiday break'
            : 'JA thinking about an upcoming school event',
      },
      title: event.title,
      body: event.description || 'Details will be shared by the school.',
      details: [
        formatEventDate(event),
        event.location ? `Location: ${event.location}` : event.schoolYear,
      ],
    })),
  ];
}

export function StudentAnnouncementBoardDialog({
  events,
  now = new Date(),
  storageKey = DEFAULT_STORAGE_KEY,
}: StudentAnnouncementBoardDialogProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const slides = useMemo(() => buildSlides(events, now), [events, now]);
  const currentSlide = slides[index] ?? slides[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(storageKey) !== 'dismissed') {
      setOpen(true);
    }
  }, [storageKey]);

  function dismiss() {
    sessionStorage.setItem(storageKey, 'dismissed');
    setOpen(false);
  }

  if (!currentSlide) return null;

  return (
    <Dialog
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
        } else {
          dismiss();
        }
      }}
    >
      <DialogContent
        variant="student"
        className="max-w-[min(94vw,760px)] overflow-hidden rounded-[1.5rem] border-0 p-0"
      >
        <div className="grid overflow-hidden bg-[var(--student-elevated)] md:grid-cols-[248px_minmax(0,1fr)]">
          <div
            className={`relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-gradient-to-br ${currentSlide.accent} px-5 py-5 text-white`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.24),_transparent_48%)]" />
            <div className="relative z-10 space-y-3">
              <span className="inline-flex w-fit rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                {currentSlide.label}
              </span>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-[1.65rem] leading-tight text-white">
                  {currentSlide.title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-6 text-white/85">
                  {currentSlide.body}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="relative z-10 mt-4 flex items-end justify-between gap-4">
              <div className="space-y-1 text-xs text-white/85">
                <p className="font-semibold uppercase tracking-[0.14em]">
                  {currentSlide.kind === 'reminder'
                    ? 'Quick check-in'
                    : 'School notice'}
                </p>
                <p className="max-w-[10rem] leading-5 text-white/80">
                  {currentSlide.kind === 'reminder'
                    ? 'Tap through the form, then close when you are ready.'
                    : 'Move through the event list without leaving the dashboard.'}
                </p>
              </div>

              <div className="relative h-28 w-28 shrink-0">
                <Image
                  src={currentSlide.image.src}
                  alt={currentSlide.image.alt}
                  fill
                  className="object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.35)]"
                  sizes="112px"
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col bg-[linear-gradient(180deg,#fffdfd_0%,#fff6f5_100%)]">
            <div className="flex items-center justify-between border-b border-rose-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-500">
                  Student login popup
                </p>
                <p className="text-sm text-slate-500">
                  {index + 1} of {slides.length}
                </p>
              </div>

              {slides.length > 1 ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {slides.map((slide, slideIndex) => (
                    <button
                      key={slide.id}
                      type="button"
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        slideIndex === index
                          ? 'border-rose-300 bg-rose-50 text-rose-600'
                          : 'border-rose-100 bg-white text-slate-500 hover:border-rose-200 hover:text-slate-700'
                      }`}
                      onClick={() => setIndex(slideIndex)}
                    >
                      {slideIndex === 0 ? 'Guide' : `Event ${slideIndex}`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex-1 px-5 py-5">
              {currentSlide.kind === 'reminder' ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Before you continue
                    </p>
                    {currentSlide.details.map((detail, detailIndex) => (
                      <div
                        key={detail}
                        className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-semibold text-rose-500">
                          0{detailIndex + 1}
                        </span>
                        <p className="pt-0.5 text-sm leading-6 text-slate-700">
                          {detail}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
                      JA focus
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      Start with due dates, recent announcements, and class files so you do not miss instructions or late submissions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-3">
                    {currentSlide.details.map((detail, detailIndex) => (
                      <div
                        key={detail}
                        className="grid grid-cols-[auto_1fr] items-start gap-3 border-b border-rose-100 pb-3 last:border-b-0 last:pb-0"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-semibold text-rose-500">
                          0{detailIndex + 1}
                        </span>
                        <p className="pt-0.5 text-sm leading-6 text-slate-700">
                          {detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Heads up
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      Watch your class announcements for final room changes, activity notes, or extra instructions.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-rose-100 px-5 py-4 sm:space-x-0">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  className="rounded-full border-rose-200 bg-white text-slate-600 hover:bg-rose-50"
                  onClick={dismiss}
                >
                  Close
                </Button>

                <div className="flex items-center justify-end gap-2">
                  {index > 0 ? (
                    <Button
                      variant="outline"
                      className="rounded-full border-rose-200 bg-white hover:bg-rose-50"
                      onClick={() => setIndex((current) => current - 1)}
                    >
                      Back
                    </Button>
                  ) : null}
                  {index < slides.length - 1 ? (
                    <Button
                      className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                      onClick={() => setIndex((current) => current + 1)}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      className="rounded-full bg-rose-600 text-white hover:bg-rose-500"
                      onClick={dismiss}
                    >
                      Done
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
