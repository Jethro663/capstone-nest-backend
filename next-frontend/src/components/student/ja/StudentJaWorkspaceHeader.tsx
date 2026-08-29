"use client";

import Link from "next/link";
import type { RefObject } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JaVisibleMode } from "@/components/student/ja/StudentJaActivityRail";

interface JaHeaderClass {
  id: string;
  subjectName: string;
  subjectCode: string;
}

interface StudentJaWorkspaceHeaderProps {
  classes: JaHeaderClass[];
  selectedClassId: string;
  selectedClassLabel: string;
  classSelectorOpen: boolean;
  classMenuOpen: boolean;
  classMenuRef?: RefObject<HTMLDivElement | null>;
  aiUnavailable: boolean;
  mode: JaVisibleMode;
  busy: boolean;
  returnTo?: string;
  backLabel: string;
  isContextualEntry: boolean;
  onToggleClassMenu: () => void;
  onSelectClass: (classId: string) => void;
  onOpenGuide: () => void;
  onStartNewChat: () => void;
  onEnableClassSelector: () => void;
}

function formatClassLabel(item: JaHeaderClass) {
  return `${item.subjectName} (${item.subjectCode})`;
}

export function StudentJaWorkspaceHeader({
  classes,
  selectedClassId,
  selectedClassLabel,
  classSelectorOpen,
  classMenuOpen,
  classMenuRef,
  aiUnavailable,
  mode,
  busy,
  returnTo,
  backLabel,
  isContextualEntry,
  onToggleClassMenu,
  onSelectClass,
  onOpenGuide,
  onStartNewChat,
  onEnableClassSelector,
}: StudentJaWorkspaceHeaderProps) {
  return (
    <div className="ja-topbar ja-main-header">
      <div className="ja-topbar__leading">
        {classSelectorOpen ? (
          <div className="ja-class-menu" ref={classMenuRef}>
            <button
              type="button"
              className="ja-class-menu__trigger"
              aria-label="Class selector"
              aria-haspopup="listbox"
              aria-expanded={classMenuOpen}
              onClick={onToggleClassMenu}
            >
              <span>{selectedClassLabel}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {classMenuOpen ? (
              <div
                className="ja-class-menu__popover"
                role="listbox"
                aria-label="Class options"
              >
                {classes.map((item) => {
                  const isSelected = item.id === selectedClassId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className="ja-class-menu__option"
                      onClick={() => onSelectClass(item.id)}
                    >
                      <span>{formatClassLabel(item)}</span>
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="ja-class-label-static">{selectedClassLabel}</span>
        )}
        {aiUnavailable ? (
          <span className="ja-ai-offline-pill">AI offline</span>
        ) : null}
      </div>

      <div className="ja-topbar__actions">
        <button
          type="button"
          className="ja-head-link ja-guide-trigger"
          onClick={onOpenGuide}
        >
          <CircleHelp className="h-4 w-4" />
          JA guide
        </button>
        {mode === "ask" ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy || aiUnavailable}
            className="ja-head-link ja-new-chat-button"
            onClick={onStartNewChat}
          >
            <Sparkles className="h-4 w-4" />
            New chat
          </Button>
        ) : null}
        {returnTo ? (
          <Link href={returnTo} className="ja-head-link">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        ) : null}
        {!classSelectorOpen ? (
          <>
            <span className="ja-class-lock">Using this class</span>
            {isContextualEntry ? (
              <button
                type="button"
                className="ja-head-link"
                onClick={onEnableClassSelector}
              >
                Change class
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
