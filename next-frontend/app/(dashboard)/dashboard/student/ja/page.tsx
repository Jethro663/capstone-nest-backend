"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CircleDot,
  Loader2,
  MessageCircleQuestion,
  ShieldAlert,
  Sparkles,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { jaService } from "@/services/ja-service";
import type {
  JaAskMessage,
  JaHubResponse,
  JaMode,
  JaPracticeSessionItem,
  JaPracticeSessionResponse,
} from "@/types/ja";
import "./ja-hub.css";

type AnswerState = Record<string, string[]>;

function itemReady(item: JaPracticeSessionItem, selected: string[] | undefined) {
  if (!selected || selected.length === 0) return false;
  return item.itemType === "multiple_select" ? selected.length > 0 : Boolean(selected[0]);
}

function classLabel(item: { subjectName: string; subjectCode: string }) {
  return `${item.subjectName} (${item.subjectCode})`;
}

export default function StudentJaPage() {
  const [hub, setHub] = useState<JaHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<JaMode>("practice");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [practiceSession, setPracticeSession] = useState<JaPracticeSessionResponse | null>(null);
  const [reviewSession, setReviewSession] = useState<JaPracticeSessionResponse | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [busy, setBusy] = useState(false);

  const [askThreadId, setAskThreadId] = useState<string>("");
  const [askMessages, setAskMessages] = useState<JaAskMessage[]>([]);
  const [askInput, setAskInput] = useState("");
  const [showGuardrailModal, setShowGuardrailModal] = useState(false);

  const refreshHub = useCallback(async (classId?: string) => {
    setLoading(true);
    try {
      const res = await jaService.getHub(classId);
      setHub(res.data);
      const nextClassId = res.data.selectedClassId ?? classId ?? res.data.classes[0]?.id ?? "";
      setSelectedClassId(nextClassId);
      if (!askThreadId && res.data.ask.threads[0]?.id) {
        setAskThreadId(res.data.ask.threads[0].id);
      }
    } catch {
      toast.error("Failed to load JA hub.");
      setHub(null);
    } finally {
      setLoading(false);
    }
  }, [askThreadId]);

  useEffect(() => {
    void refreshHub();
  }, [refreshHub]);

  useEffect(() => {
    if (!askThreadId || mode !== "ask") return;
    void (async () => {
      try {
        const res = await jaService.getAskThread(askThreadId);
        setAskMessages(res.data.messages);
      } catch {
        toast.error("Failed to load JA Ask thread.");
      }
    })();
  }, [askThreadId, mode]);

  useEffect(() => {
    const activeSession = mode === "practice" ? practiceSession : reviewSession;
    if (!activeSession || activeSession.session.status !== "active") return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const fn =
        mode === "practice" ? jaService.logEvent : jaService.logReviewEvent;
      void fn(activeSession.session.id, "focus_strike", {
        reason: "visibility_hidden",
        at: new Date().toISOString(),
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [mode, practiceSession, reviewSession]);

  const currentSession = mode === "practice" ? practiceSession : reviewSession;
  const activeItem = useMemo(() => {
    if (!currentSession) return null;
    return (
      currentSession.items.find((item) => !item.response) ??
      currentSession.items[currentSession.items.length - 1] ??
      null
    );
  }, [currentSession]);

  const answeredCount = useMemo(
    () => currentSession?.items.filter((item) => Boolean(item.response)).length ?? 0,
    [currentSession],
  );
  const canComplete = Boolean(
    currentSession &&
      currentSession.session.status === "active" &&
      answeredCount === currentSession.session.questionCount,
  );

  const loadSession = async (sessionId: string, targetMode: JaMode) => {
    try {
      const res =
        targetMode === "practice"
          ? await jaService.getSession(sessionId)
          : await jaService.getReviewSession(sessionId);
      if (targetMode === "practice") setPracticeSession(res.data);
      if (targetMode === "review") setReviewSession(res.data);

      const draft: AnswerState = {};
      res.data.items.forEach((item) => {
        const answer = item.response?.studentAnswer;
        if (!answer || typeof answer !== "object") return;
        if (Array.isArray((answer as { selectedOptionIds?: unknown }).selectedOptionIds)) {
          draft[item.id] = (answer as { selectedOptionIds: string[] }).selectedOptionIds;
          return;
        }
        if (typeof (answer as { selectedOptionId?: unknown }).selectedOptionId === "string") {
          draft[item.id] = [(answer as { selectedOptionId: string }).selectedOptionId];
        }
      });
      setAnswers(draft);
    } catch {
      toast.error("Failed to load JA session.");
    }
  };

  const startPractice = async () => {
    if (!hub || !selectedClassId) return;
    setBusy(true);
    try {
      const recommendation = hub.practice.recommendations[0];
      const res = await jaService.createSession({ classId: selectedClassId, recommendation });
      setPracticeSession(res.data);
      setMode("practice");
      toast.success("Practice mission generated.");
      await refreshHub(selectedClassId);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "JA could not generate practice yet.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const startReview = async (attemptId: string) => {
    if (!selectedClassId) return;
    setBusy(true);
    try {
      const res = await jaService.createReviewSession({
        classId: selectedClassId,
        attemptId,
        questionCount: 10,
      });
      setReviewSession(res.data);
      setMode("review");
      await refreshHub(selectedClassId);
      toast.success("Review session started.");
    } catch {
      toast.error("Unable to generate review session.");
    } finally {
      setBusy(false);
    }
  };

  const submitCurrentAnswer = async () => {
    if (!currentSession || !activeItem) return;
    const selected = answers[activeItem.id];
    if (!itemReady(activeItem, selected)) {
      toast.error("Select an answer first.");
      return;
    }
    setBusy(true);
    try {
      const payload =
        activeItem.itemType === "multiple_select"
          ? { selectedOptionIds: selected }
          : { selectedOptionId: selected?.[0] };
      if (mode === "practice") {
        await jaService.submitResponse(currentSession.session.id, {
          itemId: activeItem.id,
          answer: payload,
        });
        await loadSession(currentSession.session.id, "practice");
      } else {
        await jaService.submitReviewResponse(currentSession.session.id, {
          itemId: activeItem.id,
          answer: payload,
        });
        await loadSession(currentSession.session.id, "review");
      }
    } catch {
      toast.error("Failed to save answer.");
    } finally {
      setBusy(false);
    }
  };

  const sendAsk = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedClassId) return;
    const content = askInput.trim();
    if (!content) return;
    setBusy(true);
    try {
      let threadId = askThreadId;
      if (!threadId) {
        const created = await jaService.createAskThread({ classId: selectedClassId });
        threadId = created.data.thread.id;
        setAskThreadId(threadId);
      }
      const response = await jaService.sendAskMessage(threadId, { message: content });
      setAskMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, role: "student", content, blocked: false },
        response.data.message,
      ]);
      setAskInput("");
      if (response.data.blocked) setShowGuardrailModal(true);
      await refreshHub(selectedClassId);
    } catch {
      toast.error("JA Ask failed to respond.");
    } finally {
      setBusy(false);
    }
  };

  const completeCurrentSession = async () => {
    if (!currentSession) return;
    setBusy(true);
    try {
      if (mode === "practice") {
        await jaService.completeSession(currentSession.session.id);
        await loadSession(currentSession.session.id, "practice");
      } else {
        await jaService.completeReviewSession(currentSession.session.id);
        await loadSession(currentSession.session.id, "review");
      }
      await refreshHub(selectedClassId);
      toast.success("Session completed.");
    } catch {
      toast.error("Unable to complete session.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="ja-hub-loading">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hub || hub.classes.length === 0) {
    return <div className="ja-hub-empty">No eligible classes yet for JA.</div>;
  }

  return (
    <div className="ja-hub-layout">
      <aside className="ja-mode-panel">
        <h2>STUDY MODES</h2>
        <button className={`ja-mode-card practice ${mode === "practice" ? "active" : ""}`} onClick={() => setMode("practice")}><Swords />Practice</button>
        <button className={`ja-mode-card ask ${mode === "ask" ? "active" : ""}`} onClick={() => setMode("ask")}><MessageCircleQuestion />Ask</button>
        <button className={`ja-mode-card review ${mode === "review" ? "active" : ""}`} onClick={() => setMode("review")}><CircleDot />Review</button>
        {mode === "practice" ? (
          <div className="ja-saved-list">
            <p>Saved Practice</p>
            {hub.practice.sessions.map((session) => (
              <button key={session.id} onClick={() => void loadSession(session.id, "practice")}>
                {session.status} {session.currentIndex}/{session.questionCount}
              </button>
            ))}
          </div>
        ) : null}
        {mode === "review" ? (
          <div className="ja-saved-list">
            <p>Saved Review</p>
            {hub.review.sessions?.map((session) => (
              <button key={session.id} onClick={() => void loadSession(session.id, "review")}>
                {session.status} {session.currentIndex}/{session.questionCount}
              </button>
            ))}
          </div>
        ) : null}
      </aside>

      <section className="ja-center-panel">
        <header className="ja-center-head">
          <div className="ja-head-title"><Bot /> <div><strong>Ja</strong><span>Online and ready to play</span></div></div>
          <select value={selectedClassId} onChange={(e) => void refreshHub(e.target.value)}>
            {hub.classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
          </select>
        </header>

        {mode === "ask" ? (
          <div className="ja-thread-shell">
            <div className="ja-thread-messages">
              {askMessages.length === 0 ? <p>Ask Ja anything about your selected class.</p> : askMessages.map((msg) => <div key={msg.id} className={`ja-msg ${msg.role === "student" ? "student" : "ja"}`}>{msg.content}</div>)}
            </div>
            <form onSubmit={sendAsk} className="ja-composer">
              <input value={askInput} onChange={(e) => setAskInput(e.target.value)} placeholder="Ask Ja anything or start a quest..." />
              <Button type="submit" disabled={busy}><Sparkles className="mr-2 h-4 w-4" />Send</Button>
            </form>
          </div>
        ) : (
          <div className="ja-session-shell">
            {!currentSession ? (
              <div className="ja-session-empty">
                {mode === "practice" ? (
                  <Button onClick={() => void startPractice()} disabled={busy}>Start Practice</Button>
                ) : (
                  <div className="ja-review-attempts">
                    <p>Select an assessment to review:</p>
                    {hub.review.eligibleAttempts.map((attempt) => (
                      <button key={attempt.attemptId} onClick={() => void startReview(attempt.attemptId)}>
                        {attempt.assessmentTitle} {attempt.score !== null ? `(${attempt.score}%)` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="ja-session-active">
                <p>{answeredCount}/{currentSession.session.questionCount} completed</p>
                <Progress value={(answeredCount / Math.max(currentSession.session.questionCount, 1)) * 100} />
                {activeItem ? (
                  <div className="ja-question">
                    <h3>{activeItem.prompt}</h3>
                    {(activeItem.options ?? []).map((option) => {
                      const selected = (answers[activeItem.id] ?? []).includes(option.id);
                      return (
                        <button key={option.id} className={selected ? "selected" : ""} onClick={() => {
                          setAnswers((prev) => ({ ...prev, [activeItem.id]: activeItem.itemType === "multiple_select" ? ((prev[activeItem.id] ?? []).includes(option.id) ? (prev[activeItem.id] ?? []).filter((v) => v !== option.id) : [...(prev[activeItem.id] ?? []), option.id]) : [option.id] }));
                        }} disabled={Boolean(activeItem.response)}>
                          {option.text}
                        </button>
                      );
                    })}
                    {activeItem.response ? <div className="ja-feedback">{activeItem.response.feedback}</div> : null}
                    <Button onClick={() => void submitCurrentAnswer()} disabled={busy || Boolean(activeItem.response) || !itemReady(activeItem, answers[activeItem.id])}>Submit Answer</Button>
                    {canComplete ? (
                      <Button variant="outline" onClick={() => void completeCurrentSession()} disabled={busy}>
                        Complete Session
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="ja-progress-panel">
        <h2>LEARNING PROGRESS</h2>
        <div className="ja-mastery-ring">
          <div style={{ ["--progress" as string]: `${hub.mastery?.percent ?? 0}` }} />
          <strong>{hub.mastery?.percent ?? 0}%</strong>
        </div>
        <div className="ja-stats">
          <p>XP: {hub.progress?.xpTotal ?? 0}</p>
          <p>Streak: {hub.progress?.streakDays ?? 0}</p>
          <p>Sessions: {hub.progress?.sessionsCompleted ?? 0}</p>
        </div>
        <div className="ja-badges">
          {hub.badges.map((badge) => (
            <div key={badge.id} className={badge.unlocked ? "badge unlocked" : "badge locked"}>
              {badge.label} (Lv {badge.level})
            </div>
          ))}
        </div>
      </aside>

      {showGuardrailModal ? (
        <div className="ja-guardrail-modal">
          <div>
            <ShieldAlert />
            <h3>JA blocked that request</h3>
            <p>This attempt was logged for safety review. Ask a class-grounded study question instead.</p>
            <Button onClick={() => setShowGuardrailModal(false)}>Close</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
