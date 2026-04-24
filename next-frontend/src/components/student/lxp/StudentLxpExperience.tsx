"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Flame,
  Map,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentJaWorkspace from "@/components/student/ja/StudentJaWorkspace";
import {
  StudentPageShell,
  StudentPageStat,
  StudentSectionCard,
} from "@/components/student/StudentPageShell";
import {
  StudentEmptyState,
  StudentStatusChip,
} from "@/components/student/student-primitives";
import { lxpService } from "@/services/lxp-service";
import type {
  EligibleClass,
  LxpCheckpoint,
  LxpOverviewAssessmentItem,
  LxpOverviewResponse,
  LxpOverviewSubjectMasteryRow,
  LxpOverviewWeakFocusItem,
  PlaylistResponse,
} from "@/types/lxp";
import { cn } from "@/utils/cn";

type LxpTabKey =
  | "overview"
  | "roadmap"
  | "assessments"
  | "interventions"
  | "ja";

const TABS: Array<{ value: LxpTabKey; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "roadmap", label: "Assigned Steps" },
  { value: "assessments", label: "Replays" },
  { value: "interventions", label: "Case File" },
  { value: "ja", label: "JA Hub" },
];

function parseTabValue(value: string | null): LxpTabKey {
  if (value === "overview") return "overview";
  if (value === "roadmap") return "roadmap";
  if (value === "assessments") return "assessments";
  if (value === "interventions") return "interventions";
  if (value === "ja") return "ja";
  return "overview";
}

function parseJaMode(value: string | null): "practice" | "ask" | "review" {
  if (value === "ask") return "ask";
  if (value === "review") return "review";
  return "practice";
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "No date set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date set";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "Just now";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Just now";
  const diffHours = Math.floor((Date.now() - timestamp) / 3_600_000);
  if (diffHours <= 0) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function classLabel(item: EligibleClass): string {
  return `${item.class.subjectName} (${item.class.subjectCode})`;
}

function checkpointHref(checkpoint: LxpCheckpoint, classId?: string): string {
  if (checkpoint.lesson?.id)
    return `/dashboard/student/lessons/${checkpoint.lesson.id}`;
  if (checkpoint.assessment?.id && classId) {
    const params = new URLSearchParams({
      tab: "ja",
      mode: "review",
      classId,
    });
    return `/dashboard/student/lxp?${params.toString()}`;
  }
  if (checkpoint.assessment?.id) return "/dashboard/student/lxp?tab=ja&mode=review";
  return "/dashboard/student/lxp?tab=ja";
}

function checkpointProvenance(checkpoint: LxpCheckpoint): string {
  return checkpoint.type === "lesson_review"
    ? "LMS lesson source"
    : "LMS assessment source via JA Hub";
}

function checkpointSummary(checkpoint: LxpCheckpoint): string {
  if (checkpoint.lesson?.description) return checkpoint.lesson.description;
  if (checkpoint.assessment?.description)
    return checkpoint.assessment.description;
  return checkpoint.type === "lesson_review"
    ? "Review the lesson material connected to this intervention checkpoint."
    : "Retry the linked assessment checkpoint and recover your standing.";
}

function checkpointTone(
  status: LxpOverviewResponse["interventionStatus"]["code"],
) {
  if (status === "on_track") return "success" as const;
  if (status === "improving") return "warning" as const;
  return "danger" as const;
}

function masteryTone(status: LxpOverviewSubjectMasteryRow["status"]) {
  if (status === "on_track") return "success" as const;
  if (status === "improving") return "warning" as const;
  return "danger" as const;
}

function weakFocusLabel(item: LxpOverviewWeakFocusItem): string {
  return item.source === "performance"
    ? "Performance signal"
    : "Checkpoint signal";
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-[1.8rem]" />
      <div className="grid gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[1.5rem]" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-[1.4rem]" />
      <Skeleton className="h-[36rem] rounded-[1.8rem]" />
    </div>
  );
}

function MiniInsightCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <div className="student-dashboard-mini-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="student-dashboard-mini-card__icon flex items-center justify-center rounded-2xl bg-[var(--student-accent-soft)] text-[var(--student-accent)]">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-xl font-black text-[var(--student-text-strong)]">
            {value}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--student-text-muted)]">{caption}</p>
    </div>
  );
}

function AssessmentRow({ item }: { item: LxpOverviewAssessmentItem }) {
  return (
    <Link href={item.href} className="student-dashboard-list-card group">
      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
        <ClipboardList className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[var(--student-text-strong)]">
          {item.title}
        </p>
        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
          Due {formatDate(item.dueDate)} · Passing {item.passingScore ?? "--"}%
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge className="student-badge">+{item.xpAwarded} XP</Badge>
        <ChevronRight className="h-4 w-4 text-[var(--student-text-muted)] transition group-hover:text-[var(--student-accent)]" />
      </div>
    </Link>
  );
}

function CompactEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="student-dashboard-empty student-dashboard-empty--compact">
      <div className="rounded-2xl bg-[var(--student-accent-soft)] p-3 text-[var(--student-accent)]">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-black text-[var(--student-text-strong)]">
          {title}
        </p>
        <p className="mt-2 text-sm text-[var(--student-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function PathStageCard({
  step,
  title,
  description,
  state,
}: {
  step: string;
  title: string;
  description: string;
  state: "done" | "active" | "waiting";
}) {
  return (
    <div className="learners-path-stage-card" data-state={state}>
      <div className="flex items-start justify-between gap-3">
        <span className="learners-path-stage-card__step">{step}</span>
        <StudentStatusChip
          tone={
            state === "done"
              ? "success"
              : state === "active"
                ? "warning"
                : "info"
          }
        >
          {state === "done"
            ? "Done"
            : state === "active"
              ? "Do now"
              : "Waiting"}
        </StudentStatusChip>
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="text-base font-black text-[var(--student-text-strong)]">
          {title}
        </h3>
        <p className="text-sm leading-6 text-[var(--student-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function StudentLxpExperience() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<LxpTabKey>(() =>
    parseTabValue(searchParams.get("tab")),
  );
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [loadingExperience, setLoadingExperience] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eligibleClasses, setEligibleClasses] = useState<EligibleClass[]>([]);
  const [threshold, setThreshold] = useState(74);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [overview, setOverview] = useState<LxpOverviewResponse | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const selectedClass = useMemo(
    () =>
      eligibleClasses.find((entry) => entry.classId === selectedClassId) ??
      null,
    [eligibleClasses, selectedClassId],
  );

  const fetchEligibility = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoadingEligibility(true);
      }

      const res = await lxpService.getEligibility();
      const rows = res.data.eligibleClasses ?? [];
      setThreshold(res.data.threshold);
      setEligibleClasses(rows);
      setSelectedClassId((prev) => {
        if (prev && rows.some((item) => item.classId === prev)) return prev;
        return rows[0]?.classId ?? "";
      });
    } catch {
      toast.error("Failed to load your Learners Path classes.");
      setEligibleClasses([]);
      setSelectedClassId("");
    } finally {
      setLoadingEligibility(false);
      setRefreshing(false);
    }
  }, []);

  const fetchExperience = useCallback(async (classId: string) => {
    if (!classId) {
      setOverview(null);
      setPlaylist(null);
      return;
    }

    try {
      setLoadingExperience(true);
      const [overviewRes, playlistRes] = await Promise.all([
        lxpService.getOverview(classId),
        lxpService.getPlaylist(classId),
      ]);
      setOverview(overviewRes.data);
      setPlaylist(playlistRes.data);
    } catch {
      toast.error("Failed to load Learners Path for this class.");
      setOverview(null);
      setPlaylist(null);
    } finally {
      setLoadingExperience(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  useEffect(() => {
    if (selectedClassId) {
      fetchExperience(selectedClassId);
    }
  }, [fetchExperience, selectedClassId]);

  const handleRefresh = async () => {
    await fetchEligibility(true);
    if (selectedClassId) {
      await fetchExperience(selectedClassId);
    }
  };

  const handleCompleteCheckpoint = async (assignmentId: string) => {
    if (!selectedClassId) return;

    try {
      setCompletingId(assignmentId);
      const res = await lxpService.completeCheckpoint(
        selectedClassId,
        assignmentId,
      );
      setPlaylist(res.data);
      const overviewRes = await lxpService.getOverview(selectedClassId);
      setOverview(overviewRes.data);
      toast.success("Checkpoint completed.");
    } catch {
      toast.error("Failed to complete the checkpoint.");
    } finally {
      setCompletingId(null);
    }
  };

  const assessmentCheckpoints = useMemo(
    () =>
      (playlist?.checkpoints ?? []).filter(
        (checkpoint) => checkpoint.type === "assessment_retry",
      ),
    [playlist?.checkpoints],
  );

  const lessonCheckpoints = useMemo(
    () =>
      (playlist?.checkpoints ?? []).filter(
        (checkpoint) => checkpoint.type === "lesson_review",
      ),
    [playlist?.checkpoints],
  );

  const nextCheckpoint = useMemo(
    () =>
      (playlist?.checkpoints ?? []).find((checkpoint) => !checkpoint.isCompleted) ??
      null,
    [playlist?.checkpoints],
  );

  const planStages = useMemo(
    () => [
      {
        step: "01",
        title: "Review the assigned lesson",
        description:
          lessonCheckpoints.length > 0
            ? `${lessonCheckpoints.length} lesson review step${lessonCheckpoints.length === 1 ? "" : "s"} assigned. Start here so the replay makes sense.`
            : "Your teacher has not assigned a lesson review yet.",
        state: lessonCheckpoints.length
          ? lessonCheckpoints.every((checkpoint) => checkpoint.isCompleted)
            ? ("done" as const)
            : ("active" as const)
          : ("waiting" as const),
      },
      {
        step: "02",
        title: "Replay the assessment in JA Hub",
        description:
          assessmentCheckpoints.length > 0
            ? `${assessmentCheckpoints.length} replay checkpoint${assessmentCheckpoints.length === 1 ? "" : "s"} available. Finish them in JA Hub after the lesson review.`
            : "Assessment replay opens once a retry checkpoint is assigned.",
        state: assessmentCheckpoints.length
          ? assessmentCheckpoints.every((checkpoint) => checkpoint.isCompleted)
            ? ("done" as const)
            : lessonCheckpoints.length > 0 &&
                lessonCheckpoints.every((checkpoint) => checkpoint.isCompleted)
              ? ("active" as const)
              : ("waiting" as const)
          : ("waiting" as const),
      },
      {
        step: "03",
        title: "Exit the recovery track",
        description:
          nextCheckpoint === null
            ? "All assigned steps are done. Your next grade sync can close this case automatically."
            : "Keep finishing the assigned checkpoints until your case is ready to close.",
        state:
          nextCheckpoint === null
            ? ("done" as const)
            : assessmentCheckpoints.length > 0 ||
                lessonCheckpoints.length > 0
              ? ("waiting" as const)
              : ("active" as const),
      },
    ],
    [assessmentCheckpoints, lessonCheckpoints, nextCheckpoint],
  );

  if (
    loadingEligibility ||
    (selectedClassId && loadingExperience && !overview && !playlist)
  ) {
    return <PageSkeleton />;
  }

  if (eligibleClasses.length === 0) {
    return (
      <StudentPageShell
        className="lxp-shell"
        badge="Learners Path"
        title="Learners Path"
        description="When a class needs recovery support, this page turns the follow-up work into one guided plan with lessons, replays, and JA support."
      >
        <StudentEmptyState
          title="No active Learners Path classes right now"
          description={`Learners Path opens when your blended score drops below ${threshold}%. Once a class needs support, your dashboard will surface it here.`}
          icon={<Sparkles className="h-5 w-5" />}
        />
      </StudentPageShell>
    );
  }

  if (!overview || !playlist) {
    return (
      <StudentPageShell
        className="lxp-shell"
        badge="Learners Path"
        title="Learners Path"
        description="We could not load the guided recovery plan for the selected class."
      >
        <StudentEmptyState
          title="Learners Path data is temporarily unavailable"
          description="Try refreshing this page. If the problem persists, the selected class may still be synchronizing its latest performance data."
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </StudentPageShell>
    );
  }

  const statusTone = checkpointTone(overview.interventionStatus.code);
  const initialJaMode = parseJaMode(searchParams.get("mode"));
  const initialJaClassId =
    (searchParams.get("classId") ?? selectedClassId) || undefined;

  const handleTabChange = (value: string) => {
    setTab(parseTabValue(value));
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <StudentPageShell
        className="lxp-shell"
        badge="Learners Path"
        title="Learners Path"
        description="A guided recovery plan for the selected class. Follow the assigned lesson review, move into JA Hub replays, and track when the case is ready to close."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <TabsList className="student-tab-list h-auto flex-wrap justify-start">
              {TABS.map((entry) => (
                <TabsTrigger
                  key={entry.value}
                  value={entry.value}
                  className="student-tab lxp-tab-trigger px-4 py-2.5 text-sm font-bold"
                >
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="student-input lxp-class-select min-w-[240px] rounded-2xl border border-[var(--student-outline)] bg-[var(--student-elevated)] px-3 py-2 text-sm text-[var(--student-text-strong)]"
            >
              {eligibleClasses.map((entry) => (
                <option key={entry.classId} value={entry.classId}>
                  {classLabel(entry)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              className="lxp-action-button lxp-action-button--ghost rounded-2xl border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)]"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        }
        stats={
          <>
            <StudentPageStat
              label="Current Score"
              value={formatPercent(overview.selectedClass.blendedScore)}
              caption="Latest blended score for this class"
              icon={Target}
              accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
            />
            <StudentPageStat
              label="Target"
              value={`${overview.interventionStatus.thresholdApplied}%`}
              caption="Score needed to leave recovery"
              icon={Trophy}
              accent="bg-[var(--student-surface-soft)] text-[var(--student-text-strong)]"
            />
            <StudentPageStat
              label="Next Step"
              value={
                nextCheckpoint
                  ? nextCheckpoint.type === "lesson_review"
                    ? "Lesson review"
                    : "JA Hub replay"
                  : "Await sync"
              }
              caption={
                nextCheckpoint
                  ? nextCheckpoint.label
                  : "All assigned checkpoints are complete"
              }
              icon={Map}
              accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
            />
            <StudentPageStat
              label="Progress"
              value={`${overview.progress.completionPercent}%`}
              caption={`${overview.progress.checkpointsCompleted}/${overview.progress.totalCheckpoints} checkpoints done`}
              icon={CheckCircle2}
              accent="bg-[var(--student-surface-soft)] text-[var(--student-text-strong)]"
            />
          </>
        }
      >
        <TabsContent
          value="overview"
          forceMount
          hidden={tab !== "overview"}
          className="mt-0 space-y-6"
        >
          <StudentSectionCard
            title="How this plan works"
            description="Finish the work in order. The page keeps the current class, next step, and completion progress visible so you do not have to guess what happens next."
          >
            <div className="learners-path-stage-grid">
              {planStages.map((stage) => (
                <PathStageCard
                  key={stage.step}
                  step={stage.step}
                  title={stage.title}
                  description={stage.description}
                  state={stage.state}
                />
              ))}
            </div>
          </StudentSectionCard>

          <StudentSectionCard
            title={`${overview.selectedClass.subjectName} plan snapshot`}
            description="This summary shows why the case opened, what class is selected, and what the teacher expects you to finish next."
            action={
              <StudentStatusChip tone={statusTone}>
                {overview.interventionStatus.label}
              </StudentStatusChip>
            }
          >
            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="student-dashboard-progress-card rounded-[1.7rem] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="student-dashboard-hero-chip">
                      <Sparkles className="h-3.5 w-3.5" />
                      {overview.selectedClass.subjectCode}
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                        Selected Class
                      </p>
                      <h3 className="mt-2 text-3xl font-black tracking-tight text-[var(--student-text-strong)]">
                        {overview.selectedClass.subjectName}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--student-text-muted)]">
                        {selectedClass?.class.section?.name ??
                          overview.selectedClass.section?.name ??
                          "Section unavailable"}
                        {" | "}
                        Threshold {overview.interventionStatus.thresholdApplied}%
                      </p>
                    </div>
                  </div>
                  <div className="lxp-emboss-panel rounded-[1.4rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] px-4 py-3 text-right">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                      Blended Score
                    </p>
                    <p className="mt-2 text-2xl font-black text-[var(--student-text-strong)]">
                      {formatPercent(overview.selectedClass.blendedScore)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                      Last sync{" "}
                      {formatDateTime(overview.selectedClass.lastComputedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-[var(--student-text-muted)]">
                    <span>Assigned plan completion</span>
                    <span>{overview.progress.completionPercent}%</span>
                  </div>
                  <Progress
                    value={overview.progress.completionPercent}
                    className="student-progress-track h-3"
                    indicatorClassName="student-progress-fill"
                  />
                  <p className="text-sm text-[var(--student-text-muted)]">
                    {overview.interventionStatus.message}
                  </p>
                </div>

                {overview.recommendedAction ? (
                  <div className="mt-6 student-dashboard-task-card rounded-[1.5rem]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                          Do this next
                        </p>
                        <h4 className="text-lg font-black text-[var(--student-text-strong)]">
                          {overview.recommendedAction.title}
                        </h4>
                        <p className="text-sm text-[var(--student-text-muted)]">
                          {overview.recommendedAction.subtitle}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Badge className="student-badge">
                          +{overview.recommendedAction.xpAwarded} XP
                        </Badge>
                        {overview.recommendedAction.href ? (
                          <Button asChild className="rounded-2xl">
                            <Link href={overview.recommendedAction.href}>
                              Open
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4">
                <MiniInsightCard
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Opened"
                  value={formatDate(overview.interventionStatus.openedAt)}
                  caption="When this intervention track started"
                />
                <MiniInsightCard
                  icon={<ArrowRight className="h-4 w-4" />}
                  label="Next Checkpoint"
                  value={nextCheckpoint?.label ?? "All done"}
                  caption={
                    nextCheckpoint
                      ? nextCheckpoint.type === "lesson_review"
                        ? "Open the lesson and mark it complete here"
                        : "Finish this assessment replay in JA Hub"
                      : "All assigned work is complete for now"
                  }
                />
                <MiniInsightCard
                  icon={<Trophy className="h-4 w-4" />}
                  label="Last Activity"
                  value={timeAgo(overview.progress.lastActivityAt)}
                  caption="Most recent Learners Path activity"
                />
              </div>
            </div>
          </StudentSectionCard>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <StudentSectionCard
              title="Class Comparison"
              description="The closest live performance signals across your enrolled classes, so you can see where this case sits compared with your other subjects."
            >
              <div className="space-y-3">
                {overview.subjectMastery.map((row) => (
                  <div
                    key={row.classId}
                    className="student-dashboard-list-card"
                  >
                    <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-[var(--student-text-strong)]">
                          {row.subjectName}
                        </p>
                        <StudentStatusChip tone={masteryTone(row.status)}>
                          {row.status === "on_track"
                            ? "On track"
                            : row.status === "improving"
                              ? "Improving"
                              : "Needs support"}
                        </StudentStatusChip>
                      </div>
                      <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                        {row.subjectCode} · Threshold {row.thresholdApplied}%
                      </p>
                      <div className="mt-3">
                        <div className="student-dashboard-meter student-dashboard-meter--compact">
                          <div
                            className="student-dashboard-meter__fill"
                            style={{
                              width: `${Math.max(8, row.masteryPercent ?? 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[var(--student-text-strong)]">
                        {formatPercent(row.masteryPercent)}
                      </p>
                      <p className="text-xs text-[var(--student-text-muted)]">
                        {row.isSelected ? "Selected" : "Class"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </StudentSectionCard>

            <StudentSectionCard
              title="Focus Signals"
              description="The strongest weak areas currently surfaced from your latest grade and checkpoint signals."
            >
              <div className="space-y-3">
                {overview.weakFocusItems.length === 0 ? (
                  <CompactEmptyState
                    title="No weak-focus items right now"
                    description="Once your performance sync finds a subject or checkpoint below the target, it will appear here."
                  />
                ) : (
                  overview.weakFocusItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="student-dashboard-list-card group"
                    >
                      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                        <Target className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[var(--student-text-strong)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                          {item.subtitle}
                        </p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                          {weakFocusLabel(item)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--student-text-muted)] transition group-hover:text-[var(--student-accent)]" />
                    </Link>
                  ))
                )}
              </div>
            </StudentSectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <StudentSectionCard
              title="Upcoming Replays"
              description="Assessment retry checkpoints surfaced from your current Learners Path playlist."
            >
              <div className="space-y-3">
                {overview.upcomingAssessments.length === 0 ? (
                  <CompactEmptyState
                    title="No retry assessments queued"
                    description="Your current intervention work is focused on lesson review or already completed retries."
                  />
                ) : (
                  overview.upcomingAssessments.map((item) => (
                    <AssessmentRow key={item.assignmentId} item={item} />
                  ))
                )}
              </div>
            </StudentSectionCard>

            <StudentSectionCard
              title="Recent Activity"
              description="The latest Learners Path events and completed checkpoints tied to this class."
            >
              <div className="space-y-3">
                {overview.recentActivity.length === 0 ? (
                  <CompactEmptyState
                    title="No recent activity yet"
                    description="Your intervention timeline will start filling in as soon as you complete checkpoints."
                  />
                ) : (
                  overview.recentActivity.map((item) => (
                    <div key={item.id} className="student-dashboard-list-card">
                      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[var(--student-text-strong)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[var(--student-text-muted)]">
                          {timeAgo(item.occurredAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </StudentSectionCard>
          </div>
        </TabsContent>
        <TabsContent
          value="roadmap"
          forceMount
          hidden={tab !== "roadmap"}
          className="mt-0"
        >
          <StudentSectionCard
            title="Assigned Steps"
            description="Finish the steps from top to bottom. Lesson reviews can be marked complete here, while assessment replays must be completed in JA Hub."
            action={
              <Badge className="student-badge">
                {playlist.progress.checkpointsCompleted}/
                {playlist.checkpoints.length} completed
              </Badge>
            }
          >
            <div className="space-y-4">
              {playlist.checkpoints.length === 0 ? (
                <StudentEmptyState
                  title="No steps assigned yet"
                  description="Your teacher has not assigned Learners Path checkpoints for this class yet."
                  icon={<Map className="h-5 w-5" />}
                />
              ) : (
                playlist.checkpoints.map((checkpoint, index) => (
                  <div
                    key={checkpoint.id}
                    className="student-panel student-panel-hover lxp-emboss-panel rounded-[1.6rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="student-badge">
                            Step {index + 1}
                          </Badge>
                          <StudentStatusChip
                            tone={
                              checkpoint.isCompleted ? "success" : "warning"
                            }
                          >
                            {checkpoint.isCompleted
                              ? "Completed"
                              : "In progress"}
                          </StudentStatusChip>
                        </div>
                        <h3 className="text-lg font-black text-[var(--student-text-strong)]">
                          {checkpoint.label}
                        </h3>
                        <p className="max-w-3xl text-sm text-[var(--student-text-muted)]">
                          {checkpointSummary(checkpoint)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="student-badge">
                            {checkpoint.type === "lesson_review"
                              ? "Lesson Review"
                              : "Assessment Retry"}
                          </Badge>
                          <Badge className="student-badge">
                            {checkpointProvenance(checkpoint)}
                          </Badge>
                          <Badge className="student-badge">
                            +{checkpoint.xpAwarded} XP
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          asChild
                          variant="outline"
                          className="lxp-action-button lxp-action-button--ghost rounded-2xl"
                        >
                          <Link href={checkpointHref(checkpoint, selectedClassId)}>
                            {checkpoint.type === "lesson_review"
                              ? "Open Lesson"
                              : "Open JA Hub"}
                          </Link>
                        </Button>
                        {checkpoint.type === "lesson_review" ? (
                          <Button
                            type="button"
                            className="lxp-action-button lxp-action-button--solid rounded-2xl"
                            onClick={() =>
                              handleCompleteCheckpoint(checkpoint.id)
                            }
                            disabled={
                              checkpoint.isCompleted ||
                              completingId === checkpoint.id
                            }
                          >
                            {checkpoint.isCompleted
                              ? "Completed"
                              : completingId === checkpoint.id
                                ? "Saving..."
                                : "Mark Complete"}
                          </Button>
                        ) : (
                        <Badge className="student-badge">
                          {checkpoint.isCompleted
                            ? "Completed via JA"
                            : "Complete in JA Hub"}
                        </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </StudentSectionCard>
        </TabsContent>

        <TabsContent
          value="assessments"
          forceMount
          hidden={tab !== "assessments"}
          className="mt-0"
        >
          <StudentSectionCard
            title="Assessment Retry Queue"
            description="Assessment checkpoints pulled from your active Learners Path playlist, with due dates when the backend has them."
          >
            <div className="space-y-4">
              {assessmentCheckpoints.length === 0 ? (
                <StudentEmptyState
                  title="No assessment replays right now"
                  description="Your current recovery plan is focused on lessons, or you have already finished the required retry checkpoints."
                  icon={<ClipboardList className="h-5 w-5" />}
                />
              ) : (
                assessmentCheckpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.id}
                    className="student-dashboard-task-card rounded-[1.5rem]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="student-badge">
                            {checkpoint.assessment?.type ?? "assessment"}
                          </Badge>
                          <Badge className="student-badge">
                            {checkpointProvenance(checkpoint)}
                          </Badge>
                          <Badge className="student-badge">
                            +{checkpoint.xpAwarded} XP
                          </Badge>
                        </div>
                        <h3 className="text-lg font-black text-[var(--student-text-strong)]">
                          {checkpoint.assessment?.title ?? checkpoint.label}
                        </h3>
                        <p className="text-sm text-[var(--student-text-muted)]">
                          {checkpointSummary(checkpoint)}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--student-text-muted)]">
                          <span className="student-dashboard-task-date">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(checkpoint.assessment?.dueDate ?? null)}
                          </span>
                          <span className="student-dashboard-task-date">
                            Passing{" "}
                            {checkpoint.assessment?.passingScore ?? "--"}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          asChild
                          variant="outline"
                          className="lxp-action-button lxp-action-button--ghost rounded-2xl"
                        >
                          <Link href={checkpointHref(checkpoint, selectedClassId)}>
                            Open JA Hub
                          </Link>
                        </Button>
                        <Badge className="student-badge">
                          {checkpoint.isCompleted
                            ? "Completed via JA"
                            : "Complete in JA Hub"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </StudentSectionCard>
        </TabsContent>

        <TabsContent
          value="interventions"
          forceMount
          hidden={tab !== "interventions"}
          className="mt-0"
        >
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <StudentSectionCard
              title="Case Status"
              description="This tab keeps the operational details of your current recovery case visible without leaving Learners Path."
            >
              <div className="space-y-4">
                <div className="student-dashboard-task-card rounded-[1.5rem]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                        Current Case
                      </p>
                      <h3 className="mt-2 text-xl font-black text-[var(--student-text-strong)]">
                        {overview.interventionStatus.label}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--student-text-muted)]">
                        Trigger score{" "}
                        {formatPercent(
                          overview.interventionStatus.triggerScore,
                        )}{" "}
                        · Opened{" "}
                        {formatDateTime(overview.interventionStatus.openedAt)}
                      </p>
                    </div>
                    <StudentStatusChip tone={statusTone}>
                      {overview.interventionStatus.status}
                    </StudentStatusChip>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <MiniInsightCard
                    icon={<Target className="h-4 w-4" />}
                    label="Threshold"
                    value={`${overview.interventionStatus.thresholdApplied}%`}
                    caption="Target to exit intervention"
                  />
                  <MiniInsightCard
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Lesson Reviews"
                    value={lessonCheckpoints.length}
                    caption="Recovery lessons assigned"
                  />
                  <MiniInsightCard
                    icon={<ClipboardList className="h-4 w-4" />}
                    label="Assessment Retries"
                    value={assessmentCheckpoints.length}
                    caption="Assessment retries assigned"
                  />
                </div>

                <div className="lxp-emboss-panel rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                    How to finish this case
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--student-text-muted)]">
                    Start with the assigned lesson review, complete the replay in JA Hub,
                    and keep checking this page until every checkpoint is marked done.
                  </p>
                </div>
              </div>
            </StudentSectionCard>

            <StudentSectionCard
              title="Focus Queue"
              description="The strongest signals that still need attention in this class."
            >
              <div className="space-y-3">
                {overview.weakFocusItems.length === 0 ? (
                  <CompactEmptyState
                    title="Nothing queued"
                    description="You have no weak-focus placeholders for this class right now."
                  />
                ) : (
                  overview.weakFocusItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="student-dashboard-list-card"
                    >
                      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[var(--student-text-strong)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                          {item.subtitle}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--student-text-muted)]" />
                    </Link>
                  ))
                )}
              </div>
            </StudentSectionCard>
          </div>
        </TabsContent>

        <TabsContent
          value="ja"
          forceMount
          hidden={tab !== "ja"}
          className="mt-0"
        >
          <StudentSectionCard
            title="JA Hub"
            description="Practice, Ask, and Review stay inside Learners Path so you can finish the recovery flow without leaving this workspace."
          >
            <StudentJaWorkspace
              initialMode={initialJaMode}
              initialClassId={initialJaClassId}
            />
          </StudentSectionCard>
        </TabsContent>
      </StudentPageShell>
    </Tabs>
  );
}
