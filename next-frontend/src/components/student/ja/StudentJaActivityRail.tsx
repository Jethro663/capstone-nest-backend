"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Loader2,
  Menu,
  MessageCircleQuestion,
} from "lucide-react";
import { cn } from "@/utils/cn";

export type JaVisibleMode = "ask" | "review";
export type JaActivityFilter = "all" | JaVisibleMode;

export interface JaActivityItem {
  id: string;
  mode: JaVisibleMode;
  title: string;
  subtitle: string;
  classLabel: string;
  status: string;
  updatedAt: string;
}

export const JA_MODE_ORDER: JaVisibleMode[] = ["ask", "review"];

export const JA_MODE_META = {
  ask: {
    title: "Ask",
    subtitle: "Get help with a lesson using guided questions.",
    icon: MessageCircleQuestion,
    kicker: "Coach",
  },
  review: {
    title: "Replay",
    subtitle: "Practice again using mistakes from submitted work.",
    icon: CircleDot,
    kicker: "Replay",
  },
} satisfies Record<
  JaVisibleMode,
  {
    title: string;
    subtitle: string;
    icon: typeof MessageCircleQuestion;
    kicker: string;
  }
>;

interface StudentJaActivityRailProps {
  mode: JaVisibleMode;
  modeCount: Record<JaVisibleMode, number>;
  activityFilter: JaActivityFilter;
  activities: JaActivityItem[];
  activeActivityKey: string;
  showHome: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  historyLoading?: boolean;
  historyError?: string;
  onModeChange: (mode: JaVisibleMode) => void;
  onFilterChange: (filter: JaActivityFilter) => void;
  onToggleHistory: () => void;
  onSelectActivity: (item: JaActivityItem) => void;
  onPageChange?: (page: number) => void;
  onRetryHistory?: () => void;
}

export function StudentJaActivityRail({
  mode,
  modeCount,
  activityFilter,
  activities,
  activeActivityKey,
  showHome,
  pagination = {
    page: 1,
    limit: 8,
    total: activities.length,
    totalPages: activities.length > 0 ? 1 : 0,
    hasNext: false,
    hasPrevious: false,
  },
  historyLoading = false,
  historyError = "",
  onModeChange,
  onFilterChange,
  onToggleHistory,
  onSelectActivity,
  onPageChange = () => undefined,
  onRetryHistory = () => undefined,
}: StudentJaActivityRailProps) {
  return (
    <aside className="ja-mode-panel ja-sidebar">
      <div className="ja-mode-panel__head">
        <button
          type="button"
          className="ja-history-toggle"
          aria-label="Hide activity history"
          aria-expanded="true"
          onClick={onToggleHistory}
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <p className="ja-eyebrow">JA Hub</p>
          <h2>Activity history</h2>
        </div>
      </div>

      <div className="ja-mode-grid" role="tablist" aria-label="JA study modes">
        {JA_MODE_ORDER.map((modeKey) => {
          const details = JA_MODE_META[modeKey];
          const Icon = details.icon;
          const isActive = mode === modeKey;
          return (
            <button
              key={modeKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                "ja-mode-card",
                `mode-${modeKey}`,
                isActive && "active",
              )}
              onClick={() => onModeChange(modeKey)}
            >
              <span className="ja-mode-card__icon">
                <Icon />
              </span>
              <span className="ja-mode-card__copy">
                <strong>{details.title}</strong>
                <span>{details.subtitle}</span>
              </span>
              <span className="ja-mode-card__metric">
                {modeCount[modeKey]} {details.kicker}
              </span>
            </button>
          );
        })}
      </div>

      <div className="ja-activity-filters" aria-label="Activity filters">
        {(["all", ...JA_MODE_ORDER] as JaActivityFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            data-active={activityFilter === filter}
            onClick={() => onFilterChange(filter)}
          >
            {filter === "all" ? "All" : JA_MODE_META[filter].title}
          </button>
        ))}
      </div>

      <div
        className="ja-saved-list ja-activity-list"
        aria-live="polite"
        aria-busy={historyLoading}
      >
        {historyLoading ? (
          <span className="ja-inline-empty ja-history-loading" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading activity history…
          </span>
        ) : historyError ? (
          <div className="ja-history-error" role="alert">
            <span>{historyError}</span>
            <button type="button" onClick={onRetryHistory}>
              Retry history
            </button>
          </div>
        ) : activities.length === 0 ? (
          <span className="ja-inline-empty">
            No saved JA activity for this filter yet.
          </span>
        ) : (
          activities.map((item) => (
            <button
              key={`${item.mode}-${item.id}`}
              type="button"
              onClick={() => onSelectActivity(item)}
              className={cn(
                "ja-session-chip",
                activeActivityKey === `${item.mode}:${item.id}` &&
                  !showHome &&
                  "is-selected",
              )}
            >
              <span className="ja-session-chip__top">
                <span className={cn("ja-activity-tag", `mode-${item.mode}`)}>
                  {JA_MODE_META[item.mode].title}
                </span>
                <span className="ja-session-chip__stamp">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </span>
              <strong>{item.title}</strong>
              <span className="ja-session-chip__subtitle">{item.subtitle}</span>
              <span className="ja-session-chip__meta">
                <span>{item.classLabel}</span>
                <span>{item.status}</span>
              </span>
            </button>
          ))
        )}
      </div>

      {!historyLoading && !historyError && pagination.totalPages > 0 ? (
        <nav className="ja-history-pagination" aria-label="Activity history pages">
          <button
            type="button"
            aria-label="Previous history page"
            disabled={!pagination.hasPrevious}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span aria-live="polite">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            aria-label="Next history page"
            disabled={!pagination.hasNext}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </aside>
  );
}
