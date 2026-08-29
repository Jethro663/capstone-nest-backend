"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, MessageCircleQuestion, X } from "lucide-react";
import { StudentJaAssistantAnswer, type StudentJaAnswerAction } from "@/components/student/ja/StudentJaAssistantAnswer";
import { Button } from "@/components/ui/button";
import type { JaAskLessonContextSummary, JaAskMessage } from "@/types/ja";
import { cn } from "@/utils/cn";

export const JA_AVATAR_IMAGES = {
  default: "/images/JA/ja_wave.png",
  celebrate: "/images/JA/ja_cheer.png",
  guarded: "/images/JA/ja_sad.png",
  surprised: "/images/JA/ja_shock.png",
  thinking: "/images/JA/ja_thinking.png",
} as const;

interface JaAskPresetGroup {
  id: string;
  label: string;
  items: StudentJaAnswerAction[];
}

interface StudentJaAskPanelProps {
  reduceMotion: boolean;
  lessonContexts: JaAskLessonContextSummary[];
  selectedLessonContext: JaAskLessonContextSummary | null;
  guidelines: string[];
  messages: JaAskMessage[];
  presetGroups: JaAskPresetGroup[];
  inlineActions: StudentJaAnswerAction[];
  busy: boolean;
  aiUnavailable: boolean;
  error: string;
  menuOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  tailRef: RefObject<HTMLDivElement | null>;
  onSelectLesson: (context: JaAskLessonContextSummary) => void;
  onClearLesson: () => void;
  onToggleMenu: () => void;
  onPreset: (action: StudentJaAnswerAction) => void;
}

function buildLessonContextLabel(context: JaAskLessonContextSummary) {
  return [context.moduleTitle, context.sectionTitle].filter(Boolean).join(" / ");
}

function JaAssistantAvatar({
  mood = "default",
}: {
  mood?: keyof typeof JA_AVATAR_IMAGES;
}) {
  return (
    <span className="ja-msg-avatar ja-av" aria-hidden="true">
      <Image
        src={JA_AVATAR_IMAGES[mood]}
        alt=""
        width={40}
        height={40}
        className="ja-msg-avatar__image"
      />
    </span>
  );
}

export function StudentJaAskPanel({
  reduceMotion,
  lessonContexts,
  selectedLessonContext,
  guidelines,
  messages,
  presetGroups,
  inlineActions,
  busy,
  aiUnavailable,
  error,
  menuOpen,
  menuRef,
  tailRef,
  onSelectLesson,
  onClearLesson,
  onToggleMenu,
  onPreset,
}: StudentJaAskPanelProps) {
  return (
    <motion.div
      key="ask-stage"
      className="ja-thread-shell ja-chat-panel"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
      exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="ja-thread-messages" aria-live="polite">
        <article className="ja-msg-row ja ja-intro-row">
          <JaAssistantAvatar />
          <div className="ja-bubble ja ja-intro-bubble">
            <div className="ja-context-empty">
              <div className="ja-context-empty__copy">
                <p className="ja-eyebrow">Guided lesson help</p>
                <h3>Pick a visible lesson, then ask JA for help.</h3>
                <p>
                  JA uses the lesson you select to keep every explanation,
                  review, and study suggestion connected to your class.
                </p>
              </div>

              <div className="ja-context-picker" aria-label="Available lessons">
                {lessonContexts.length > 0 ? (
                  lessonContexts.map((context) => {
                    const isSelected =
                      selectedLessonContext?.lessonId === context.lessonId;
                    const contextLabel = buildLessonContextLabel(context);
                    return (
                      <button
                        key={context.lessonId}
                        type="button"
                        className={cn(
                          "ja-context-chip",
                          isSelected && "is-selected",
                        )}
                        disabled={aiUnavailable}
                        onClick={() => onSelectLesson(context)}
                      >
                        <BookOpen className="h-4 w-4" />
                        <span className="ja-context-chip__copy">
                          <strong>{context.title}</strong>
                          {contextLabel ? <span>{contextLabel}</span> : null}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="ja-context-empty__notice">
                    No visible lessons are available for JA Ask yet in this
                    class.
                  </div>
                )}
              </div>

              <div className="ja-guidelines">
                <p className="ja-guidelines__title">How to use JA Ask</p>
                <ul>
                  <li>Select one visible lesson first.</li>
                  <li>Use the question button to choose a fixed JA action.</li>
                  {guidelines.map((guideline) => (
                    <li key={guideline}>{guideline}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </article>

        {messages.map((message) => {
          const isStudentMessage = message.role === "student";
          const actions =
            !isStudentMessage && !message.blocked ? inlineActions : [];

          return (
            <article
              key={message.id}
              className={cn(
                "ja-msg-row",
                isStudentMessage ? "user" : "ja",
              )}
            >
              {isStudentMessage ? (
                <span className="ja-msg-avatar user-av" aria-hidden="true">
                  ME
                </span>
              ) : (
                <JaAssistantAvatar
                  mood={message.blocked ? "guarded" : "default"}
                />
              )}
              {isStudentMessage ? (
                <div className="ja-bubble user ja-bubble--student">
                  <p>{message.content}</p>
                </div>
              ) : (
                <StudentJaAssistantAnswer
                  message={message}
                  actions={actions}
                  disabled={busy || aiUnavailable}
                  onAction={onPreset}
                />
              )}
            </article>
          );
        })}

        {busy ? (
          <article className="ja-msg-row ja is-pending">
            <JaAssistantAvatar mood="thinking" />
            <div className="ja-bubble ja notice ja-bubble--pending">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking through your question and checking your class material…
            </div>
          </article>
        ) : null}
        <div ref={tailRef} />
      </div>

      {selectedLessonContext ? (
        <div className="ja-active-context" aria-live="polite">
          <div className="ja-active-context__copy">
            <span className="ja-active-context__label">Current lesson</span>
            <strong>{selectedLessonContext.title}</strong>
            {buildLessonContextLabel(selectedLessonContext) ? (
              <span>{buildLessonContextLabel(selectedLessonContext)}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="ja-active-context__clear"
            onClick={onClearLesson}
          >
            <X className="h-4 w-4" />
            Change lesson
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="ja-ask-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="ja-composer ja-ask-launcher" ref={menuRef}>
        {!selectedLessonContext ? (
          <p id="ja-ask-launcher-help" className="ja-ask-launcher__help">
            Select a lesson to choose a JA question
          </p>
        ) : null}
        <div
          className={cn("ja-ask-menu", menuOpen && "is-open")}
          role="dialog"
          aria-label="Ask JA actions"
          aria-hidden={!menuOpen}
        >
          {presetGroups.map((group) => (
            <section key={group.id} className="ja-ask-menu__group">
              <header className="ja-ask-menu__group-head">
                <strong>{group.label}</strong>
              </header>
              <div className="ja-ask-menu__items">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="ja-ask-menu__item"
                    disabled={aiUnavailable}
                    onClick={() => onPreset(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <Button
          type="button"
          disabled={busy || aiUnavailable || !selectedLessonContext}
          aria-describedby={
            selectedLessonContext ? undefined : "ja-ask-launcher-help"
          }
          className={cn(
            "student-button-solid ja-send-button ja-prompt-button",
            menuOpen && "is-open",
          )}
          onClick={onToggleMenu}
        >
          <MessageCircleQuestion className="h-4 w-4" />
          Choose a JA question
        </Button>
      </div>
    </motion.div>
  );
}
