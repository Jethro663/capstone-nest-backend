"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function StudentTutorLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const isStudentRoute = pathname.startsWith("/dashboard/student");
  const isJaPage = pathname.startsWith("/dashboard/student/ja");

  useEffect(() => {
    if (!expanded) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!containerRef.current?.contains(target)) {
        setExpanded(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  if (!isStudentRoute || isJaPage) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`student-tutor-launcher${expanded ? " is-expanded" : ""}`}
    >
      {expanded ? (
        <div
          className="student-tutor-launcher__panel"
          role="dialog"
          aria-label="AI Tutor launcher"
        >
          <div className="student-tutor-launcher__panel-head">
            <span>
              <Sparkles className="h-3.5 w-3.5" />
              AI Tutor
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close AI tutor launcher"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p>Continue with Ja</p>
          <button
            type="button"
            className="student-tutor-launcher__open"
            onClick={() => router.push("/dashboard/student/ja")}
          >
            <MessageCircle className="h-4 w-4" />
            Open JA
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="student-tutor-launcher__bubble"
        onClick={() => setExpanded((value) => !value)}
        aria-label={
          expanded ? "Collapse AI tutor launcher" : "Expand AI tutor launcher"
        }
      >
        <span className="student-tutor-launcher__ring" aria-hidden="true" />
        <span className="student-tutor-launcher__robot">
          <Bot className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
}
