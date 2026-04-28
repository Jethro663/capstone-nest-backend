import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { peekAppError, toAppError } from "../api/http";
import { useJaHub, useLxpCheckpointMutation, useLxpEligibility, useLxpOverview, useLxpPlaylist } from "../api/hooks";
import { jaApi } from "../api/services/ja";
import { EmptyState, Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { JaAskLessonContextSummary, JaAskMessage, JaMode, JaPracticeSessionItem, JaPracticeSessionResponse } from "../types/ja";
import type { LxpCheckpoint, LxpOverviewResponse, LxpPathSummary } from "../types/lxp";
import type { JaPanel, LxpMobileTab } from "../navigation/types";
import { resolveJaAvatar, resolveJaStateFromMessage } from "../utils/jaAssets";

type Props = {
  navigation: {
    navigate: (routeName: never, params?: never) => void;
  };
  route?: {
    params?: {
      panel?: JaPanel;
      classId?: string;
      lxpClassId?: string;
      lxpTab?: LxpMobileTab;
    };
  };
};

type ActivityFilter = "all" | JaMode;
type AnswerState = Record<string, string[]>;

const dark = {
  bg: "#141414",
  header: "#1C1C1C",
  surface: "#1E1E1E",
  surface2: "#232323",
  active: "#252525",
  border: "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.12)",
  text: "#E8E8E8",
  muted: "#7A7A7A",
  dim: "#4B4B4B",
  red: "#E8294E",
  blue: "#4A8CF7",
  blueSoft: "rgba(74,140,247,0.13)",
  green: "#22C97A",
  greenSoft: "rgba(34,201,122,0.12)",
  amber: "#FBBF24",
  amberSoft: "rgba(251,191,36,0.12)",
};

const MODE_ORDER: Array<{ key: JaPanel; label: string; icon: string }> = [
  { key: "practice", label: "Practice", icon: "layers-triple-outline" },
  { key: "ask", label: "Ask", icon: "message-text-outline" },
  { key: "review", label: "Replay", icon: "history" },
  { key: "lxp", label: "Learners Path", icon: "map-marker-path" },
];

const ASK_ACTIONS = [
  "Explain the lesson",
  "Summarize main idea",
  "What should I study next?",
  "Give me a question",
  "Quiz me on this lesson",
  "Make a study plan",
];

function classLabel(item?: { subjectName: string; subjectCode: string } | null) {
  if (!item) return "Selected class";
  return `${item.subjectName} (${item.subjectCode})`;
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "No date";
  return timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function itemReady(item: JaPracticeSessionItem, selected?: string[]) {
  if (!selected || selected.length === 0) return false;
  return item.itemType === "multiple_select" ? selected.length > 0 : Boolean(selected[0]);
}

function buildAnswerPayload(item: JaPracticeSessionItem, selected?: string[]) {
  return item.itemType === "multiple_select"
    ? { selectedOptionIds: selected ?? [] }
    : { selectedOptionId: selected?.[0] };
}

function resolvePathFallback(paths: LxpPathSummary[] | undefined, eligibleClasses: Array<{
  classId: string;
  class: LxpPathSummary["class"];
  interventionCaseId: string | null;
  isAtRisk: boolean;
  blendedScore: number | null;
  thresholdApplied: number;
  openedAt: string | null;
}>) {
  if (paths?.length) return paths;
  return eligibleClasses.map((entry) => ({
    classId: entry.classId,
    class: entry.class,
    interventionCaseId: entry.interventionCaseId,
    status: "active" as const,
    isAtRisk: entry.isAtRisk,
    blendedScore: entry.blendedScore,
    thresholdApplied: entry.thresholdApplied,
    openedAt: entry.openedAt,
    closedAt: null,
    counts: { steps: 0, replays: 0, pending: 0, total: 0, completed: 0 },
    progress: { totalCheckpoints: 0, completedCheckpoints: 0, completionPercent: 0 },
  }));
}

function DarkPanel({ children, style }: { children: ReactNode; style?: Record<string, unknown> }) {
  return (
    <View
      style={{
        backgroundColor: dark.surface,
        borderColor: dark.border2,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function SectionLabel({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <Text style={{ color: dark.text, fontSize: 13, fontWeight: "800" }}>{title}</Text>
      {meta ? <Text style={{ color: dark.muted, fontSize: 10, fontWeight: "700" }}>{meta}</Text> : null}
    </View>
  );
}

export function JaScreen({ navigation, route }: Props) {
  const [panel, setPanel] = useState<JaPanel>(route?.params?.panel ?? "practice");
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(route?.params?.classId);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [askThreadId, setAskThreadId] = useState<string | undefined>();
  const [askThreadClassId, setAskThreadClassId] = useState<string | undefined>();
  const [askMessages, setAskMessages] = useState<JaAskMessage[]>([]);
  const [askDraft, setAskDraft] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<JaAskLessonContextSummary | null>(null);
  const [askError, setAskError] = useState("");
  const [busy, setBusy] = useState(false);
  const [practiceSession, setPracticeSession] = useState<JaPracticeSessionResponse | null>(null);
  const [reviewSession, setReviewSession] = useState<JaPracticeSessionResponse | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [selectedLxpClassId, setSelectedLxpClassId] = useState<string | undefined>(route?.params?.lxpClassId);
  const [lxpTab, setLxpTab] = useState<LxpMobileTab>(route?.params?.lxpTab ?? "paths");
  const [actionError, setActionError] = useState("");

  const jaHubQuery = useJaHub(selectedClassId);
  const eligibilityQuery = useLxpEligibility();
  const lxpPlaylistQuery = useLxpPlaylist(selectedLxpClassId);
  const lxpOverviewQuery = useLxpOverview(selectedLxpClassId);
  const lxpCheckpointMutation = useLxpCheckpointMutation(selectedLxpClassId);

  useEffect(() => {
    if (selectedClassId || !jaHubQuery.data?.classes.length) return;
    setSelectedClassId(jaHubQuery.data.selectedClassId || jaHubQuery.data.classes[0].id);
  }, [jaHubQuery.data, selectedClassId]);

  useEffect(() => {
    if (route?.params?.panel) setPanel(route.params.panel);
    if (route?.params?.classId) setSelectedClassId(route.params.classId);
    if (route?.params?.lxpClassId) {
      setSelectedLxpClassId(route.params.lxpClassId);
      setLxpTab(route.params.lxpTab ?? "steps");
    }
  }, [route?.params?.classId, route?.params?.lxpClassId, route?.params?.lxpTab, route?.params?.panel]);

  const selectedClass = useMemo(
    () => jaHubQuery.data?.classes.find((item) => item.id === selectedClassId) ?? jaHubQuery.data?.classes[0] ?? null,
    [jaHubQuery.data?.classes, selectedClassId],
  );
  const availableClasses = jaHubQuery.data?.classes ?? [];
  const hasMultipleClasses = availableClasses.length > 1;
  const resolvedClassId = selectedClassId || selectedClass?.id;
  const selectedClassText = classLabel(selectedClass);
  const activityCounts = {
    practice: jaHubQuery.data?.practice.sessions.length ?? 0,
    ask: jaHubQuery.data?.ask.threads.length ?? 0,
    review: jaHubQuery.data?.review.sessions?.length ?? 0,
  };
  const lxpPaths = resolvePathFallback(eligibilityQuery.data?.paths, eligibilityQuery.data?.eligibleClasses ?? []);
  const selectedPath = lxpPaths.find((path) => path.classId === selectedLxpClassId) ?? null;
  const checkpoints = useMemo(
    () => [...(lxpPlaylistQuery.data?.checkpoints ?? [])].sort((left, right) => left.order - right.order),
    [lxpPlaylistQuery.data?.checkpoints],
  );
  const lessonSteps = checkpoints.filter((checkpoint) => checkpoint.type === "lesson_review");
  const replaySteps = checkpoints.filter((checkpoint) => checkpoint.type === "assessment_retry");
  const visibleActivities = [
    ...(jaHubQuery.data?.practice.sessions ?? []).map((session) => ({
      id: session.id,
      mode: "practice" as const,
      title: "Practice Run",
      subtitle: `${session.status.toUpperCase()} - ${session.currentIndex}/${session.questionCount}`,
      updatedAt: session.completedAt || session.startedAt,
    })),
    ...(jaHubQuery.data?.ask.threads ?? []).map((thread) => ({
      id: thread.id,
      mode: "ask" as const,
      title: thread.title || "Ask thread",
      subtitle: thread.contextLessonTitle || "Ask thread",
      updatedAt: thread.lastMessageAt || thread.updatedAt,
    })),
    ...(jaHubQuery.data?.review.sessions ?? []).map((session) => ({
      id: session.id,
      mode: "review" as const,
      title: "Replay Session",
      subtitle: `${session.status.toUpperCase()} - ${session.currentIndex}/${session.questionCount}`,
      updatedAt: session.completedAt || session.startedAt,
    })),
  ].filter((item) => activityFilter === "all" || item.mode === activityFilter);

  const refreshAll = () => {
    void Promise.all([jaHubQuery.refetch(), eligibilityQuery.refetch(), lxpPlaylistQuery.refetch(), lxpOverviewQuery.refetch()]);
  };

  const resetJaWorkspace = () => {
    setAskThreadId(undefined);
    setAskThreadClassId(undefined);
    setAskMessages([]);
    setAskDraft("");
    setSelectedLesson(null);
    setAskError("");
    setPracticeSession(null);
    setReviewSession(null);
    setAnswers({});
    setActionError("");
  };

  const handleClassSelect = (nextClassId: string) => {
    if (busy) return;
    if (nextClassId === resolvedClassId) {
      setClassPickerOpen(false);
      return;
    }

    resetJaWorkspace();
    setSelectedClassId(nextClassId);
    setClassPickerOpen(false);
  };

  const switchPanel = (nextPanel: JaPanel) => {
    setPanel(nextPanel);
    setClassPickerOpen(false);
    setActionError("");
    if (nextPanel !== "ask") setAskError("");
    if (nextPanel !== "lxp") return;
    setLxpTab(selectedLxpClassId ? "steps" : "paths");
  };

  const startNewChat = () => {
    setAskThreadId(undefined);
    setAskThreadClassId(resolvedClassId);
    setAskMessages([]);
    setAskDraft("");
    setSelectedLesson(null);
    setAskError("");
    setClassPickerOpen(false);
    setPanel("ask");
  };

  const openAskThread = async (threadId: string) => {
    if (busy) return;
    setBusy(true);
    setAskError("");
    setPanel("ask");
    try {
      const response = await jaApi.getAskThread(threadId);
      setAskThreadId(response.thread.id);
      setAskThreadClassId(response.thread.classId);
      setAskMessages(response.messages);
      if (response.thread.contextLessonId) {
        const lessonContext = jaHubQuery.data?.ask.lessonContexts.find((context) => context.lessonId === response.thread.contextLessonId);
        setSelectedLesson(
          lessonContext ?? {
            lessonId: response.thread.contextLessonId,
            title: response.thread.contextLessonTitle || "Selected lesson",
            moduleTitle: response.thread.contextModuleTitle,
            sectionTitle: response.thread.contextSectionTitle,
          },
        );
      }
    } catch (error) {
      setAskError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendAskAction = async (label: string, quickAction = label) => {
    if (!resolvedClassId || busy) return;
    if (!selectedLesson) {
      setAskError("Select a visible lesson first so JA can keep the answer grounded.");
      return;
    }
    if (!label.trim()) return;

    setBusy(true);
    setAskError("");
    const studentMessage: JaAskMessage = {
      id: `local-${Date.now()}`,
      role: "student",
      content: label.trim(),
      blocked: false,
      quickAction,
      createdAt: new Date().toISOString(),
    };
    setAskDraft("");
    setAskMessages((current) => [...current, studentMessage]);
    try {
      let threadId = askThreadId;
      if (!threadId || askThreadClassId !== resolvedClassId) {
        const created = await jaApi.createAskThread({
          classId: resolvedClassId,
          lessonId: selectedLesson.lessonId,
        });
        threadId = created.thread.id;
        setAskThreadId(threadId);
        setAskThreadClassId(created.thread.classId);
      }
      const response = await jaApi.sendAskMessage(threadId, {
        message: label.trim(),
        quickAction,
        lessonId: selectedLesson.lessonId,
      });
      setAskThreadId(response.thread.id);
      setAskThreadClassId(response.thread.classId);
      setAskMessages((current) => [...current, response.message]);
    } catch (error) {
      setAskError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const startPractice = async () => {
    if (!resolvedClassId) return;
    setBusy(true);
    setActionError("");
    try {
      const session = await jaApi.createSession({
        classId: resolvedClassId,
        recommendation: jaHubQuery.data?.practice.recommendations[0],
      });
      setPracticeSession(session);
      setAnswers({});
    } catch (error) {
      setActionError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const startReplay = async (attemptId: string) => {
    if (!resolvedClassId) return;
    setBusy(true);
    setActionError("");
    try {
      const session = await jaApi.createReviewSession({ classId: resolvedClassId, attemptId, questionCount: 10 });
      setReviewSession(session);
      setAnswers({});
      setPanel("review");
    } catch (error) {
      setActionError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitSessionAnswers = async (mode: "practice" | "review") => {
    const session = mode === "practice" ? practiceSession : reviewSession;
    if (!session) return;
    const unanswered = session.items.filter((item) => !item.response);
    const incomplete = unanswered.find((item) => !itemReady(item, answers[item.id]));
    if (incomplete) {
      setActionError(mode === "review" ? "Answer every replay item before submitting." : "Select an answer first.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      for (const item of unanswered) {
        const payload = { itemId: item.id, answer: buildAnswerPayload(item, answers[item.id]) };
        if (mode === "practice") {
          await jaApi.submitResponse(session.session.id, payload);
        } else {
          await jaApi.submitReviewResponse(session.session.id, payload);
        }
      }
      const refreshed = mode === "practice"
        ? await jaApi.getSession(session.session.id)
        : await jaApi.getReviewSession(session.session.id);
      if (mode === "practice") setPracticeSession(refreshed);
      else setReviewSession(refreshed);
    } catch (error) {
      setActionError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const completeSession = async (mode: "practice" | "review") => {
    const session = mode === "practice" ? practiceSession : reviewSession;
    if (!session) return;
    setBusy(true);
    try {
      if (mode === "practice") await jaApi.completeSession(session.session.id);
      else await jaApi.completeReviewSession(session.session.id);
      await jaHubQuery.refetch();
    } catch (error) {
      setActionError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const completeCheckpoint = async (checkpointId: string) => {
    try {
      setActionError("");
      await lxpCheckpointMutation.mutateAsync({ assignmentId: checkpointId });
      await Promise.all([lxpPlaylistQuery.refetch(), lxpOverviewQuery.refetch(), eligibilityQuery.refetch()]);
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const openPath = (path: LxpPathSummary) => {
    setSelectedLxpClassId(path.classId);
    setLxpTab("steps");
  };

  const openLesson = (checkpoint: LxpCheckpoint) => {
    if (!checkpoint.lesson?.id || !selectedLxpClassId) return;
    navigation.navigate("LessonDetail" as never, { lessonId: checkpoint.lesson.id, classId: selectedLxpClassId } as never);
  };

  const openReplayFromLxp = () => {
    if (selectedLxpClassId) setSelectedClassId(selectedLxpClassId);
    setPanel("review");
    setActivityFilter("review");
  };

  const classSelectorStyle = {
    alignSelf: "flex-start" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: classPickerOpen ? "rgba(74,140,247,0.32)" : dark.border2,
    backgroundColor: classPickerOpen ? dark.blueSoft : "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    opacity: busy ? 0.65 : 1,
  };

  return (
    <ScreenScroll
      backgroundColor={dark.bg}
      refreshControl={<Refreshable refreshing={jaHubQuery.isRefetching || eligibilityQuery.isRefetching} onRefresh={refreshAll} />}
    >
      <View style={{ backgroundColor: dark.header, borderBottomWidth: 1, borderBottomColor: dark.border }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 13, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 27, height: 27, borderRadius: 8, backgroundColor: dark.red, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>N</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: dark.muted, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 }}>JA Hub</Text>
            <Text style={{ color: dark.text, fontSize: 14, fontWeight: "800" }}>Activity History</Text>
          </View>
          {panel === "ask" ? (
            <Pressable onPress={startNewChat} style={{ backgroundColor: dark.blueSoft, borderColor: "rgba(74,140,247,0.25)", borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: dark.blue, fontSize: 11, fontWeight: "800" }}>New chat</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: classPickerOpen ? 12 : 11, gap: 9 }}>
          {hasMultipleClasses ? (
            <Pressable
              disabled={busy}
              onPress={() => setClassPickerOpen((current) => !current)}
              style={classSelectorStyle}
            >
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: dark.blue }} />
              <Text style={{ color: dark.text, fontSize: 12, fontWeight: "700" }}>{selectedClassText}</Text>
              <MaterialCommunityIcons
                name={classPickerOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={dark.muted}
              />
            </Pressable>
          ) : (
            <View style={classSelectorStyle}>
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: dark.blue }} />
              <Text style={{ color: dark.text, fontSize: 12, fontWeight: "700" }}>{selectedClassText}</Text>
            </View>
          )}

          {classPickerOpen ? (
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: dark.border2,
                backgroundColor: dark.surface2,
                padding: 8,
                gap: 6,
              }}
            >
              {availableClasses.map((item) => {
                const active = item.id === resolvedClassId;
                return (
                  <Pressable
                    key={item.id}
                    disabled={busy}
                    onPress={() => handleClassSelect(item.id)}
                    style={{
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active ? "rgba(74,140,247,0.32)" : dark.border2,
                      backgroundColor: active ? dark.blueSoft : "rgba(255,255,255,0.03)",
                      paddingHorizontal: 11,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: dark.text, fontSize: 12, fontWeight: "800" }}>{classLabel(item)}</Text>
                    <Text style={{ marginTop: 3, color: active ? dark.blue : dark.muted, fontSize: 10, fontWeight: "700" }}>
                      {item.sectionName ? `${item.gradeLevel ? `Grade ${item.gradeLevel} / ` : ""}${item.sectionName}` : active ? "Currently active" : "Tap to switch"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {MODE_ORDER.map((mode) => {
            const active = panel === mode.key;
            return (
              <Pressable
                key={mode.key}
                onPress={() => switchPanel(mode.key)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: active ? dark.blue : "transparent" }}
              >
                <MaterialCommunityIcons name={mode.icon as never} size={14} color={active ? dark.blue : dark.muted} />
                <Text style={{ color: active ? dark.blue : dark.muted, fontSize: 12, fontWeight: active ? "800" : "600" }}>{mode.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ backgroundColor: "#191919", borderBottomWidth: 1, borderBottomColor: dark.border, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: dark.muted, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Activity Filter</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {(["all", "practice", "ask", "review"] as ActivityFilter[]).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActivityFilter(filter)}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: activityFilter === filter ? "rgba(74,140,247,0.32)" : dark.border2, backgroundColor: activityFilter === filter ? dark.blueSoft : "transparent", paddingHorizontal: 11, paddingVertical: 5 }}
            >
              <Text style={{ color: activityFilter === filter ? dark.blue : dark.muted, fontSize: 10, fontWeight: "700" }}>
                {filter === "all" ? "All" : filter === "review" ? "Replay" : filter[0].toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ marginTop: 9, color: dark.muted, fontSize: 11 }}>
          {visibleActivities.length ? `${visibleActivities.length} saved activities for this filter.` : "No saved JA activity for this filter yet."}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 18, gap: 14 }}>
        {jaHubQuery.error ? (
          <DarkPanel style={{ borderColor: dark.red }}>
            <Text style={{ color: dark.text, fontWeight: "800" }}>JA data is partially unavailable</Text>
            <Text style={{ marginTop: 6, color: dark.muted, fontSize: 12 }}>{peekAppError(jaHubQuery.error).message}</Text>
          </DarkPanel>
        ) : null}

        {panel === "practice" ? (
          <PracticePanel
            session={practiceSession}
            answers={answers}
            setAnswers={setAnswers}
            busy={busy}
            counts={`${activityCounts.practice} Drill`}
            recommendation={jaHubQuery.data?.practice.recommendations[0]}
            onStart={startPractice}
            onSubmit={() => void submitSessionAnswers("practice")}
            onComplete={() => void completeSession("practice")}
          />
        ) : null}

        {panel === "ask" ? (
          <AskPanel
            lessonContexts={jaHubQuery.data?.ask.lessonContexts ?? []}
            selectedLesson={selectedLesson}
            onSelectLesson={setSelectedLesson}
            messages={askMessages}
            threads={jaHubQuery.data?.ask.threads ?? []}
            activeThreadId={askThreadId}
            draft={askDraft}
            onDraftChange={setAskDraft}
            onSendAction={sendAskAction}
            onOpenThread={(threadId) => void openAskThread(threadId)}
            busy={busy}
            error={askError}
          />
        ) : null}

        {panel === "review" ? (
          <ReplayPanel
            attempts={jaHubQuery.data?.review.eligibleAttempts ?? []}
            session={reviewSession}
            answers={answers}
            setAnswers={setAnswers}
            busy={busy}
            onStart={startReplay}
            onSubmit={() => void submitSessionAnswers("review")}
            onComplete={() => void completeSession("review")}
          />
        ) : null}

        {panel === "lxp" ? (
          <LearnersPathPanel
            tab={lxpTab}
            setTab={setLxpTab}
            paths={lxpPaths}
            selectedPath={selectedPath}
            selectedClassId={selectedLxpClassId}
            overview={lxpOverviewQuery.data}
            checkpoints={checkpoints}
            lessonSteps={lessonSteps}
            replaySteps={replaySteps}
            onOpenPath={openPath}
            onBack={() => {
              setSelectedLxpClassId(undefined);
              setLxpTab("paths");
            }}
            onOpenLesson={openLesson}
            onOpenReplay={openReplayFromLxp}
            onCompleteCheckpoint={completeCheckpoint}
          />
        ) : null}

        {actionError ? (
          <DarkPanel style={{ borderColor: dark.red }}>
            <Text style={{ color: dark.red, fontSize: 12, fontWeight: "800" }}>{actionError}</Text>
          </DarkPanel>
        ) : null}
      </View>
    </ScreenScroll>
  );
}

function PracticePanel({
  session,
  answers,
  setAnswers,
  busy,
  counts,
  recommendation,
  onStart,
  onSubmit,
  onComplete,
}: {
  session: JaPracticeSessionResponse | null;
  answers: AnswerState;
  setAnswers: (value: AnswerState | ((current: AnswerState) => AnswerState)) => void;
  busy: boolean;
  counts: string;
  recommendation?: { reason: string; focusText: string } | null;
  onStart: () => void;
  onSubmit: () => void;
  onComplete: () => void;
}) {
  const answered = session?.items.filter((item) => item.response).length ?? 0;
  const completeReady = Boolean(session && answered >= session.items.length && session.items.length > 0);
  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={{ color: dark.text, fontSize: 16, fontWeight: "800" }}>Start your next practice run</Text>
        <Text style={{ marginTop: 5, color: dark.muted, fontSize: 12, lineHeight: 18 }}>
          JA will generate 10 objective checks tuned to your current learning focus in this class.
        </Text>
      </View>
      <Pressable onPress={onStart} disabled={busy} style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: dark.blue }}>
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}>{busy ? "Generating..." : "Generate Practice Run"}</Text>
      </Pressable>
      <DarkPanel>
        <SectionLabel title="How it works" meta={counts} />
        {[
          "10 fresh objective checks are generated from class lessons.",
          recommendation?.reason || "JA tunes questions to your current learning focus.",
          "Completed runs appear in your activity history above.",
        ].map((line) => (
          <Text key={line} style={{ color: "rgba(255,255,255,0.52)", fontSize: 12, lineHeight: 19, marginTop: 5 }}>- {line}</Text>
        ))}
      </DarkPanel>
      {session ? <SessionPanel session={session} answers={answers} setAnswers={setAnswers} onSubmit={onSubmit} onComplete={onComplete} canComplete={completeReady} submitLabel="Submit Answer" /> : null}
    </View>
  );
}

function AskPanel({
  lessonContexts,
  selectedLesson,
  onSelectLesson,
  messages,
  threads,
  activeThreadId,
  draft,
  onDraftChange,
  onSendAction,
  onOpenThread,
  busy,
  error,
}: {
  lessonContexts: JaAskLessonContextSummary[];
  selectedLesson: JaAskLessonContextSummary | null;
  onSelectLesson: (context: JaAskLessonContextSummary) => void;
  messages: JaAskMessage[];
  threads: Array<{ id: string; title: string; contextLessonTitle?: string | null; lastMessageAt?: string | null; updatedAt: string }>;
  activeThreadId?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSendAction: (label: string, quickAction?: string) => Promise<void>;
  onOpenThread: (threadId: string) => void;
  busy: boolean;
  error: string;
}) {
  const insets = useSafeAreaInsets();
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role !== "student");
  const visualState = busy ? "thinking" : resolveJaStateFromMessage(lastAssistantMessage);
  const avatar = resolveJaAvatar(visualState);
  const avatarSource = process.env.NODE_ENV === "test" ? undefined : avatar.getSource();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ gap: 12 }}>
        <DarkPanel style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: dark.border }}>
            <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: dark.blueSoft, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {avatarSource ? (
                <Image source={avatarSource} style={{ width: 50, height: 50 }} resizeMode="contain" />
              ) : (
                <MaterialCommunityIcons name="auto-fix" size={20} color={dark.blue} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: dark.blue, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 }}>JA Ask</Text>
              <Text style={{ marginTop: 3, color: dark.text, fontSize: 16, fontWeight: "900" }}>Lesson-grounded chat</Text>
              <Text numberOfLines={2} style={{ marginTop: 4, color: dark.muted, fontSize: 11, lineHeight: 16 }}>
                {selectedLesson ? `Using ${selectedLesson.title}` : "Pick a visible lesson before asking."}
              </Text>
            </View>
            <View style={{ borderRadius: 999, backgroundColor: busy ? dark.amberSoft : dark.greenSoft, paddingHorizontal: 9, paddingVertical: 5 }}>
              <Text style={{ color: busy ? dark.amber : dark.green, fontSize: 10, fontWeight: "900" }}>
                {busy ? "Thinking" : "Ready"}
              </Text>
            </View>
          </View>

          {threads.length ? (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
                {threads.map((thread) => {
                  const active = thread.id === activeThreadId;
                  return (
                    <Pressable
                      key={thread.id}
                      onPress={() => onOpenThread(thread.id)}
                      disabled={busy}
                      style={{
                        width: 178,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: active ? dark.blue : dark.border2,
                        backgroundColor: active ? dark.blueSoft : "rgba(255,255,255,0.035)",
                        paddingHorizontal: 11,
                        paddingVertical: 10,
                      }}
                    >
                      <Text numberOfLines={1} style={{ color: dark.text, fontSize: 12, fontWeight: "900" }}>
                        {thread.title || "Ask thread"}
                      </Text>
                      <Text numberOfLines={1} style={{ marginTop: 3, color: active ? dark.blue : dark.muted, fontSize: 10, fontWeight: "700" }}>
                        {thread.contextLessonTitle || "Lesson chat"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
              {lessonContexts.length ? lessonContexts.map((context) => {
                const selected = selectedLesson?.lessonId === context.lessonId;
                return (
                  <Pressable
                    key={context.lessonId}
                    onPress={() => onSelectLesson(context)}
                    disabled={busy}
                    style={{ width: 190, borderRadius: 14, borderWidth: 1, borderColor: selected ? dark.blue : dark.border2, backgroundColor: selected ? dark.blueSoft : "rgba(255,255,255,0.03)", padding: 11 }}
                  >
                    <Text numberOfLines={1} style={{ color: dark.text, fontSize: 12, fontWeight: "900" }}>{context.title}</Text>
                    <Text numberOfLines={1} style={{ marginTop: 3, color: dark.muted, fontSize: 10 }}>{[context.moduleTitle, context.sectionTitle].filter(Boolean).join(" / ") || "Visible lesson"}</Text>
                  </Pressable>
                );
              }) : (
                <Text style={{ borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: dark.border2, color: dark.muted, fontSize: 11, padding: 11 }}>
                  No visible lessons are available for JA Ask yet in this class.
                </Text>
              )}
            </ScrollView>
          </View>

          <View style={{ minHeight: 180, paddingHorizontal: 14, paddingVertical: 14, gap: 10 }}>
            {messages.length ? messages.map((message) => (
              <View
                key={message.id}
                style={{
                  alignSelf: message.role === "student" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  borderTopLeftRadius: message.role === "student" ? 16 : 5,
                  borderTopRightRadius: message.role === "student" ? 5 : 16,
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  borderWidth: message.role === "student" ? 0 : 1,
                  borderColor: message.blocked ? dark.amber : dark.border2,
                  backgroundColor: message.role === "student" ? dark.blue : dark.surface2,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: message.role === "student" ? "#fff" : dark.text, fontSize: 12, lineHeight: 18 }}>{message.content}</Text>
              </View>
            )) : (
              <View style={{ flex: 1, minHeight: 132, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
                {avatarSource ? <Image source={avatarSource} style={{ width: 74, height: 74 }} resizeMode="contain" /> : null}
                <Text style={{ marginTop: 10, color: dark.text, fontSize: 15, fontWeight: "900", textAlign: "center" }}>Start with a lesson question</Text>
                <Text style={{ marginTop: 5, color: dark.muted, fontSize: 11, lineHeight: 17, textAlign: "center" }}>
                  JA answers through the backend using your selected lesson as context.
                </Text>
              </View>
            )}
            {busy ? (
              <View style={{ alignSelf: "flex-start", borderRadius: 16, borderTopLeftRadius: 5, backgroundColor: dark.surface2, borderWidth: 1, borderColor: dark.border2, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: dark.muted, fontSize: 12, fontWeight: "800" }}>JA is thinking...</Text>
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 14, paddingBottom: Math.max(18, insets.bottom + 14), gap: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {ASK_ACTIONS.map((label) => (
                <Pressable key={label} onPress={() => void onSendAction(label, label)} disabled={busy} style={{ borderRadius: 999, borderWidth: 1, borderColor: dark.border2, backgroundColor: dark.surface2, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: dark.text, fontSize: 11, fontWeight: "800" }}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 9, borderRadius: 18, borderWidth: 1, borderColor: dark.border2, backgroundColor: "#151515", paddingHorizontal: 10, paddingVertical: 9 }}>
              <TextInput
                value={draft}
                onChangeText={onDraftChange}
                placeholder={selectedLesson ? "Message JA..." : "Select a lesson first"}
                placeholderTextColor={dark.dim}
                multiline
                editable={!busy && Boolean(selectedLesson)}
                style={{ flex: 1, maxHeight: 110, minHeight: 35, color: dark.text, fontSize: 13, lineHeight: 18, padding: 0, textAlignVertical: "center" }}
              />
              <Pressable
                disabled={busy || !draft.trim() || !selectedLesson}
                onPress={() => void onSendAction(draft, "free_text")}
                style={{ width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: busy || !draft.trim() || !selectedLesson ? dark.active : dark.blue }}
              >
                <MaterialCommunityIcons name={busy ? "stop" : "send"} size={17} color="#fff" />
              </Pressable>
            </View>
            {error ? <Text style={{ color: dark.amber, fontSize: 11, fontWeight: "800" }}>{error}</Text> : null}
          </View>
        </DarkPanel>
      </View>
    </KeyboardAvoidingView>
  );
}

function ReplayPanel({
  attempts,
  session,
  answers,
  setAnswers,
  busy,
  onStart,
  onSubmit,
  onComplete,
}: {
  attempts: Array<{ attemptId: string; assessmentTitle: string; submittedAt: string; score: number | null; passed: boolean | null }>;
  session: JaPracticeSessionResponse | null;
  answers: AnswerState;
  setAnswers: (value: AnswerState | ((current: AnswerState) => AnswerState)) => void;
  busy: boolean;
  onStart: (attemptId: string) => void;
  onSubmit: () => void;
  onComplete: () => void;
}) {
  const allReady = Boolean(session && session.items.every((item) => Boolean(item.response) || itemReady(item, answers[item.id])));
  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={{ color: dark.text, fontSize: 16, fontWeight: "800" }}>Pick an assessment to replay</Text>
        <Text style={{ marginTop: 5, color: dark.muted, fontSize: 12, lineHeight: 18 }}>Replay mode builds a focused retry session from a submitted assessment attempt.</Text>
      </View>
      {attempts.length ? attempts.map((attempt) => (
        <Pressable key={attempt.attemptId} disabled={busy} onPress={() => onStart(attempt.attemptId)}>
          <DarkPanel>
            <Text style={{ color: dark.text, fontSize: 13, fontWeight: "800" }}>{attempt.assessmentTitle}</Text>
            <Text style={{ marginTop: 5, color: dark.muted, fontSize: 11 }}>Score: {attempt.score ?? "Pending"} - {formatDate(attempt.submittedAt)}</Text>
          </DarkPanel>
        </Pressable>
      )) : (
        <DarkPanel>
          <Text style={{ color: dark.text, fontSize: 14, fontWeight: "800", textAlign: "center" }}>No eligible attempts yet</Text>
          <Text style={{ marginTop: 6, color: dark.muted, fontSize: 11, lineHeight: 17, textAlign: "center" }}>Complete an assessment and return here to replay weak areas.</Text>
        </DarkPanel>
      )}
      {session ? <SessionPanel session={session} answers={answers} setAnswers={setAnswers} onSubmit={onSubmit} onComplete={onComplete} canComplete={allReady} submitLabel="Submit Replay" /> : null}
    </View>
  );
}

function SessionPanel({
  session,
  answers,
  setAnswers,
  onSubmit,
  onComplete,
  canComplete,
  submitLabel,
}: {
  session: JaPracticeSessionResponse;
  answers: AnswerState;
  setAnswers: (value: AnswerState | ((current: AnswerState) => AnswerState)) => void;
  onSubmit: () => void;
  onComplete: () => void;
  canComplete: boolean;
  submitLabel: string;
}) {
  return (
    <DarkPanel>
      <SectionLabel title={session.session.mode === "review" ? "Replay Session" : "Practice Session"} meta={`${session.items.length} items`} />
      <View style={{ gap: 12 }}>
        {session.items.map((item, index) => (
          <View key={item.id} style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: dark.border, paddingTop: index === 0 ? 0 : 12 }}>
            <Text style={{ color: dark.text, fontSize: 12, fontWeight: "800" }}>{index + 1}. {item.prompt}</Text>
            <View style={{ marginTop: 8, gap: 7 }}>
              {(item.options ?? []).map((option) => {
                const selected = answers[item.id]?.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setAnswers((current) => ({ ...current, [item.id]: [option.id] }))}
                    style={{ borderRadius: 10, borderWidth: 1, borderColor: selected ? dark.blue : dark.border2, backgroundColor: selected ? dark.blueSoft : dark.surface2, padding: 10 }}
                  >
                    <Text style={{ color: dark.text, fontSize: 12 }}>{option.text}</Text>
                  </Pressable>
                );
              })}
            </View>
            {item.response?.feedback ? <Text style={{ marginTop: 8, color: dark.green, fontSize: 11 }}>{item.response.feedback}</Text> : null}
          </View>
        ))}
      </View>
      <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <Pressable onPress={onSubmit} style={{ borderRadius: 10, backgroundColor: canComplete ? dark.blue : dark.surface2, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: canComplete ? "#fff" : dark.muted, fontSize: 12, fontWeight: "800" }}>{submitLabel}</Text>
        </Pressable>
        <Pressable onPress={onComplete} disabled={!canComplete} style={{ borderRadius: 10, backgroundColor: canComplete ? dark.green : dark.surface2, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: canComplete ? "#fff" : dark.muted, fontSize: 12, fontWeight: "800" }}>Complete</Text>
        </Pressable>
      </View>
    </DarkPanel>
  );
}

function LearnersPathPanel({
  tab,
  setTab,
  paths,
  selectedPath,
  selectedClassId,
  overview,
  checkpoints,
  lessonSteps,
  replaySteps,
  onOpenPath,
  onBack,
  onOpenLesson,
  onOpenReplay,
  onCompleteCheckpoint,
}: {
  tab: LxpMobileTab;
  setTab: (tab: LxpMobileTab) => void;
  paths: LxpPathSummary[];
  selectedPath: LxpPathSummary | null;
  selectedClassId?: string;
  overview?: LxpOverviewResponse;
  checkpoints: LxpCheckpoint[];
  lessonSteps: LxpCheckpoint[];
  replaySteps: LxpCheckpoint[];
  onOpenPath: (path: LxpPathSummary) => void;
  onBack: () => void;
  onOpenLesson: (checkpoint: LxpCheckpoint) => void;
  onOpenReplay: () => void;
  onCompleteCheckpoint: (checkpointId: string) => void;
}) {
  if (!selectedClassId || tab === "paths") {
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: dark.blue, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 }}>Learners Path</Text>
        <Text style={{ color: dark.text, fontSize: 20, fontWeight: "900" }}>My Paths</Text>
        {paths.length ? paths.map((path) => (
          <Pressable key={path.classId} onPress={() => onOpenPath(path)}>
            <DarkPanel>
              <Text style={{ color: dark.text, fontSize: 15, fontWeight: "900" }}>{path.class.subjectName}</Text>
              <Text style={{ marginTop: 3, color: dark.muted, fontSize: 11 }}>{path.class.subjectCode}</Text>
              <View style={{ marginTop: 11, height: 4, borderRadius: 2, backgroundColor: dark.surface2 }}>
                <View style={{ width: `${Math.max(0, Math.min(100, path.progress.completionPercent))}%`, height: 4, borderRadius: 2, backgroundColor: dark.green }} />
              </View>
              <Text style={{ marginTop: 8, color: dark.muted, fontSize: 11 }}>
                {path.counts.steps} steps - {path.counts.replays} replays - {path.progress.completionPercent}% complete
              </Text>
            </DarkPanel>
          </Pressable>
        )) : (
          <EmptyState emoji="" title="No paths ready" subtitle="Learners Path classes will appear here once available." />
        )}
      </View>
    );
  }

  const currentTab: Exclude<LxpMobileTab, "paths"> = tab;
  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={onBack} style={{ alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: dark.border2, paddingHorizontal: 11, paddingVertical: 6 }}>
        <Text style={{ color: dark.muted, fontSize: 11, fontWeight: "800" }}>Back to Paths</Text>
      </Pressable>
      <DarkPanel>
        <Text style={{ color: dark.text, fontSize: 18, fontWeight: "900" }}>{overview?.selectedClass.subjectName ?? selectedPath?.class.subjectName ?? "Learners Path"}</Text>
        <Text style={{ marginTop: 4, color: dark.muted, fontSize: 11 }}>
          {overview?.selectedClass.section ? `Grade ${overview.selectedClass.section.gradeLevel} - ${overview.selectedClass.section.name}` : selectedPath?.class.subjectCode}
        </Text>
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          <Metric label="Progress" value={`${overview?.progress.completionPercent ?? selectedPath?.progress.completionPercent ?? 0}%`} />
          <Metric label="Status" value={overview?.interventionStatus.label ?? selectedPath?.status ?? "Active"} />
          <Metric label="Tasks" value={String(checkpoints.length)} />
        </View>
      </DarkPanel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[
          { key: "steps" as const, label: "Assigned Steps" },
          { key: "replays" as const, label: "Replays" },
          { key: "case" as const, label: "Case File" },
          { key: "overview" as const, label: "Overview" },
        ].map((entry) => (
          <Pressable key={entry.key} onPress={() => setTab(entry.key)} style={{ borderRadius: 999, borderWidth: 1, borderColor: currentTab === entry.key ? dark.blue : dark.border2, backgroundColor: currentTab === entry.key ? dark.blueSoft : dark.surface2, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: currentTab === entry.key ? dark.blue : dark.muted, fontSize: 11, fontWeight: "800" }}>{entry.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {currentTab === "steps" ? (
        <CheckpointList checkpoints={lessonSteps} empty="No lesson-review steps assigned." onOpenLesson={onOpenLesson} onOpenReplay={onOpenReplay} onCompleteCheckpoint={onCompleteCheckpoint} />
      ) : null}
      {currentTab === "replays" ? (
        <CheckpointList checkpoints={replaySteps} empty="No assessment replays assigned." onOpenLesson={onOpenLesson} onOpenReplay={onOpenReplay} onCompleteCheckpoint={onCompleteCheckpoint} />
      ) : null}
      {currentTab === "case" ? (
        <DarkPanel>
          <SectionLabel title="Case File" />
          <Text style={{ color: dark.text, fontSize: 13, fontWeight: "800" }}>{overview?.interventionStatus.label ?? "Active path"}</Text>
          <Text style={{ marginTop: 6, color: dark.muted, fontSize: 12, lineHeight: 18 }}>{overview?.interventionStatus.message ?? "Path case data is ready from the backend."}</Text>
        </DarkPanel>
      ) : null}
      {currentTab === "overview" ? (
        <DarkPanel>
          <SectionLabel title="Overview" />
          {(overview?.weakFocusItems ?? []).length ? overview!.weakFocusItems.map((item) => (
            <Text key={item.id} style={{ color: dark.muted, fontSize: 12, lineHeight: 19 }}>- {item.title}: {item.subtitle}</Text>
          )) : <Text style={{ color: dark.muted, fontSize: 12 }}>No weak focus items yet.</Text>}
        </DarkPanel>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: "rgba(255,255,255,0.03)", padding: 10 }}>
      <Text style={{ color: dark.text, fontSize: 15, fontWeight: "900" }}>{value}</Text>
      <Text style={{ marginTop: 2, color: dark.muted, fontSize: 9 }}>{label}</Text>
    </View>
  );
}

function CheckpointList({
  checkpoints,
  empty,
  onOpenLesson,
  onOpenReplay,
  onCompleteCheckpoint,
}: {
  checkpoints: LxpCheckpoint[];
  empty: string;
  onOpenLesson: (checkpoint: LxpCheckpoint) => void;
  onOpenReplay: () => void;
  onCompleteCheckpoint: (checkpointId: string) => void;
}) {
  if (!checkpoints.length) {
    return (
      <DarkPanel>
        <Text style={{ color: dark.muted, fontSize: 12 }}>{empty}</Text>
      </DarkPanel>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {checkpoints.map((checkpoint, index) => (
        <DarkPanel key={checkpoint.id}>
          <Text style={{ color: dark.text, fontSize: 13, fontWeight: "800" }}>{index + 1}. {checkpoint.label}</Text>
          <Text style={{ marginTop: 4, color: dark.muted, fontSize: 11 }}>{checkpoint.xpAwarded} XP - {checkpoint.isCompleted ? "Done" : "Available"}</Text>
          <View style={{ marginTop: 10, flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            {checkpoint.type === "assessment_retry" ? (
              <Pressable onPress={onOpenReplay} style={{ borderRadius: 9, backgroundColor: dark.amberSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: dark.amber, fontSize: 11, fontWeight: "900" }}>Open JA Hub</Text>
              </Pressable>
            ) : checkpoint.lesson?.id ? (
              <>
                <Pressable onPress={() => onOpenLesson(checkpoint)} style={{ borderRadius: 9, backgroundColor: dark.blueSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: dark.blue, fontSize: 11, fontWeight: "900" }}>Open Lesson</Text>
                </Pressable>
                {!checkpoint.isCompleted ? (
                  <Pressable onPress={() => onCompleteCheckpoint(checkpoint.id)} style={{ borderRadius: 9, backgroundColor: dark.greenSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: dark.green, fontSize: 11, fontWeight: "900" }}>Mark Complete</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        </DarkPanel>
      ))}
    </View>
  );
}
