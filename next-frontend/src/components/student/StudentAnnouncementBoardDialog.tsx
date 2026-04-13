'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SchoolEvent } from '@/types/school-event';

interface StudentAnnouncementBoardDialogProps {
  events: SchoolEvent[];
  now?: Date;
  storageKey?: string;
}

interface AnnouncementSlide {
  id: string;
  label: string;
  title: string;
  body: string;
  details: string[];
}

const DEFAULT_STORAGE_KEY = 'nexora.student.announcement-board.dismissed';

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
      label: 'Student guide',
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
      label:
        event.eventType === 'holiday_break' ? 'Holiday break' : 'School event',
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
        className="max-w-[min(92vw,440px)] rounded-lg p-0"
      >
        <div className="overflow-hidden rounded-lg bg-white">
          <div className="border-b border-zinc-200 bg-zinc-950 px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
              {currentSlide.label}
            </p>
            <DialogHeader className="mt-2 text-left">
              <DialogTitle className="text-xl leading-tight text-white">
                {currentSlide.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-200">
                {currentSlide.body}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-5 py-5">
            {currentSlide.details.map((detail) => (
              <p
                key={detail}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
              >
                {detail}
              </p>
            ))}
          </div>

          <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4 sm:space-x-0">
            <Button variant="outline" className="rounded-md" onClick={dismiss}>
              Close
            </Button>
            {index < slides.length - 1 ? (
              <Button
                className="rounded-md bg-slate-950 text-white hover:bg-slate-800"
                onClick={() => setIndex((current) => current + 1)}
              >
                Next
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
