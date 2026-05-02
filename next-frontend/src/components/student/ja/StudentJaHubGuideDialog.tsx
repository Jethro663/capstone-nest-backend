"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GuideScreen = "welcome" | "capabilities" | "limits" | "habits";

interface GuidePage {
  id: GuideScreen;
  kicker: string;
  title: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
  badge: string;
  steps: Array<{
    label: string;
    body: string;
  }>;
  reminder: string;
}

interface StudentJaHubGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GuidePinProps {
  children: string;
  lineSide: "left" | "right";
  lineWidth: string;
  style: CSSProperties;
}

const GUIDE_PAGES: GuidePage[] = [
  {
    id: "welcome",
    kicker: "Meet JA",
    title: "Before you use JA Hub",
    description:
      "JA is your class helper inside Nexora. It can explain lessons in a simpler way, help you review, and point you back to the class topic you are studying.",
    image: {
      src: "/images/JA/ja_wave.png",
      alt: "JA welcoming the student into the hub",
    },
    badge: "Start here",
    steps: [
      {
        label: "Pick your class first",
        body: "Use the class name at the top so JA knows which subject you need help with.",
      },
      {
        label: "Choose your lane",
        body: "Ask is for lesson help. Replay is for going back over mistakes from submitted work.",
      },
      {
        label: "Keep it simple",
        body: "Short, clear questions help JA answer faster and in a way that is easier to follow.",
      },
    ],
    reminder: "Best first move: choose a lesson, then ask JA to explain it in simpler words.",
  },
  {
    id: "capabilities",
    kicker: "What JA helps with",
    title: "What JA can do for you",
    description:
      "JA works best when you use it like a study buddy. It helps you understand what is already in your class instead of throwing random answers at you.",
    image: {
      src: "/images/JA/ja_thinking.png",
      alt: "JA thinking about the student's lesson",
    },
    badge: "Helpful moves",
    steps: [
      {
        label: "Explain a lesson",
        body: "Ask JA to break down a topic, summarize the main idea, or give a quick example.",
      },
      {
        label: "Help you review",
        body: "JA can quiz you, point out what to study next, and help you revisit weak spots.",
      },
      {
        label: "Stay on your class topic",
        body: "It follows the lesson or replay session you picked so the help stays connected to school work.",
      },
    ],
    reminder: "Think of JA as help for understanding, reviewing, and practicing your current lesson.",
  },
  {
    id: "limits",
    kicker: "Play fair",
    title: "What JA will not do",
    description:
      "JA is there to help you learn, not to do the work for you. If something feels like cheating, JA is supposed to stop there.",
    image: {
      src: "/images/JA/ja_sad.png",
      alt: "JA warning the student to use the hub fairly",
    },
    badge: "Important limits",
    steps: [
      {
        label: "No answer keys",
        body: "JA will not hand out direct answers for tests, quizzes, or anything that should be your own work.",
      },
      {
        label: "No random off-topic help",
        body: "If the request is far from your visible class lesson, JA may tell you to pick the right lesson first.",
      },
      {
        label: "No made-up promises",
        body: "If JA is not sure, it should say so instead of pretending it knows everything.",
      },
    ],
    reminder: "Use JA to learn the process, not to skip it.",
  },
  {
    id: "habits",
    kicker: "Use it well",
    title: "Do's and don'ts",
    description:
      "A few good habits make JA much more useful. These are the simple rules that help students from Grade 7 to Grade 10 get better answers and fewer dead ends.",
    image: {
      src: "/images/JA/ja_cheer.png",
      alt: "JA cheering the student on",
    },
    badge: "Quick rules",
    steps: [
      {
        label: "Do ask one lesson thing at a time",
        body: "Questions like 'Explain this lesson' or 'Quiz me on this topic' are easier for JA to handle well.",
      },
      {
        label: "Do use Replay after mistakes",
        body: "Replay is the better choice when you want to learn from an assessment you already submitted.",
      },
      {
        label: "Do not treat JA like the final answer",
        body: "Always compare with your lesson, teacher instructions, and class announcements when something important is due.",
      },
    ],
    reminder: "Good JA use means learn first, double-check second, submit your own work always.",
  },
];

function GuidePin({ children, lineSide, lineWidth, style }: GuidePinProps) {
  return (
    <em
      className="pointer-events-none absolute z-10 inline-flex items-center gap-1.5 rounded-full border border-[#9f1239] bg-white px-2.5 py-1 text-[0.62rem] font-black not-italic leading-none text-[#9f1239] shadow-[0_0.5rem_1rem_rgba(159,18,57,0.12)]"
      style={style}
    >
      <span className="h-[0.42rem] w-[0.42rem] rounded-full bg-[#e11d48]" />
      <span>{children}</span>
      <span
        className="absolute top-1/2 h-px -translate-y-1/2 bg-[#e11d48]"
        style={
          lineSide === "right"
            ? { left: "calc(100% - 0.05rem)", width: lineWidth }
            : { right: "calc(100% - 0.05rem)", width: lineWidth }
        }
      />
    </em>
  );
}

function StudentJaGuidePreview({ screen }: { screen: GuideScreen }) {
  return (
    <div
      className={`relative grid min-h-[11.25rem] content-start gap-2 overflow-hidden rounded-[1rem] border border-sky-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] px-3 pb-2.5 pt-9 shadow-inner ${screen}`}
      aria-label={`${screen} JA Hub guide preview`}
    >
      <div className="absolute inset-x-0 top-0 flex h-7 items-center gap-1 border-b border-sky-100 bg-white px-2.5">
        <span className="h-2 w-2 rounded-full bg-rose-300" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
      </div>

      <div className="grid gap-2 rounded-[1rem] border border-white/70 bg-white/80 p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <small className="block text-[0.62rem] font-black uppercase tracking-[0.14em] text-sky-600">
              JA Hub
            </small>
            <strong className="text-[0.82rem] font-black text-slate-900">Mathematics (MATH)</strong>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-sky-700">
            JA guide
          </span>
        </div>

        <div className="grid gap-1.5 rounded-[1rem] border border-sky-100 bg-[#f9fcff] p-2.5">
          <div className="flex gap-1.5">
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white">
              Ask
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-emerald-700">
              Replay
            </span>
          </div>
          <div className="grid gap-1.5">
            <span className="rounded-[0.85rem] border border-slate-200 bg-white px-2.5 py-1.5 text-[0.72rem] font-bold text-slate-700">
              Pick a lesson
            </span>
            <span className="rounded-[0.85rem] border border-slate-200 bg-white px-2.5 py-1.5 text-[0.72rem] font-bold text-slate-700">
              Ask JA about this lesson
            </span>
            <span className="rounded-[0.85rem] border border-slate-200 bg-white px-2.5 py-1.5 text-[0.72rem] font-bold text-slate-700">
              Review past weak spots
            </span>
          </div>
        </div>
      </div>

      {screen === "welcome" ? (
        <>
          <GuidePin lineSide="right" lineWidth="4.2rem" style={{ left: "0.75rem", top: "4.3rem" }}>
            Pick the right class
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="4.8rem" style={{ right: "0.75rem", top: "7.2rem" }}>
            Start with a lesson
          </GuidePin>
        </>
      ) : null}

      {screen === "capabilities" ? (
        <>
          <GuidePin lineSide="right" lineWidth="4rem" style={{ left: "0.75rem", top: "7rem" }}>
            Ask for help here
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="4rem" style={{ right: "0.75rem", bottom: "2.4rem" }}>
            Replay your weak spots
          </GuidePin>
        </>
      ) : null}

      {screen === "limits" ? (
        <>
          <GuidePin lineSide="right" lineWidth="4.6rem" style={{ left: "0.75rem", top: "7rem" }}>
            Stay on your class topic
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="4.2rem" style={{ right: "0.75rem", bottom: "2.4rem" }}>
            Not for answer keys
          </GuidePin>
        </>
      ) : null}

      {screen === "habits" ? (
        <>
          <GuidePin lineSide="right" lineWidth="4.4rem" style={{ left: "0.75rem", top: "7rem" }}>
            Ask one thing at a time
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="4rem" style={{ right: "0.75rem", top: "8.6rem" }}>
            Check your lesson too
          </GuidePin>
        </>
      ) : null}
    </div>
  );
}

export function StudentJaHubGuideDialog({
  open,
  onOpenChange,
}: StudentJaHubGuideDialogProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = GUIDE_PAGES[pageIndex] ?? GUIDE_PAGES[0];

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="student"
        className="max-h-[88vh] max-w-[min(90vw,680px)] overflow-hidden rounded-[1.2rem] border-0 p-0"
      >
        <div className="grid max-h-[88vh] bg-[var(--student-elevated)] md:grid-cols-[170px_minmax(0,1fr)]">
          <div className="relative flex min-h-[148px] flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,#1d4ed8_0%,#0f766e_100%)] px-3.5 py-3.5 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.24),_transparent_52%)]" />
            <div className="relative z-10 space-y-2">
              <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
                {page.badge}
              </span>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-[1.02rem] leading-tight text-white">
                  {page.title}
                </DialogTitle>
                <DialogDescription className="text-[0.76rem] leading-5 text-white/85">
                  {page.description}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="relative z-10 mt-2.5 flex items-end justify-between gap-2">
              <div className="space-y-1 text-xs text-white/85">
                <p className="font-semibold uppercase tracking-[0.14em]">
                  JA Hub guide
                </p>
                <p className="max-w-[6.75rem] text-[0.64rem] leading-4 text-white/80">
                  Quick help for students before they start asking or replaying.
                </p>
              </div>

              <div className="relative h-14 w-14 shrink-0">
                <Image
                  src={page.image.src}
                  alt={page.image.alt}
                  fill
                  className="object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.35)]"
                  sizes="56px"
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#fffdfd_0%,#f8fbff_100%)]">
            <div className="flex flex-col gap-2 border-b border-sky-100 px-3.5 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                    {page.kicker}
                  </p>
                  <p className="text-xs text-slate-500">
                    {pageIndex + 1} of {GUIDE_PAGES.length}
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-1.5">
                  {GUIDE_PAGES.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={`rounded-full border px-2 py-1 text-[0.62rem] font-semibold transition-colors ${
                        index === pageIndex
                          ? "border-sky-300 bg-sky-50 text-sky-700"
                          : "border-sky-100 bg-white text-slate-500 hover:border-sky-200 hover:text-slate-700"
                      }`}
                      onClick={() => setPageIndex(index)}
                    >
                      {entry.kicker}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
              <StudentJaGuidePreview screen={page.id} />

              <div className="space-y-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quick guide
                </p>
                {page.steps.map((step, index) => (
                  <div
                    key={`${page.id}-${step.label}`}
                    className="grid grid-cols-[auto_1fr] items-start gap-2 rounded-[0.9rem] border border-sky-100 bg-white px-2.5 py-2"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-[0.66rem] font-semibold text-sky-600">
                      0{index + 1}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-[0.84rem] font-bold text-slate-900">{step.label}</p>
                      <p className="text-[0.78rem] leading-4 text-slate-700">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[0.9rem] border border-amber-100 bg-amber-50/80 px-2.5 py-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Remember
                </p>
                <p className="mt-1 text-[0.78rem] leading-4 text-slate-700">
                  {page.reminder}
                </p>
              </div>
            </div>

            <DialogFooter className="border-t border-sky-100 px-3.5 py-2.5 sm:space-x-0">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  className="h-8 rounded-full border-sky-200 bg-white px-3 text-xs text-slate-600 hover:bg-sky-50"
                  onClick={() => onOpenChange(false)}
                >
                  Close guide
                </Button>

                <div className="flex items-center justify-end gap-2">
                  {pageIndex > 0 ? (
                    <Button
                      variant="outline"
                      className="h-8 rounded-full border-sky-200 bg-white px-3 text-xs hover:bg-sky-50"
                      onClick={() => setPageIndex((current) => current - 1)}
                    >
                      Previous guide page
                    </Button>
                  ) : null}
                  {pageIndex < GUIDE_PAGES.length - 1 ? (
                    <Button
                      className="h-8 rounded-full bg-slate-950 px-3 text-xs text-white hover:bg-slate-800"
                      onClick={() => setPageIndex((current) => current + 1)}
                    >
                      Next guide page
                    </Button>
                  ) : (
                    <Button
                      className="h-8 rounded-full bg-sky-600 px-3 text-xs text-white hover:bg-sky-500"
                      onClick={() => onOpenChange(false)}
                    >
                      Open JA Hub
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
