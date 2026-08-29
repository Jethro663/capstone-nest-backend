"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

type GuideScreen = "welcome" | "capabilities" | "limits" | "habits";

interface GuidePage {
  id: GuideScreen;
  kicker: string;
  title: string;
  description: string;
  image: { src: string; alt: string };
  badge: string;
  steps: Array<{ label: string; body: string }>;
  reminder: string;
}

interface StudentJaHubGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GUIDE_PAGES: GuidePage[] = [
  {
    id: "welcome",
    kicker: "Meet JA",
    title: "Before you use JA Hub",
    description:
      "JA is your class helper inside Nexora. It can explain lessons in a simpler way, help you review, and point you back to the class topic you are studying.",
    image: { src: "/images/JA/ja_wave.png", alt: "JA welcoming the student into the hub" },
    badge: "Start here",
    steps: [
      { label: "Pick your class first", body: "Use the class name at the top so JA knows which subject you need help with." },
      { label: "Choose your lane", body: "Ask is for lesson help. Replay is for going back over mistakes from submitted work." },
      { label: "Keep it simple", body: "Short, clear questions help JA answer faster and in a way that is easier to follow." },
    ],
    reminder: "Best first move: choose a lesson, then ask JA to explain it in simpler words.",
  },
  {
    id: "capabilities",
    kicker: "What JA helps with",
    title: "What JA can do for you",
    description:
      "JA works best when you use it like a study buddy. It helps you understand what is already in your class instead of throwing random answers at you.",
    image: { src: "/images/JA/ja_thinking.png", alt: "JA thinking about the student's lesson" },
    badge: "Helpful moves",
    steps: [
      { label: "Explain a lesson", body: "Ask JA to break down a topic, summarize the main idea, or give a quick example." },
      { label: "Help you review", body: "JA can quiz you, point out what to study next, and help you revisit weak spots." },
      { label: "Stay on your class topic", body: "It follows the lesson or replay session you picked so the help stays connected to school work." },
    ],
    reminder: "Think of JA as help for understanding, reviewing, and practicing your current lesson.",
  },
  {
    id: "limits",
    kicker: "Play fair",
    title: "What JA will not do",
    description:
      "JA is there to help you learn, not to do the work for you. If something feels like cheating, JA is supposed to stop there.",
    image: { src: "/images/JA/ja_sad.png", alt: "JA warning the student to use the hub fairly" },
    badge: "Important limits",
    steps: [
      { label: "No answer keys", body: "JA will not hand out direct answers for tests, quizzes, or anything that should be your own work." },
      { label: "No random off-topic help", body: "If the request is far from your visible class lesson, JA may tell you to pick the right lesson first." },
      { label: "No made-up promises", body: "If JA is not sure, it should say so instead of pretending it knows everything." },
    ],
    reminder: "Use JA to learn the process, not to skip it.",
  },
  {
    id: "habits",
    kicker: "Use it well",
    title: "Do's and don'ts",
    description:
      "A few good habits make JA much more useful. These are the simple rules that help students from Grade 7 to Grade 10 get better answers and fewer dead ends.",
    image: { src: "/images/JA/ja_cheer.png", alt: "JA cheering the student on" },
    badge: "Quick rules",
    steps: [
      { label: "Do ask one lesson thing at a time", body: "Questions like 'Explain this lesson' or 'Quiz me on this topic' are easier for JA to handle well." },
      { label: "Do use Replay after mistakes", body: "Replay is the better choice when you want to learn from an assessment you already submitted." },
      { label: "Do not treat JA like the final answer", body: "Always compare with your lesson, teacher instructions, and class announcements when something important is due." },
    ],
    reminder: "Good JA use means learn first, double-check second, submit your own work always.",
  },
];

export function StudentJaHubGuideDialog({ open, onOpenChange }: StudentJaHubGuideDialogProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = GUIDE_PAGES[pageIndex] ?? GUIDE_PAGES[0];

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="student" className="ja-guide-dialog max-h-[88vh] max-w-[min(92vw,680px)] overflow-hidden p-0">
        <div className="ja-guide-shell">
          <div className="ja-guide-summary">
            <div className="ja-guide-summary__copy">
              <span className="ja-guide-badge">{page.badge}</span>
              <DialogHeader className="space-y-2 text-left">
                <p className="ja-guide-kicker">{page.kicker}</p>
                <DialogTitle>{page.title}</DialogTitle>
                <DialogDescription>{page.description}</DialogDescription>
              </DialogHeader>
            </div>
            <Image src={page.image.src} alt={page.image.alt} width={104} height={104} className="ja-guide-image" />
          </div>

          <div className="ja-guide-tabs" role="tablist" aria-label="JA guide pages">
            {GUIDE_PAGES.map((entry, index) => (
              <button key={entry.id} type="button" role="tab" aria-selected={index === pageIndex} className={cn(index === pageIndex && "is-active")} onClick={() => setPageIndex(index)}>
                <span>{index + 1}</span>
                {entry.kicker}
              </button>
            ))}
          </div>

          <div className="ja-guide-body">
            <div className="ja-guide-steps">
              {page.steps.map((step) => (
                <article key={`${page.id}-${step.label}`}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <div>
                    <h3>{step.label}</h3>
                    <p>{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
            <aside className="ja-guide-reminder">
              <strong>Remember</strong>
              <p>{page.reminder}</p>
            </aside>
          </div>

          <DialogFooter className="ja-guide-footer">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close guide</Button>
            <div>
              {pageIndex > 0 ? (
                <Button variant="outline" onClick={() => setPageIndex((current) => current - 1)}>
                  <ArrowLeft className="h-4 w-4" /> Previous guide page
                </Button>
              ) : null}
              {pageIndex < GUIDE_PAGES.length - 1 ? (
                <Button onClick={() => setPageIndex((current) => current + 1)}>
                  Next guide page <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => onOpenChange(false)}>Open JA Hub</Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
