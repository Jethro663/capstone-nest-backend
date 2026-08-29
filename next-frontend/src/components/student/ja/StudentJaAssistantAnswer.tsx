"use client";

import { BookOpen } from "lucide-react";
import { RichTextRenderer } from "@/components/shared/rich-text/RichTextRenderer";
import { StudentStatusChip } from "@/components/student/student-primitives";
import { normalizeRichText } from "@/lib/rich-text";
import type { JaAskMessage } from "@/types/ja";
import { cn } from "@/utils/cn";

export interface StudentJaAnswerAction {
  id: string;
  label: string;
}

interface StudentJaAssistantAnswerProps {
  message: JaAskMessage;
  actions: StudentJaAnswerAction[];
  disabled: boolean;
  onAction: (action: StudentJaAnswerAction) => void;
}

type JaAssistantTone = "grounded" | "thin-evidence" | "guarded";

const THIN_EVIDENCE_PATTERN =
  /i do not have enough readable class evidence|i cannot answer that confidently|pick one visible lesson|avoids filling gaps with unsupported guesses|would rather be explicit about weak evidence/i;

function getTone(message: JaAskMessage): JaAssistantTone {
  if (message.blocked) return "guarded";
  if (
    message.insufficientEvidence ||
    THIN_EVIDENCE_PATTERN.test(message.content)
  ) {
    return "thin-evidence";
  }
  return "grounded";
}

function getToneMeta(tone: JaAssistantTone) {
  if (tone === "guarded") {
    return {
      chipTone: "warning" as const,
      label: "Guarded",
      subtitle: "Safety first",
    };
  }
  if (tone === "thin-evidence") {
    return {
      chipTone: "info" as const,
      label: "Limited evidence",
      subtitle: "Needs clearer class material",
    };
  }
  return {
    chipTone: "success" as const,
    label: "Grounded",
    subtitle: "Based on your class",
  };
}

function readCitationValue(
  citation: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = citation[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function formatCitationSource(sourceType: string) {
  return sourceType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeAssistantContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes('"html"')) {
    return normalizeRichText(content);
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return normalizeRichText(content);
    }

    const record = parsed as Record<string, unknown>;
    const heading = typeof record.heading === "string" ? record.heading.trim() : "";
    const html = typeof record.html === "string" ? record.html.trim() : "";
    if (!heading && !html) return normalizeRichText(content);

    return normalizeRichText(
      `${heading ? `<h3>${escapeHtml(heading)}</h3>` : ""}${html}`,
    );
  } catch {
    return normalizeRichText(content);
  }
}

export function StudentJaAssistantAnswer({
  message,
  actions,
  disabled,
  onAction,
}: StudentJaAssistantAnswerProps) {
  const tone = getTone(message);
  const toneMeta = getToneMeta(tone);
  const citations = Array.isArray(message.citations) ? message.citations : [];

  return (
    <div
      className={cn(
        "ja-bubble ja ja-answer-surface",
        tone === "grounded" && "ja-bubble--grounded",
        tone === "thin-evidence" && "ja-bubble--thin-evidence",
        tone === "guarded" && "ja-bubble--guarded",
        message.blocked && "notice",
      )}
    >
      <div className="ja-bubble__meta">
        <div className="ja-bubble__speaker">
          <span>JA</span>
          <small>{toneMeta.subtitle}</small>
        </div>
        <StudentStatusChip tone={toneMeta.chipTone}>
          {toneMeta.label}
        </StudentStatusChip>
      </div>

      <RichTextRenderer
        html={normalizeAssistantContent(message.content)}
        className="ja-bubble__content"
      />

      {citations.length > 0 ? (
        <div className="ja-bubble__evidence">
          <div className="ja-bubble__evidence-head">
            <BookOpen className="h-4 w-4" />
            <span>From your class</span>
          </div>
          <div className="ja-bubble__evidence-list">
            {citations.map((entry, index) => {
              const citation =
                entry && typeof entry === "object"
                  ? (entry as Record<string, unknown>)
                  : {};
              const label = readCitationValue(citation, [
                "label",
                "lessonTitle",
                "assessmentTitle",
                "title",
              ]);
              const snippet = readCitationValue(citation, [
                "snippet",
                "chunkText",
              ]);
              const sourceType = readCitationValue(citation, ["sourceType"]);

              return (
                <article
                  key={`${message.id}-citation-${index}`}
                  className="ja-evidence-card"
                >
                  <strong>{label || "Class material"}</strong>
                  {snippet ? <p>{snippet}</p> : null}
                  {sourceType ? (
                    <span>{formatCitationSource(sourceType)}</span>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="ja-bubble__actions" aria-label="Suggested follow-ups">
          {actions.map((action) => (
            <button
              key={`${message.id}-${action.id}`}
              type="button"
              className="ja-bubble__action"
              onClick={() => onAction(action)}
              disabled={disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
