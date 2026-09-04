"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  CircleHelp,
  Crown,
  ExternalLink,
  Flame,
  Star,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { boundAcademicPercentage } from "@/lib/academic-score";
import { classService } from "@/services/class-service";
import { lxpService } from "@/services/lxp-service";
import type { ClassItem } from "@/types/class";
import type {
  LxpClassReport,
  TeacherInterventionAssignment,
  TeacherInterventionHistoryResponse,
  TeacherInterventionHistoryRow,
  TeacherInterventionQueueResponse,
} from "@/types/lxp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
} from "@/components/teacher/TeacherPageShell";
import { AiOutageNotice } from "@/components/student/AiOutageNotice";
import { useAiAvailability } from "@/hooks/use-ai-availability";
import { toast } from "sonner";

const LEADERBOARD_SCOPE_OPTIONS = [
  {
    key: "xp",
    label: "XP",
    icon: Flame,
    suffix: "XP",
    description: "XP earned from interventions",
  },
  {
    key: "streak",
    label: "Streak",
    icon: Star,
    suffix: "day streak",
    description: "Consecutive activity streak",
  },
  {
    key: "checkpoints",
    label: "Checkpoints",
    icon: Trophy,
    suffix: "checkpoints",
    description: "Completed learning checkpoints",
  },
] as const;

const LEADERBOARD_TIER_ICONS = {
  champion: Crown,
  challenger: Award,
  riser: TrendingUp,
  contender: Target,
} as const;

type LeaderboardScope = (typeof LEADERBOARD_SCOPE_OPTIONS)[number]["key"];
type LeaderboardTier = keyof typeof LEADERBOARD_TIER_ICONS;
type InterventionWorkspaceView = "queue" | "overview" | "history";
type InterventionsGuideScreen = "summary" | "queue" | "overview" | "detail";

const interventionsGuidePages: Array<{
  title: string;
  description: string;
  screen: InterventionsGuideScreen;
  steps: string[];
}> = [
  {
    title: "Start with the class filter",
    description:
      "Choose one class first. The page summary and all intervention data change based on the class you select.",
    screen: "summary",
    steps: [
      "Use the class selector on the right side of the header before reviewing students.",
      "Read the top summary numbers so you know how many active and completed cases the class already has.",
      "Stay on the Queue tab when you want to take action on students immediately.",
      "Move to Leaderboard and Outcomes only when you want to inspect progress trends and finished results.",
    ],
  },
  {
    title: "Work through the intervention queue",
    description:
      "The queue is the teacher action table. Each row tells you who is at risk, how far they are from the threshold, and what action you can take now.",
    screen: "queue",
    steps: [
      "Read the student name, status, trigger score, and current standing first.",
      "Use AI Plan when the student is eligible and you want to open the intervention plan workspace.",
      "Use Activate when a pending case should become an active intervention cycle.",
      "Use View to inspect details, or Resolve only when the case is already handled.",
    ],
  },
  {
    title: "Use leaderboard and outcomes carefully",
    description:
      "This section is for checking class patterns, not for replacing the queue. It helps you spot strong movers and open related cases quickly.",
    screen: "overview",
    steps: [
      "Switch to Leaderboard and Outcomes when you want a class-wide view.",
      "Change the leaderboard mode to compare XP, streak, or checkpoints.",
      "Click a learner row if you want to open the intervention detail for someone who already has a queue case.",
      "Read the outcomes table to see whether intervention cycles are active, completed, or improving.",
    ],
  },
  {
    title: "Open detail before making a final decision",
    description:
      "The student detail sheet is the safe place to review assignments, weak concepts, and performance context before you plan or resolve anything.",
    screen: "detail",
    steps: [
      "Use View from the queue to open the student detail panel on the right.",
      "Check assignments, weak concepts, and recent risk changes before acting.",
      "Use the performance link when you need the full student performance page.",
      "Open AI Plan from the queue when you are ready to build or replace the intervention path.",
    ],
  },
];

function InterventionsGuideScreenshot({
  screen,
}: {
  screen: InterventionsGuideScreen;
}) {
  return (
    <div
      className={`teacher-intervention-workspace__manual-shot teacher-interventions-page__manual-shot is-${screen}`}
      aria-label={`${screen} interventions example screenshot`}
    >
      <div className="teacher-intervention-workspace__manual-window">
        <span />
        <span />
        <span />
      </div>

      {screen === "summary" ? (
        <>
          <div className="teacher-interventions-page__manual-header-shot">
            <div className="teacher-interventions-page__manual-summary-shot">
              <div className="teacher-interventions-page__manual-metric-shot">
                <small>Active</small>
                <strong>2</strong>
              </div>
              <div className="teacher-interventions-page__manual-metric-shot">
                <small>Completed</small>
                <strong>8</strong>
              </div>
              <div className="teacher-interventions-page__manual-metric-shot">
                <small>Average Delta</small>
                <strong>+4.1%</strong>
              </div>
              <div className="teacher-interventions-page__manual-metric-shot">
                <small>Top XP</small>
                <strong>320</strong>
              </div>
            </div>
            <div className="teacher-intervention-workspace__manual-select-shot">
              <span>Math (MATH-7) - Rizal</span>
              <b>Class</b>
            </div>
          </div>
          <div className="teacher-interventions-page__manual-switcher-shot">
            <b>Queue</b>
            <span>Leaderboard &amp; Outcomes</span>
          </div>
          <div className="teacher-interventions-page__manual-table-shot">
            <div className="teacher-interventions-page__manual-table-row is-head">
              <strong>Student</strong>
              <strong>Status</strong>
              <strong>Actions</strong>
            </div>
            <div className="teacher-interventions-page__manual-table-row">
              <span>Navarro, Liam</span>
              <span className="teacher-interventions-page__manual-status-pill">
                pending
              </span>
              <div className="teacher-interventions-page__manual-action-pills">
                <span>View</span>
              </div>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin is-guide-select">
            Class filter
          </em>
          <em className="teacher-intervention-workspace__manual-pin is-guide-summary">
            Header summary
          </em>
        </>
      ) : null}

      {screen === "queue" ? (
        <>
          <div className="teacher-interventions-page__manual-switcher-shot">
            <b>Queue</b>
            <span>Leaderboard &amp; Outcomes</span>
          </div>
          <div className="teacher-interventions-page__manual-table-shot is-large">
            <div className="teacher-interventions-page__manual-table-row is-head">
              <strong>Student</strong>
              <strong>Trigger</strong>
              <strong>Actions</strong>
            </div>
            <div className="teacher-interventions-page__manual-table-row">
              <span>Navarro, Liam</span>
              <span>50.0%</span>
              <div className="teacher-interventions-page__manual-action-pills">
                <span>AI Plan</span>
                <span>Activate</span>
                <span>View</span>
                <span>Resolve</span>
              </div>
            </div>
            <div className="teacher-interventions-page__manual-table-row">
              <span>Reyes, Ana</span>
              <span>61.0%</span>
              <div className="teacher-interventions-page__manual-action-pills">
                <span>AI Plan</span>
                <span>View</span>
              </div>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin is-guide-ai-plan">
            AI Plan button
          </em>
          <em className="teacher-intervention-workspace__manual-pin is-guide-view">
            View and Resolve
          </em>
        </>
      ) : null}

      {screen === "overview" ? (
        <>
          <div className="teacher-interventions-page__manual-switcher-shot">
            <span>Queue</span>
            <b>Leaderboard &amp; Outcomes</b>
          </div>
          <div className="teacher-interventions-page__manual-mode-shot">
            <span>XP</span>
            <span>Streak</span>
            <span>Checkpoints</span>
          </div>
          <div className="teacher-interventions-page__manual-leaderboard-shot">
            <div className="teacher-interventions-page__manual-leaderboard-row">
              <strong>1</strong>
              <span>Navarro, Liam</span>
              <b>220 XP</b>
            </div>
            <div className="teacher-interventions-page__manual-leaderboard-row">
              <strong>2</strong>
              <span>Garcia, Kim</span>
              <b>180 XP</b>
            </div>
          </div>
          <div className="teacher-interventions-page__manual-outcomes-shot">
            <div className="teacher-interventions-page__manual-table-row is-head">
              <strong>Student</strong>
              <strong>Status</strong>
              <strong>Delta</strong>
            </div>
            <div className="teacher-interventions-page__manual-table-row">
              <span>Navarro, Liam</span>
              <span className="teacher-interventions-page__manual-status-pill is-active">
                active
              </span>
              <span>+6.0%</span>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin is-guide-overview">
            Leaderboard switch
          </em>
          <em className="teacher-intervention-workspace__manual-pin is-guide-row">
            Click learner row
          </em>
        </>
      ) : null}

      {screen === "detail" ? (
        <>
          <div className="teacher-interventions-page__manual-detail-shot">
            <div className="teacher-interventions-page__manual-detail-head">
              <strong>Intervention Student Detail</strong>
              <span>pending</span>
            </div>
            <div className="teacher-interventions-page__manual-detail-block">
              <small>Assignments</small>
              <p />
              <p />
            </div>
            <div className="teacher-interventions-page__manual-detail-block">
              <small>Weak concepts</small>
              <div>
                <span>Fractions</span>
                <span>Word Problems</span>
              </div>
            </div>
            <div className="teacher-interventions-page__manual-detail-actions">
              <span className="teacher-intervention-workspace__manual-button-shot">
                Open performance page
              </span>
              <span className="teacher-intervention-workspace__manual-button-shot">
                AI Plan
              </span>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin is-guide-detail">
            Student detail sheet
          </em>
          <em className="teacher-intervention-workspace__manual-pin is-guide-performance">
            Performance link
          </em>
        </>
      ) : null}
    </div>
  );
}

function studentName(entry: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = entry.firstName?.trim() ?? "";
  const last = entry.lastName?.trim() ?? "";
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return entry.email ?? "Unknown student";
}

function studentInitials(
  entry?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
): string {
  const first = entry?.firstName?.trim()?.[0] ?? "";
  const last = entry?.lastName?.trim()?.[0] ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  if (entry?.email?.trim()) return entry.email.trim().slice(0, 2).toUpperCase();
  return "ST";
}

function formatShortDate(value?: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCaseSeverity(
  triggerScore: number | null,
  threshold: number | null,
) {
  if (triggerScore === null || triggerScore === undefined) {
    return { label: "Monitoring", tone: "monitoring" as const };
  }
  if (threshold === null || threshold === undefined) {
    if (triggerScore <= 45)
      return { label: "Critical", tone: "critical" as const };
    if (triggerScore <= 65)
      return { label: "Needs Focus", tone: "focus" as const };
    return { label: "Monitoring", tone: "monitoring" as const };
  }
  const gap = threshold - triggerScore;
  if (gap >= 15) return { label: "Critical", tone: "critical" as const };
  if (gap >= 5) return { label: "Needs Focus", tone: "focus" as const };
  return { label: "Monitoring", tone: "monitoring" as const };
}

function formatPercent(value?: number | null): string {
  return value === null || value === undefined
    ? "--"
    : `${boundAcademicPercentage(value).toFixed(1)}%`;
}

function assignmentTypeLabel(type: TeacherInterventionAssignment["type"]) {
  if (type === "lesson_review") return "Lesson Review";
  if (type === "assessment_retry") return "Assessment Retry";
  if (type === "generated_lesson_review") return "Generated Lesson";
  return "Guided Assessment";
}

function assignmentContentTitle(assignment: TeacherInterventionAssignment) {
  return (
    assignment.lesson?.title ??
    assignment.assessment?.title ??
    assignment.generatedLesson?.title ??
    assignment.guidedAssessment?.title ??
    assignment.label
  );
}

type LeaderboardScoreRow = LxpClassReport["leaderboard"][number] & {
  score: number;
  scoreLabel: string;
  scoreHint: string;
  scorePercent: number;
  leaderDistanceLabel: string;
  tier: LeaderboardTier;
};

export default function TeacherInterventionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const aiAvailability = useAiAvailability();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [queue, setQueue] = useState<TeacherInterventionQueueResponse | null>(
    null,
  );
  const [report, setReport] = useState<LxpClassReport | null>(null);
  const [history, setHistory] =
    useState<TeacherInterventionHistoryResponse | null>(null);
  const [resolvingCaseId, setResolvingCaseId] = useState<string | null>(null);
  const [activatingCaseId, setActivatingCaseId] = useState<string | null>(null);
  const [regeneratingCaseId, setRegeneratingCaseId] = useState<string | null>(
    null,
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<
    Awaited<ReturnType<typeof lxpService.getTeacherCaseDetail>>["data"] | null
  >(null);
  const [selectedHistoryRow, setSelectedHistoryRow] =
    useState<TeacherInterventionHistoryRow | null>(null);
  const [workspaceView, setWorkspaceView] =
    useState<InterventionWorkspaceView>("queue");
  const [leaderboardScope, setLeaderboardScope] =
    useState<LeaderboardScope>("xp");
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [highlightedLeaderboardStudentId, setHighlightedLeaderboardStudentId] =
    useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  const aiUnavailable = aiAvailability.status === "degraded";
  const requestedClassId = searchParams.get("classId") ?? "";
  const thresholdLabel = report?.threshold ?? queue?.threshold ?? null;
  const queueEntries = useMemo(() => queue?.queue ?? [], [queue]);
  const historyRows = useMemo(() => history?.history ?? [], [history]);
  const historyScoreThreshold = history?.scoreThreshold ?? 60;
  const leaderboardRows = useMemo(() => report?.leaderboard ?? [], [report]);
  const leaderboardRowsByScope = useMemo(() => {
    const activeScope = leaderboardScope;
    const mapped = leaderboardRows.map((entry) => {
      const score =
        activeScope === "streak"
          ? entry.streakDays
          : activeScope === "checkpoints"
            ? entry.checkpointsCompleted
            : entry.xpTotal;
      const scoreHint =
        activeScope === "xp"
          ? `${entry.starsTotal} stars`
          : activeScope === "streak"
            ? `${entry.xpTotal} XP total`
            : `${entry.xpTotal} XP total`;
      const scoreLabel =
        activeScope === "streak"
          ? `${entry.streakDays} day streak`
          : activeScope === "checkpoints"
            ? `${entry.checkpointsCompleted} checkpoints`
            : `${entry.xpTotal} XP`;
      return {
        ...entry,
        score,
        scoreLabel,
        scoreHint,
      };
    });
    const sortedRows = mapped
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const maxScore = sortedRows.reduce(
      (top, entry) => Math.max(top, entry.score ?? 0),
      0,
    );
    return sortedRows.map((entry) => {
      const isLeader = entry.rank === 1;
      const distance =
        maxScore > 0 ? Math.max(Math.max(0, maxScore - entry.score), 0) : 0;
      const leaderDistanceLabel = isLeader
        ? "Top learner for selected metric"
        : `${distance} ${activeScope === "xp" ? "XP" : activeScope === "streak" ? "days" : "checkpoints"} behind #1`;
      const tier: LeaderboardTier = isLeader
        ? "champion"
        : entry.rank === 2
          ? "challenger"
          : entry.rank === 3
            ? "riser"
            : "contender";
      return {
        ...entry,
        scorePercent:
          maxScore > 0 ? Math.round((entry.score / maxScore) * 100) : 0,
        leaderDistanceLabel,
        tier,
      };
    });
  }, [leaderboardRows, leaderboardScope]);
  const activeLeaderboardRows = leaderboardExpanded
    ? leaderboardRowsByScope
    : leaderboardRowsByScope.slice(0, 5);
  const leaderboardMode = useMemo(() => {
    return (
      LEADERBOARD_SCOPE_OPTIONS.find(
        (entry) => entry.key === leaderboardScope,
      ) ?? LEADERBOARD_SCOPE_OPTIONS[0]
    );
  }, [leaderboardScope]);
  const queueCaseByStudent = useMemo(() => {
    const map = new Map<string, string>();
    queueEntries.forEach((entry) => {
      map.set(entry.student?.id ?? entry.studentId, entry.id);
    });
    return map;
  }, [queueEntries]);
  const fetchClassList = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingClasses(true);
      const response = await classService.getByTeacher(user.id);
      const rows = response.data ?? [];
      setClasses(rows);
      setSelectedClassId((current) => {
        if (current) return current;
        if (
          requestedClassId &&
          rows.some((entry) => entry.id === requestedClassId)
        ) {
          return requestedClassId;
        }
        return rows[0]?.id || "";
      });
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoadingClasses(false);
    }
  }, [requestedClassId, user?.id]);

  const fetchInterventionData = useCallback(async () => {
    if (!selectedClassId) {
      setQueue(null);
      setReport(null);
      setHistory(null);
      return;
    }
    try {
      setLoadingData(true);
      const [queueRes, reportRes, historyRes] = await Promise.all([
        lxpService.getTeacherQueue(selectedClassId),
        lxpService.getClassReport(selectedClassId),
        lxpService.getTeacherInterventionHistory(selectedClassId),
      ]);
      setQueue(queueRes.data);
      setReport(reportRes.data);
      setHistory(historyRes.data);
    } catch {
      toast.error("Failed to load intervention data");
      setQueue(null);
      setReport(null);
      setHistory(null);
    } finally {
      setLoadingData(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchClassList();
  }, [fetchClassList]);

  useEffect(() => {
    fetchInterventionData();
  }, [fetchInterventionData]);

  const handleResolve = async (caseId: string) => {
    try {
      setResolvingCaseId(caseId);
      await lxpService.resolveIntervention(caseId, "Resolved by teacher queue");
      toast.success("Intervention case resolved");
      await fetchInterventionData();
    } catch {
      toast.error("Failed to resolve intervention case");
    } finally {
      setResolvingCaseId(null);
    }
  };

  const handleRecommend = (caseId: string) => {
    if (aiUnavailable) return;
    const target = selectedClassId
      ? `/dashboard/teacher/interventions/${caseId}?classId=${selectedClassId}`
      : `/dashboard/teacher/interventions/${caseId}`;
    router.push(target);
  };

  const handleOpenDetail = async (caseId: string) => {
    setDetailOpen(true);
    setSelectedCaseId(caseId);
    setSelectedHistoryRow(null);
    setLoadingDetail(true);
    try {
      const detailRes = await lxpService.getTeacherCaseDetail(caseId);
      setSelectedCaseDetail(detailRes.data);
    } catch {
      toast.error("Failed to load intervention case detail");
      setSelectedCaseDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenHistoryDetail = (row: TeacherInterventionHistoryRow) => {
    setSelectedHistoryRow(row);
    setSelectedCaseDetail({
      ...row,
      progress: {
        xpTotal: 0,
        starsTotal: 0,
        streakDays: 0,
        checkpointsCompleted: row.completion.completedCheckpoints,
        lastActivityAt: row.closedAt,
      },
      generatedArtifacts: null,
      latestSnapshot: null,
      weakConcepts: [],
      recentRiskTransitions: [],
      links: { performancePage: "" },
    });
    setSelectedCaseId(row.id);
    setDetailOpen(true);
    setLoadingDetail(false);
  };

  const handleOpenPerformance = () => {
    if (!selectedCaseDetail?.links.performancePage) return;
    router.push(selectedCaseDetail.links.performancePage);
  };

  const handleActivate = async (caseId: string) => {
    try {
      setActivatingCaseId(caseId);
      await lxpService.activateIntervention(caseId);
      toast.success("Intervention case activated");
      await fetchInterventionData();
    } catch {
      toast.error("Failed to activate intervention case");
    } finally {
      setActivatingCaseId(null);
    }
  };

  const handleRegeneratePath = async (caseId: string) => {
    try {
      setRegeneratingCaseId(caseId);
      const result = await lxpService.regenerateInterventionPath(caseId);
      const targetCaseId = result.data.case.id;
      toast.success(
        result.data.reusedExisting
          ? "Existing intervention cycle opened"
          : "New intervention path created",
      );
      const target = selectedClassId
        ? `/dashboard/teacher/interventions/${targetCaseId}?classId=${selectedClassId}`
        : `/dashboard/teacher/interventions/${targetCaseId}`;
      router.push(target);
    } catch {
      toast.error("Failed to regenerate intervention path");
    } finally {
      setRegeneratingCaseId(null);
    }
  };

  const handleLeaderboardProfile = (row: LeaderboardScoreRow) => {
    const queueCaseId = queueCaseByStudent.get(row.studentId);
    setHighlightedLeaderboardStudentId(row.studentId);
    if (!queueCaseId) {
      toast.info(
        `${studentName(row.student ?? {})} has no active intervention case to open.`,
      );
      return;
    }
    void handleOpenDetail(queueCaseId);
  };

  const activeDetail = selectedHistoryRow ?? selectedCaseDetail;
  const activeDetailAssignments =
    selectedHistoryRow?.assignments ?? selectedCaseDetail?.assignments ?? [];
  const activeWeakConcepts = selectedCaseDetail?.weakConcepts ?? [];
  const activeRecentRiskTransitions =
    selectedCaseDetail?.recentRiskTransitions ?? [];
  const isHistoryDetail = Boolean(selectedHistoryRow);

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-[34rem] rounded-[15px]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Scholastic Oversight"
      title="Interventions"
      description={
        thresholdLabel !== null
          ? `Targeted intervention oversight for below-threshold learners. Current support threshold: ${thresholdLabel}%.`
          : "Targeted intervention oversight for learners who need grounded remedial support."
      }
      className="teacher-interventions-page"
      actions={
        <div className="teacher-interventions-header-tools">
          <dl
            className="teacher-interventions-header-summary"
            aria-label="Intervention summary"
          >
            <div>
              <dt>Active</dt>
              <dd>{report?.summary.activeCases ?? 0}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{report?.summary.completedCases ?? 0}</dd>
            </div>
            <div>
              <dt>Average Delta</dt>
              <dd>
                {report?.summary.averageDelta != null
                  ? `${report.summary.averageDelta.toFixed(2)}%`
                  : "--"}
              </dd>
            </div>
            <div>
              <dt>Top XP</dt>
              <dd>{leaderboardRows[0]?.xpTotal ?? 0}</dd>
            </div>
          </dl>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select teacher-interventions-page__class-select min-w-[260px] text-sm"
          >
            <option value="">Select class...</option>
            {classes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.subjectName} ({entry.subjectCode}) -{" "}
                {entry.section?.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="teacher-intervention-workspace__help"
            onClick={() => {
              setHelpPage(0);
              setHelpOpen(true);
            }}
            aria-label="Module help"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {aiUnavailable ? (
        <AiOutageNotice
          mode="teacher"
          message={aiAvailability.message}
          className="teacher-figma-stagger"
        />
      ) : null}

      {!selectedClassId ? (
        <TeacherSectionCard
          title="Pick a class first"
          description="Select a class to load queue and intervention outcomes."
          className="teacher-figma-stagger"
        >
          <TeacherEmptyState
            title="No class selected yet"
            description="Choose one class from the selector to review intervention queues."
          />
        </TeacherSectionCard>
      ) : null}

      {selectedClassId && loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-[20rem] rounded-[15px]" />
          <Skeleton className="h-[20rem] rounded-[15px]" />
        </div>
      ) : null}

      {selectedClassId && !loadingData ? (
        <>
          <TeacherSectionCard
            title="Targeted Triage"
            description="Review why a learner entered remediation before opening the intervention workspace."
            className="teacher-figma-stagger"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[#f3d7de] bg-[#fff7fa] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#b42358]">
                  Eligibility
                </p>
                <strong className="mt-2 block text-sm text-[var(--teacher-text-strong)]">
                  Targeted intervention queue for learners below the support
                  threshold
                </strong>
              </div>
              <div className="rounded-xl border border-[#dfe8f6] bg-[#f8fbff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3b5e8e]">
                  Grounding
                </p>
                <strong className="mt-2 block text-sm text-[var(--teacher-text-strong)]">
                  AI-assisted plans stay grounded on class-approved materials
                  and teacher review
                </strong>
              </div>
              <div className="rounded-xl border border-[#e5e1f1] bg-[#fbf9ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d4eb3]">
                  Use in grading
                </p>
                <strong className="mt-2 block text-sm text-[var(--teacher-text-strong)]">
                  Intervention outcomes remain formative support and do not
                  auto-mutate class records
                </strong>
              </div>
            </div>
          </TeacherSectionCard>

          <div className="teacher-interventions-page__layout teacher-figma-stagger">
            <TeacherSectionCard
              title={
                workspaceView === "queue"
                  ? "Priority Intervention Queue"
                  : workspaceView === "history"
                    ? "Intervention History"
                    : "XP Leaderboard"
              }
              description={
                workspaceView === "queue"
                  ? "Take action on at-risk learners, review the trigger basis, and open the remedial workspace."
                  : workspaceView === "history"
                    ? "Review completed Learners Path cycles, checkpoint contents, and formative path scores."
                    : "Track learner momentum and jump into active intervention cases."
              }
              className="teacher-interventions-page__queue-card"
              contentClassName="teacher-interventions-page__queue-content"
              action={
                <div
                  className="teacher-interventions-view-switcher"
                  aria-label="Intervention workspace view"
                >
                  <button
                    type="button"
                    className={`teacher-interventions-view-switcher__tab ${workspaceView === "queue" ? "is-active" : ""}`}
                    onClick={() => setWorkspaceView("queue")}
                  >
                    Queue
                  </button>
                  <button
                    type="button"
                    className={`teacher-interventions-view-switcher__tab ${workspaceView === "overview" ? "is-active" : ""}`}
                    onClick={() => setWorkspaceView("overview")}
                  >
                    Leaderboard & Outcomes
                  </button>
                  <button
                    type="button"
                    className={`teacher-interventions-view-switcher__tab ${workspaceView === "history" ? "is-active" : ""}`}
                    onClick={() => setWorkspaceView("history")}
                  >
                    History
                  </button>
                </div>
              }
            >
              {workspaceView === "queue" ? (
                queueEntries.length === 0 ? (
                  <TeacherEmptyState
                    title="No active intervention cases"
                    description="New at-risk learners will appear here when trigger thresholds are crossed."
                  />
                ) : (
                  <div className="teacher-interventions-table-shell">
                    <Table className="teacher-interventions-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Trigger</TableHead>
                          <TableHead>Current Standing</TableHead>
                          <TableHead>XP</TableHead>
                          <TableHead>Checkpoints</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queueEntries.map((entry) => {
                          const severity = getCaseSeverity(
                            entry.triggerScore,
                            thresholdLabel,
                          );
                          const latestScore = boundAcademicPercentage(
                            entry.latestBlendedScore ?? 0,
                          );
                          return (
                            <TableRow
                              key={entry.id}
                              className={
                                entry.status === "active"
                                  ? "is-active"
                                  : undefined
                              }
                            >
                              <TableCell>
                                <div className="teacher-interventions-student">
                                  <span
                                    className={`teacher-interventions-avatar is-${severity.tone}`}
                                  >
                                    {studentInitials(entry.student)}
                                  </span>
                                  <span className="teacher-interventions-student__copy">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleOpenDetail(entry.id)
                                      }
                                      className="teacher-interventions-student__name"
                                    >
                                      {studentName(entry.student ?? {})}
                                    </button>
                                    <span>
                                      {formatShortDate(entry.openedAt)}
                                    </span>
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="teacher-interventions-status-stack">
                                  <span
                                    className={`teacher-interventions-case__risk is-${severity.tone}`}
                                  >
                                    {severity.label}
                                  </span>
                                  <Badge
                                    className={
                                      entry.status === "pending"
                                        ? "teacher-badge-success border-0"
                                        : "teacher-badge-danger border-0"
                                    }
                                  >
                                    {entry.status}
                                  </Badge>
                                  <span className="teacher-interventions-small">
                                    {entry.isCurrentlyAtRisk
                                      ? "Currently at risk"
                                      : "Recovered above threshold"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="teacher-interventions-muted">
                                  {formatPercent(entry.triggerScore)}
                                </span>
                                <span className="teacher-interventions-small">
                                  vs {formatPercent(entry.thresholdApplied)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="teacher-interventions-score">
                                  <Progress
                                    value={latestScore}
                                    className="teacher-progress-track h-1.5"
                                    indicatorClassName="teacher-progress-fill"
                                  />
                                  <span>
                                    {formatPercent(entry.latestBlendedScore)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <strong className="teacher-interventions-xp">
                                  {entry.progress.xpTotal} XP
                                </strong>
                              </TableCell>
                              <TableCell>
                                <span className="teacher-interventions-muted">
                                  {entry.completedCheckpoints}/
                                  {entry.totalCheckpoints}
                                </span>
                                <span className="teacher-interventions-small">
                                  {entry.completionPercent}% complete
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="teacher-interventions-actions">
                                  {entry.aiPlanEligible ? (
                                    <Button
                                      size="sm"
                                      variant="teacher"
                                      className="rounded-md"
                                      disabled={aiUnavailable}
                                      onClick={() => handleRecommend(entry.id)}
                                    >
                                      Generate AI-Assisted Remedial Plan
                                    </Button>
                                  ) : null}
                                  {entry.status === "pending" ? (
                                    <Button
                                      size="sm"
                                      variant="teacherOutline"
                                      className="rounded-md"
                                      disabled={activatingCaseId === entry.id}
                                      onClick={() => handleActivate(entry.id)}
                                    >
                                      {activatingCaseId === entry.id
                                        ? "Activating..."
                                        : "Activate"}
                                    </Button>
                                  ) : null}
                                  <Button
                                    size="sm"
                                    variant="teacherOutline"
                                    className="rounded-md"
                                    onClick={() =>
                                      void handleOpenDetail(entry.id)
                                    }
                                  >
                                    Open Case Workspace
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="teacherOutline"
                                    className="rounded-md"
                                    disabled={resolvingCaseId === entry.id}
                                    onClick={() => handleResolve(entry.id)}
                                  >
                                    {resolvingCaseId === entry.id
                                      ? "Resolving..."
                                      : "Resolve"}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : workspaceView === "history" ? (
                historyRows.length === 0 ? (
                  <TeacherEmptyState
                    title="No intervention history yet"
                    description="Completed intervention cycles will appear here with their Learners Path contents and score."
                  />
                ) : (
                  <div className="teacher-interventions-table-shell">
                    <Table className="teacher-interventions-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Path Score</TableHead>
                          <TableHead>Learners Path</TableHead>
                          <TableHead>Opened/Closed</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="teacher-interventions-student">
                                <span className="teacher-interventions-avatar is-monitoring">
                                  {studentInitials(row.student)}
                                </span>
                                <span className="teacher-interventions-student__copy">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistoryDetail(row)}
                                    className="teacher-interventions-student__name"
                                  >
                                    {studentName(row.student ?? {})}
                                  </button>
                                  <span>
                                    {row.student?.email ?? "No email recorded"}
                                  </span>
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  row.status === "completed"
                                    ? "teacher-badge-success border-0"
                                    : "teacher-badge-danger border-0"
                                }
                              >
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="teacher-interventions-muted">
                                {formatPercent(row.pathScore?.scorePercent)}
                              </span>
                              <span className="teacher-interventions-small">
                                Below {historyScoreThreshold}% can regenerate
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="teacher-interventions-muted">
                                {row.completion.completedCheckpoints}/
                                {row.completion.totalCheckpoints}
                              </span>
                              <span className="teacher-interventions-small">
                                {row.completion.completionPercent}% complete
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="teacher-interventions-muted">
                                {formatShortDate(row.openedAt)}
                              </span>
                              <span className="teacher-interventions-small">
                                Closed {formatShortDate(row.closedAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="teacher-interventions-actions">
                                <Button
                                  size="sm"
                                  variant="teacherOutline"
                                  className="rounded-md"
                                  onClick={() => handleOpenHistoryDetail(row)}
                                >
                                  View Learners Path
                                </Button>
                                {row.canRegenerate ? (
                                  <Button
                                    size="sm"
                                    variant="teacher"
                                    className="rounded-md"
                                    disabled={regeneratingCaseId === row.id}
                                    onClick={() =>
                                      void handleRegeneratePath(row.id)
                                    }
                                  >
                                    {regeneratingCaseId === row.id
                                      ? "Regenerating..."
                                      : "Regenerate Path"}
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : leaderboardRows.length === 0 ? (
                <TeacherEmptyState
                  title="No XP records yet"
                  description="Leaderboard appears after learners complete assigned activities."
                />
              ) : (
                <div className="teacher-interventions-workspace">
                  <div className="teacher-interventions-leaderboard__toolbar">
                    {LEADERBOARD_SCOPE_OPTIONS.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.key}
                          type="button"
                          className={`teacher-interventions-leaderboard__toggle ${leaderboardScope === mode.key ? "is-active" : ""}`}
                          onClick={() => setLeaderboardScope(mode.key)}
                        >
                          <Icon className="teacher-interventions-leaderboard__toggle-icon" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="teacher-interventions-leaderboard__mode-copy">
                    {leaderboardMode.description}
                  </p>
                  <div className="teacher-interventions-leaderboard">
                    {activeLeaderboardRows.map((row) => {
                      const caseInQueue = queueCaseByStudent.get(row.studentId);
                      const TierIcon = LEADERBOARD_TIER_ICONS[row.tier];
                      const isTopTier = row.rank === 1;
                      const isHighlighted =
                        row.studentId === highlightedLeaderboardStudentId;
                      const isActiveInQueue = Boolean(caseInQueue);
                      const tierClass =
                        row.tier === "champion"
                          ? "is-champion"
                          : row.tier === "challenger"
                            ? "is-challenger"
                            : row.tier === "riser"
                              ? "is-riser"
                              : "is-contender";
                      return (
                        <button
                          key={row.studentId}
                          type="button"
                          className={`teacher-interventions-leaderboard__row ${tierClass} ${isActiveInQueue ? "is-active" : "is-idle"} ${isHighlighted ? "is-highlighted" : ""}`}
                          onClick={() => handleLeaderboardProfile(row)}
                          title={
                            isActiveInQueue
                              ? "Open intervention case"
                              : "No active intervention case"
                          }
                        >
                          <span
                            className={`teacher-interventions-leaderboard__rank ${isTopTier ? "is-leading" : ""}`}
                          >
                            <TierIcon className="teacher-interventions-leaderboard__rank-icon" />
                            <span>{row.rank}</span>
                          </span>
                          <div className="teacher-interventions-leaderboard__name-wrap">
                            <span className="teacher-interventions-leaderboard__name">
                              {studentName(row.student ?? {})}
                            </span>
                            <span className="teacher-interventions-leaderboard__meta">
                              {isActiveInQueue
                                ? "Active intervention case"
                                : "No active case"}{" "}
                              •{" "}
                              {row.lastActivityAt
                                ? formatShortDate(row.lastActivityAt)
                                : "No activity yet"}
                            </span>
                          </div>
                          <div className="teacher-interventions-leaderboard__value-wrap">
                            <div className="teacher-interventions-leaderboard__value-row">
                              <span className="teacher-interventions-leaderboard__value">
                                {row.scoreLabel}
                              </span>
                              <span className="teacher-interventions-leaderboard__value-meta">
                                {row.scoreHint}
                              </span>
                            </div>
                            <Progress
                              value={row.scorePercent}
                              className="teacher-leaderboard-progress-track h-1.8"
                              indicatorClassName="teacher-leaderboard-progress-fill"
                            />
                            <span className="teacher-interventions-leaderboard__meta">
                              {row.leaderDistanceLabel}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {leaderboardRowsByScope.length > 5 ? (
                    <button
                      type="button"
                      className="teacher-interventions-leaderboard__show-more"
                      onClick={() =>
                        setLeaderboardExpanded((previous) => !previous)
                      }
                    >
                      {leaderboardExpanded
                        ? "Show top 5 only"
                        : "Show more movers"}
                    </button>
                  ) : null}
                </div>
              )}
            </TeacherSectionCard>

            {false ? (
              <div className="teacher-interventions-page__side-rail">
                <TeacherSectionCard
                  title="XP Leaderboard"
                  description="Track learner momentum and jump into active intervention cases."
                  className="teacher-interventions-page__side-card"
                >
                  {leaderboardRows.length === 0 ? (
                    <TeacherEmptyState
                      title="No XP records yet"
                      description="Leaderboard appears after learners complete assigned activities."
                    />
                  ) : (
                    <>
                      <div className="teacher-interventions-leaderboard__toolbar">
                        {LEADERBOARD_SCOPE_OPTIONS.map((mode) => {
                          const Icon = mode.icon;
                          return (
                            <button
                              key={mode.key}
                              type="button"
                              className={`teacher-interventions-leaderboard__toggle ${leaderboardScope === mode.key ? "is-active" : ""}`}
                              onClick={() => setLeaderboardScope(mode.key)}
                            >
                              <Icon className="teacher-interventions-leaderboard__toggle-icon" />
                              <span>{mode.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="teacher-interventions-leaderboard__mode-copy">
                        {leaderboardMode.description}
                      </p>
                      <div className="teacher-interventions-leaderboard">
                        {activeLeaderboardRows.map((row) => {
                          const caseInQueue = queueCaseByStudent.get(
                            row.studentId,
                          );
                          const TierIcon = LEADERBOARD_TIER_ICONS[row.tier];
                          const isTopTier = row.rank === 1;
                          const isHighlighted =
                            row.studentId === highlightedLeaderboardStudentId;
                          const isActiveInQueue = Boolean(caseInQueue);
                          const tierClass =
                            row.tier === "champion"
                              ? "is-champion"
                              : row.tier === "challenger"
                                ? "is-challenger"
                                : row.tier === "riser"
                                  ? "is-riser"
                                  : "is-contender";
                          return (
                            <button
                              key={row.studentId}
                              type="button"
                              className={`teacher-interventions-leaderboard__row ${tierClass} ${isActiveInQueue ? "is-active" : "is-idle"} ${isHighlighted ? "is-highlighted" : ""}`}
                              onClick={() => handleLeaderboardProfile(row)}
                              title={
                                isActiveInQueue
                                  ? "Open intervention case"
                                  : "No active intervention case"
                              }
                            >
                              <span
                                className={`teacher-interventions-leaderboard__rank ${isTopTier ? "is-leading" : ""}`}
                              >
                                <TierIcon className="teacher-interventions-leaderboard__rank-icon" />
                                <span>{row.rank}</span>
                              </span>
                              <div className="teacher-interventions-leaderboard__name-wrap">
                                <span className="teacher-interventions-leaderboard__name">
                                  {studentName(row.student ?? {})}
                                </span>
                                <span className="teacher-interventions-leaderboard__meta">
                                  {isActiveInQueue
                                    ? "Active intervention case"
                                    : "No active case"}{" "}
                                  •{" "}
                                  {row.lastActivityAt
                                    ? formatShortDate(row.lastActivityAt)
                                    : "No activity yet"}
                                </span>
                              </div>
                              <div className="teacher-interventions-leaderboard__value-wrap">
                                <div className="teacher-interventions-leaderboard__value-row">
                                  <span className="teacher-interventions-leaderboard__value">
                                    {row.scoreLabel}
                                  </span>
                                  <span className="teacher-interventions-leaderboard__value-meta">
                                    {row.scoreHint}
                                  </span>
                                </div>
                                <Progress
                                  value={row.scorePercent}
                                  className="teacher-leaderboard-progress-track h-1.8"
                                  indicatorClassName="teacher-leaderboard-progress-fill"
                                />
                                <span className="teacher-interventions-leaderboard__meta">
                                  {row.leaderDistanceLabel}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {leaderboardRowsByScope.length > 5 ? (
                        <button
                          type="button"
                          className="teacher-interventions-leaderboard__show-more"
                          onClick={() =>
                            setLeaderboardExpanded((previous) => !previous)
                          }
                        >
                          {leaderboardExpanded
                            ? "Show top 5 only"
                            : "Show more movers"}
                        </button>
                      ) : null}
                    </>
                  )}
                </TeacherSectionCard>
              </div>
            ) : null}
          </div>

          {workspaceView === "overview" ? (
            <section className="teacher-figma-stagger">
              <TeacherSectionCard
                title="Intervention Outcomes"
                description="Archived and ongoing outcomes across intervention cycles."
                className="teacher-interventions-page__archive-card"
              >
                {(report?.rows.length ?? 0) === 0 ? (
                  <TeacherEmptyState
                    title="No intervention outcomes yet"
                    description="Outcome rows will appear once intervention progress has been recorded."
                  />
                ) : (
                  <div className="teacher-table-shell">
                    <Table>
                      <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Baseline</TableHead>
                          <TableHead>Current</TableHead>
                          <TableHead>Delta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&_tr:last-child]:border-0">
                        {(report?.rows ?? []).map((row) => (
                          <TableRow
                            key={row.id}
                            className="teacher-table-row border-white/10"
                          >
                            <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                              {studentName(row.student ?? {})}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  row.status === "active"
                                    ? "teacher-badge-danger border-0"
                                    : "teacher-badge-success border-0"
                                }
                              >
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[var(--teacher-text-strong)]">
                              {formatPercent(row.triggerScore)}
                            </TableCell>
                            <TableCell className="text-[var(--teacher-text-strong)]">
                              {formatPercent(row.currentBlendedScore)}
                            </TableCell>
                            <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                              {row.improvementDelta !== null
                                ? `${row.improvementDelta > 0 ? "+" : ""}${row.improvementDelta.toFixed(1)}%`
                                : "--"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TeacherSectionCard>
            </section>
          ) : null}
        </>
      ) : null}

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedCaseId(null);
            setSelectedCaseDetail(null);
            setSelectedHistoryRow(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="teacher-interventions-detail-sheet w-full max-w-[36rem] overflow-y-auto text-white sm:max-w-[36rem]"
        >
          <SheetHeader>
            <SheetTitle className="text-white">
              {isHistoryDetail
                ? "Learners Path Detail"
                : "Intervention Student Detail"}
            </SheetTitle>
            <SheetDescription className="text-[#8ea0bc]">
              {selectedCaseDetail?.student
                ? `${studentName(selectedCaseDetail.student)} • ${selectedCaseDetail.status}`
                : selectedCaseId
                  ? `Case ${selectedCaseId}`
                  : "Select an intervention case"}
            </SheetDescription>
          </SheetHeader>

          {loadingDetail ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-24 rounded-lg bg-white/10" />
              <Skeleton className="h-32 rounded-lg bg-white/10" />
              <Skeleton className="h-32 rounded-lg bg-white/10" />
            </div>
          ) : !activeDetail ? (
            <div className="mt-6 rounded-lg border border-white/10 p-4 text-sm text-[#8ea0bc]">
              No case detail available.
            </div>
          ) : (
            <div className="mt-6 space-y-4 text-sm">
              <div className="rounded-lg border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">
                  Current Status
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[#8ea0bc]">Case status</p>
                    <p className="font-semibold">{activeDetail.status}</p>
                  </div>
                  <div>
                    <p className="text-[#8ea0bc]">Completion</p>
                    <p className="font-semibold">
                      {activeDetail.completion.completionPercent}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8ea0bc]">Trigger</p>
                    <p className="font-semibold">
                      {formatPercent(activeDetail.triggerScore)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8ea0bc]">
                      {isHistoryDetail ? "Path score" : "Current standing"}
                    </p>
                    <p className="font-semibold">
                      {isHistoryDetail
                        ? formatPercent(
                            selectedHistoryRow?.pathScore?.scorePercent,
                          )
                        : formatPercent(
                            selectedCaseDetail?.latestSnapshot?.blendedScore,
                          )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">
                  Checkpoints
                </p>
                <div className="mt-2 space-y-2">
                  {activeDetailAssignments.length === 0 ? (
                    <p className="text-[#8ea0bc]">
                      No assigned checkpoints yet.
                    </p>
                  ) : (
                    activeDetailAssignments.map((assignment) => {
                      const isQuizOrAssessment =
                        assignment.type === "guided_assessment" ||
                        assignment.type === "assessment_retry" ||
                        Boolean(assignment.assessment);
                      const isTaken = Boolean(
                        assignment.isCompleted || assignment.score,
                      );
                      const scorePercent =
                        assignment.score?.scorePercent ?? null;
                      const isPassed = Boolean(
                        assignment.isCompleted ||
                        (scorePercent !== null &&
                          scorePercent >=
                            (assignment.assessment?.passingScore ?? 60)),
                      );

                      const quizTag = !isQuizOrAssessment
                        ? null
                        : isTaken
                          ? isPassed
                            ? "TAKEN • PASSED"
                            : "TAKEN • FAILED"
                          : "NOT TAKEN";

                      const isGreen = isQuizOrAssessment
                        ? isTaken && isPassed
                        : assignment.isCompleted;

                      return (
                        <div
                          key={assignment.id}
                          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                            isGreen
                              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-100"
                              : "bg-rose-950/40 border-rose-500/50 text-rose-100"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm text-white">
                              {assignment.label}
                            </p>
                            <p className="text-xs text-[#a0aec0]">
                              {assignmentTypeLabel(assignment.type)}
                            </p>
                            {assignmentContentTitle(assignment) !==
                            assignment.label ? (
                              <p className="text-xs text-[#cbd5e1]">
                                {assignmentContentTitle(assignment)}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-1 text-right">
                            {assignment.score ? (
                              <span
                                className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${isPassed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
                              >
                                {formatPercent(assignment.score.scorePercent)}{" "}
                                score
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                No score
                              </span>
                            )}
                            <Badge
                              className={`border-0 font-bold uppercase text-[10px] tracking-wider ${
                                isGreen
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              }`}
                            >
                              {quizTag ??
                                (assignment.isCompleted ? "Done" : "Pending")}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              {!isHistoryDetail ? (
                <>
                  <div className="rounded-lg border border-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">
                      Weak Concepts
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeWeakConcepts.length === 0 ? (
                        <p className="text-[#8ea0bc]">
                          No concept evidence captured yet.
                        </p>
                      ) : (
                        activeWeakConcepts.map((concept) => (
                          <Badge key={concept.concept} variant="secondary">
                            {concept.concept} ({concept.masteryScore}%)
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">
                      Latest Evidence Snippets
                    </p>
                    <div className="mt-2 space-y-2">
                      {activeRecentRiskTransitions.length === 0 ? (
                        <p className="text-[#8ea0bc]">
                          No recent risk transition logs.
                        </p>
                      ) : (
                        activeRecentRiskTransitions.map((log) => (
                          <div
                            key={log.id}
                            className="rounded-md bg-white/5 px-3 py-2"
                          >
                            <p className="font-medium">{log.triggerSource}</p>
                            <p className="text-xs text-[#8ea0bc]">
                              {formatPercent(log.blendedScore)} against
                              threshold {formatPercent(log.thresholdApplied)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}

              {!isHistoryDetail ? (
                <Button
                  variant="teacherOutline"
                  className="w-full rounded-lg"
                  onClick={handleOpenPerformance}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Performance Analysis
                </Button>
              ) : null}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog">
          <DialogHeader>
            <DialogTitle>Teacher guide: Interventions Dashboard</DialogTitle>
            <DialogDescription>
              Read this one page at a time. Each example points to the part of
              the dashboard being explained.
            </DialogDescription>
          </DialogHeader>

          <div
            className="teacher-intervention-workspace__manual-progress"
            aria-live="polite"
          >
            <span>
              Page {helpPage + 1} of {interventionsGuidePages.length}
            </span>
            <div>
              {interventionsGuidePages.map((page, index) => (
                <button
                  key={page.title}
                  type="button"
                  className={index === helpPage ? "is-active" : undefined}
                  onClick={() => setHelpPage(index)}
                  aria-label={`Open guide page ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="teacher-intervention-workspace__manual-layout">
            <InterventionsGuideScreenshot
              screen={interventionsGuidePages[helpPage].screen}
            />
            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">
                Teacher instruction manual
              </p>
              <h3>{interventionsGuidePages[helpPage].title}</h3>
              <p>{interventionsGuidePages[helpPage].description}</p>
              <ol>
                {interventionsGuidePages[helpPage].steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="teacher-intervention-workspace__manual-reminder">
                Simple rule: choose the class, work from the queue first, and
                open the student detail before making a final decision.
              </p>
            </section>
          </div>

          <DialogFooter>
            <div className="teacher-intervention-workspace__manual-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setHelpPage((current) => Math.max(current - 1, 0))
                }
                disabled={helpPage === 0}
              >
                Previous page
              </Button>
              {helpPage < interventionsGuidePages.length - 1 ? (
                <Button
                  type="button"
                  onClick={() =>
                    setHelpPage((current) =>
                      Math.min(current + 1, interventionsGuidePages.length - 1),
                    )
                  }
                >
                  Next page
                </Button>
              ) : (
                <Button type="button" onClick={() => setHelpOpen(false)}>
                  Close guide
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TeacherPageShell>
  );
}
