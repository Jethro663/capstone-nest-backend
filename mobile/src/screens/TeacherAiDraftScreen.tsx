import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { aiApi } from "../api/services/ai";
import { toAppError } from "../api/http";
import {
  clearTeacherAiDraftJobId,
  readTeacherAiDraftJobId,
  writeTeacherAiDraftJobId,
} from "../api/teacher-ai-draft-jobs";
import type { RootStackParamList } from "../navigation/types";
import type { QuizDraftStructuredOutput } from "../types/ai";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherInlineField,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  acceptReviewWarning,
  buildQuizDraftSourceFields,
  canGenerateQuizDraft,
  markQuestionReviewed,
} from "./teacher-ai-draft/model";
import { TeacherAiDraftReviewPanel } from "./teacher-ai-draft/TeacherAiDraftReviewPanel";

type AiDraftProps = NativeStackScreenProps<RootStackParamList, "TeacherAiDraft">;

function getErrorMessage(error: unknown) {
  return toAppError(error).message;
}

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "multiple_select", label: "Multiple Select" },
];
const TERMINAL_STATUSES = ["completed", "approved", "failed", "cancelled", "rejected"];

export function TeacherAiDraftScreen({ navigation, route }: AiDraftProps) {
  const { classId } = route.params;
  const [indexStatus, setIndexStatus] = useState<Awaited<ReturnType<typeof aiApi.getClassIndexStatus>> | null>(null);
  const [job, setJob] = useState<Awaited<ReturnType<typeof aiApi.createQuizDraftJob>> | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof aiApi.getQuizDraftJobResult>> | null>(null);
  const [title, setTitle] = useState("AI Draft Assessment");
  const [questionCount, setQuestionCount] = useState("10");
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [teacherNote, setTeacherNote] = useState("");
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [selectedExtractionIds, setSelectedExtractionIds] = useState<string[]>([]);
  const [useAllReadySources, setUseAllReadySources] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [restoringJob, setRestoringJob] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setIndexStatus(await aiApi.getClassIndexStatus(classId));
    } catch (error) {
      Alert.alert("Unable to load AI readiness", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const loadJobResult = useCallback(async (jobId: string) => {
    try {
      setResult(await aiApi.getQuizDraftJobResult(jobId));
    } catch (error) {
      Alert.alert("Unable to load quiz draft result", getErrorMessage(error));
    }
  }, []);

  useEffect(() => void loadStatus(), [loadStatus]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const jobId = await readTeacherAiDraftJobId(classId);
        if (!jobId || !active) return;
        const restored = await aiApi.getTeacherJobStatus(jobId);
        if (!active) return;
        setJob(restored);
        if (restored.status === "completed" || restored.status === "approved") await loadJobResult(restored.id);
      } catch (error) {
        if (active) Alert.alert("Unable to restore AI draft", getErrorMessage(error));
      } finally {
        if (active) setRestoringJob(false);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [classId, loadJobResult]);

  const refreshJob = useCallback(async () => {
    if (!job?.id) return;
    try {
      const nextJob = await aiApi.getTeacherJobStatus(job.id);
      setJob(nextJob);
      if (nextJob.status === "completed" || nextJob.status === "approved") await loadJobResult(nextJob.id);
    } catch (error) {
      Alert.alert("Unable to refresh job", getErrorMessage(error));
    }
  }, [job?.id, loadJobResult]);

  useEffect(() => {
    if (!job?.id || TERMINAL_STATUSES.includes(job.status)) return;
    const timer = setInterval(() => void refreshJob(), 5000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, refreshJob]);

  const toggleLesson = (lessonId: string) => {
    setUseAllReadySources(false);
    setSelectedLessonIds((current) => current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId]);
  };
  const toggleExtraction = (extractionId: string) => {
    setUseAllReadySources(false);
    setSelectedExtractionIds((current) => current.includes(extractionId) ? current.filter((id) => id !== extractionId) : [...current, extractionId]);
  };
  const toggleAllSources = () => {
    setUseAllReadySources((current) => {
      const next = !current;
      if (next) {
        setSelectedLessonIds([]);
        setSelectedExtractionIds([]);
      }
      return next;
    });
  };

  const reindexClass = async () => {
    try {
      setReindexing(true);
      await aiApi.reindexClass(classId);
      await loadStatus();
      Alert.alert("Sources indexed", "Published class sources are ready for AI generation.");
    } catch (error) {
      Alert.alert("Unable to reindex", getErrorMessage(error));
    } finally {
      setReindexing(false);
    }
  };

  const createJob = async () => {
    try {
      setSubmitting(true);
      setResult(null);
      const sourceFields = buildQuizDraftSourceFields(useAllReadySources, selectedLessonIds, selectedExtractionIds);
      const created = await aiApi.createQuizDraftJob({
        classId,
        title: title.trim() || "AI Draft Assessment",
        questionCount: Math.max(1, Math.min(15, Number.parseInt(questionCount, 10) || 10)),
        questionType,
        teacherNote: teacherNote.trim() || undefined,
        allowDraftSources: false,
        ...sourceFields,
      });
      setJob(created);
      await writeTeacherAiDraftJobId(classId, created.id);
      Alert.alert("Success", "Quiz draft generation job started.");
    } catch (error) {
      Alert.alert("Unable to create AI draft", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const retryJob = async () => {
    if (!job?.id) return;
    try {
      const retried = await aiApi.retryQuizDraftJob(job.id);
      setJob(retried);
      setResult(null);
      await writeTeacherAiDraftJobId(classId, retried.id);
    } catch (error) {
      Alert.alert("Unable to retry generation", getErrorMessage(error));
    }
  };

  const clearJob = async (action: "cancel" | "delete") => {
    if (!job?.id) return;
    try {
      if (action === "cancel") await aiApi.cancelQuizDraftJob(job.id);
      else await aiApi.deleteTeacherJob(job.id);
      await clearTeacherAiDraftJobId(classId);
      setJob(null);
      setResult(null);
      if (action === "delete") Alert.alert("Deleted", "AI draft job deleted.");
    } catch (error) {
      Alert.alert(action === "cancel" ? "Unable to cancel job" : "Unable to delete job", getErrorMessage(error));
    }
  };

  const persistDraft = async (nextDraft: QuizDraftStructuredOutput, previousDraft: QuizDraftStructuredOutput) => {
    if (!job?.id) return;
    setResult((current) => current?.result ? { ...current, result: { ...current.result, structuredOutput: nextDraft } } : current);
    try {
      setSavingDraft(true);
      await aiApi.updateQuizDraft(job.id, { structuredOutput: nextDraft });
    } catch (error) {
      setResult((current) => current?.result ? { ...current, result: { ...current.result, structuredOutput: previousDraft } } : current);
      Alert.alert("Unable to save review", getErrorMessage(error));
    } finally {
      setSavingDraft(false);
    }
  };

  const applyJob = async () => {
    if (!job?.id) return;
    try {
      setApplying(true);
      const response = await aiApi.applyQuizDraftJob(job.id);
      await clearTeacherAiDraftJobId(classId);
      navigation.navigate("TeacherAssessmentEditor", { assessmentId: response.applyResult.assessmentId, classId });
    } catch (error) {
      Alert.alert("Unable to apply draft", getErrorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  const previewAndApply = async () => {
    if (!job?.id) return;
    try {
      setApplying(true);
      const preview = await aiApi.previewQuizDraftApply(job.id);
      if (!preview.canApply) {
        Alert.alert("Draft needs review", preview.blockedReasons[0] || "Resolve review issues before applying.");
        return;
      }
      Alert.alert(
        preview.alreadyApplied ? "Draft already applied" : "Apply quiz draft?",
        `${preview.assessment.title} - ${preview.assessment.questionCount} question(s), ${preview.assessment.totalPoints} point(s).`,
        [
          { text: "Keep reviewing", style: "cancel" },
          { text: preview.alreadyApplied ? "Open assessment" : "Apply draft", onPress: () => void applyJob() },
        ],
      );
    } catch (error) {
      Alert.alert("Unable to preview draft", getErrorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  const draft = result?.result?.structuredOutput;
  const degradedResult = result?.result?.outputType === "degraded_unavailable";
  const canGenerate = !submitting && !restoringJob && canGenerateQuizDraft(indexStatus, useAllReadySources, selectedLessonIds, selectedExtractionIds);
  const jobDetail = job?.errorMessage || job?.statusMessage || job?.message;

  return (
    <TeacherScreen
      title="AI Draft"
      subtitle="Choose published indexed sources, generate a grounded draft, review it, then create an unpublished assessment."
      icon="robot-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void loadStatus()}
    >
      <TeacherStats items={[
        { label: "Ready lessons", value: indexStatus?.sourceSummary.lessons.ready ?? 0, tone: "green" },
        { label: "Ready extracts", value: indexStatus?.sourceSummary.extractions.ready ?? 0, tone: "blue" },
        { label: "Job", value: job?.status || "None", tone: job?.status === "failed" ? "red" : "amber" },
        { label: "Questions", value: draft?.questions.length ?? 0, tone: "purple" },
      ]} />

      <TeacherPanel title="Sources" subtitle="Only published, indexed lessons and extracted materials can ground this quiz.">
        {indexStatus?.reason ? <Text style={{ paddingHorizontal: 14, paddingBottom: 10, color: "#92400e" }}>{indexStatus.reason}</Text> : null}
        <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <TeacherActionButton label={`Use all ready sources${useAllReadySources ? " (selected)" : ""}`} icon="layers-outline" tone={useAllReadySources ? "green" : "blue"} onPress={toggleAllSources} />
        </View>
        {(indexStatus?.readyLessons ?? []).map((source) => (
          <TeacherRow key={source.lessonId} title={`${source.title}${selectedLessonIds.includes(source.lessonId) ? " (selected)" : ""}`} subtitle={`${source.chunkCount} indexed chunk(s)`} onPress={() => toggleLesson(source.lessonId)} />
        ))}
        {(indexStatus?.readyExtractions ?? []).map((source) => (
          <TeacherRow key={source.extractionId} title={`${source.title}${selectedExtractionIds.includes(source.extractionId) ? " (selected)" : ""}`} subtitle={`${source.chunkCount} indexed chunk(s)`} onPress={() => toggleExtraction(source.extractionId)} />
        ))}
        {(indexStatus?.lessonBlockers ?? []).map((source) => <TeacherRow key={source.lessonId} title={`${source.title} (blocked)`} subtitle={source.reason} />)}
        {(indexStatus?.extractionBlockers ?? []).map((source) => <TeacherRow key={source.extractionId} title={`${source.title} (blocked)`} subtitle={source.reason} />)}
        <View style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton label="Refresh status" icon="refresh" tone="blue" onPress={() => void loadStatus()} />
          <TeacherActionButton label={reindexing ? "Reindexing..." : "Reindex class"} icon="database-refresh-outline" tone="amber" disabled={reindexing} onPress={() => void reindexClass()} />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Generate quiz draft" subtitle="Generation starts only when the selected source scope is ready.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} />
          <TeacherInlineField label="Question count (1-15)" value={questionCount} onChangeText={setQuestionCount} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 8, marginBottom: 4 }}>Question Type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {QUESTION_TYPES.map((type) => {
              const selected = questionType === type.value;
              return (
                <TouchableOpacity key={type.value} onPress={() => setQuestionType(type.value)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: selected ? "#4f46e5" : "#f3f4f6", borderWidth: 1, borderColor: selected ? "#4f46e5" : "#e5e7eb" }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: selected ? "#ffffff" : "#374151" }}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TeacherInlineField label="Teacher note (optional)" value={teacherNote} onChangeText={setTeacherNote} multiline />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label={submitting ? "Generating..." : "Generate"} icon="auto-fix" tone="green" disabled={!canGenerate} onPress={() => void createJob()} />
            <TeacherActionButton label="Refresh job" icon="refresh" tone="blue" disabled={!job} onPress={() => void refreshJob()} />
            {job?.status === "failed" ? <TeacherActionButton label="Retry generation" icon="refresh" tone="amber" onPress={() => void retryJob()} /> : null}
            {job && !TERMINAL_STATUSES.includes(job.status) ? <TeacherActionButton label="Cancel generation" icon="cancel" tone="amber" onPress={() => void clearJob("cancel")} /> : null}
            <TeacherActionButton label="Delete job" icon="trash-can-outline" tone="red" disabled={!job} onPress={() => void clearJob("delete")} />
          </View>
        </View>
      </TeacherPanel>

      <TeacherPanel title="Generated result" subtitle={jobDetail || (job && !TERMINAL_STATUSES.includes(job.status) ? "Generation in progress. Status refreshes every 5 seconds." : "Review the generated questions before applying.")}>
        {draft && !degradedResult ? (
          <TeacherAiDraftReviewPanel
            draft={draft}
            saving={savingDraft}
            applying={applying}
            onMarkQuestionReviewed={(index) => void persistDraft(markQuestionReviewed(draft, index), draft)}
            onAcceptWarning={(issueId) => void persistDraft(acceptReviewWarning(draft, issueId), draft)}
            onPreviewApply={() => void previewAndApply()}
          />
        ) : (
          <TeacherEmpty
            title={degradedResult ? "Draft result unavailable" : "No result loaded"}
            subtitle={degradedResult ? "This fallback result cannot be applied. Retry generation when the AI service is available." : job && !TERMINAL_STATUSES.includes(job.status) ? `Job state: ${job.status} (${job.progressPercent ?? 0}%). Polling...` : jobDetail || "Generate a job, then wait for its result."}
            icon="robot-confused-outline"
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
