import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { aiApi } from "../api/services/ai";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherInlineField,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  stripRichText,
} from "../components/teacher/TeacherMobilePrimitives";

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

export function TeacherAiDraftScreen({ navigation, route }: AiDraftProps) {
  const { classId } = route.params;
  const [indexStatus, setIndexStatus] = useState<Awaited<ReturnType<typeof aiApi.getClassIndexStatus>> | null>(null);
  const [job, setJob] = useState<Awaited<ReturnType<typeof aiApi.createQuizDraftJob>> | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof aiApi.getQuizDraftJobResult>> | null>(null);
  const [title, setTitle] = useState("AI Draft Assessment");
  const [questionCount, setQuestionCount] = useState("10");
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [teacherNote, setTeacherNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const loadJobResult = useCallback(async (jobId: string) => {
    try {
      const res = await aiApi.getQuizDraftJobResult(jobId);
      setResult(res);
    } catch (error) {
      Alert.alert("Unable to load quiz draft result", getErrorMessage(error));
    }
  }, []);

  const refreshJob = useCallback(async () => {
    if (!job?.id) return;
    try {
      const nextJob = await aiApi.getTeacherJobStatus(job.id);
      setJob(nextJob);
      if (nextJob.status === "completed" || nextJob.status === "approved") {
        void loadJobResult(nextJob.id);
      }
    } catch (error) {
      Alert.alert("Unable to refresh job", getErrorMessage(error));
    }
  }, [job?.id, loadJobResult]);

  // Automatic status polling while job is in progress
  useEffect(() => {
    if (!job?.id || ["completed", "approved", "failed", "cancelled", "rejected"].includes(job.status)) {
      return;
    }
    const timer = setInterval(() => {
      void refreshJob();
    }, 5000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, refreshJob]);

  const createJob = async () => {
    try {
      setSubmitting(true);
      setResult(null);
      const parsedCount = Math.max(1, Math.min(15, Number.parseInt(questionCount, 10) || 10));
      const created = await aiApi.createQuizDraftJob({
        classId,
        title: title.trim() || "AI Draft Assessment",
        questionCount: parsedCount,
        questionType,
        teacherNote: teacherNote.trim() || undefined,
      });
      setJob(created);
      Alert.alert("Success", "Quiz draft generation job started.");
    } catch (error) {
      Alert.alert("Unable to create AI draft", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const applyJob = async () => {
    if (!job?.id) return;
    try {
      setApplying(true);
      const res = await aiApi.applyQuizDraftJob(job.id);
      Alert.alert("Success", "AI Quiz Draft applied as an unpublished assessment.");
      if (res?.assessmentId) {
        navigation.navigate("TeacherAssessmentEditor", { assessmentId: res.assessmentId, classId });
      }
    } catch (error) {
      Alert.alert("Unable to apply draft", getErrorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  const deleteJob = async () => {
    if (!job?.id) return;
    try {
      await aiApi.deleteTeacherJob(job.id);
      setJob(null);
      setResult(null);
      Alert.alert("Deleted", "AI draft job deleted.");
    } catch (error) {
      Alert.alert("Unable to delete job", getErrorMessage(error));
    }
  };

  const outputId = job?.outputId || result?.result?.outputId;
  const questions = result?.result?.structuredOutput?.questions ?? [];
  const questionTotal = questions.length;

  return (
    <TeacherScreen
      title="AI Draft"
      subtitle="Mobile source readiness, class reindexing, AI quiz draft jobs, and generated assessment handoff."
      icon="robot-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={loading}
      onRefresh={() => void loadStatus()}
    >
      <TeacherStats
        items={[
          { label: "Ready lessons", value: indexStatus?.sourceSummary?.lessons?.ready ?? 0, tone: "green" },
          { label: "Ready extracts", value: indexStatus?.sourceSummary?.extractions?.ready ?? 0, tone: "blue" },
          { label: "Job", value: job?.status || "None", tone: job?.status === "failed" ? "red" : "amber" },
          { label: "Questions", value: questionTotal, tone: "purple" },
        ]}
      />

      <TeacherPanel title="Sources" subtitle="Readiness uses the same class index status and reindex endpoint as the web AI draft page.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton label="Refresh status" icon="refresh" tone="blue" onPress={() => void loadStatus()} />
          <TeacherActionButton
            label="Reindex class"
            icon="database-refresh-outline"
            tone="amber"
            onPress={() => void aiApi.reindexClass(classId).then(loadStatus).catch((error) => Alert.alert("Unable to reindex", getErrorMessage(error)))}
          />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Generate quiz draft" subtitle="Creates a teacher AI quiz draft job from ready class sources.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} />
          <TeacherInlineField label="Question count (1-15)" value={questionCount} onChangeText={setQuestionCount} />
          
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 8, marginBottom: 4 }}>
            Question Type
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {QUESTION_TYPES.map((type) => {
              const selected = questionType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setQuestionType(type.value)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: selected ? "#4f46e5" : "#f3f4f6",
                    borderWidth: 1,
                    borderColor: selected ? "#4f46e5" : "#e5e7eb",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: selected ? "#ffffff" : "#374151" }}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TeacherInlineField label="Teacher note (optional)" value={teacherNote} onChangeText={setTeacherNote} multiline />

          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton
              label={submitting ? "Generating..." : "Generate"}
              icon="auto-fix"
              tone="green"
              disabled={submitting}
              onPress={() => void createJob()}
            />
            <TeacherActionButton
              label="Refresh job"
              icon="refresh"
              tone="blue"
              disabled={!job}
              onPress={() => void refreshJob()}
            />
            <TeacherActionButton
              label="Delete job"
              icon="trash-can-outline"
              tone="red"
              disabled={!job}
              onPress={() => void deleteJob()}
            />
          </View>
        </View>
      </TeacherPanel>

      <TeacherPanel
        title="Generated result"
        subtitle={
          job?.status === "processing" || job?.status === "pending"
            ? "Generation in progress... Auto-polling status every 5 seconds."
            : job?.message || job?.errorMessage || "Refresh after the job completes."
        }
      >
        {result?.result?.structuredOutput ? (
          <>
            <TeacherRow
              title={result.result.structuredOutput.title || "AI draft"}
              subtitle={stripRichText(result.result.structuredOutput.description || "Generated quiz draft")}
            />
            {questions.map((question, index) => (
              <TeacherRow
                key={`${question.content}-${index}`}
                title={`Q${index + 1}: ${stripRichText(question.content || "No question text")}`}
                subtitle={`Type: ${question.type || "multiple_choice"} • Points: ${question.points ?? 1}`}
              />
            ))}
            <View style={{ paddingHorizontal: 14, paddingVertical: 14, gap: 8 }}>
              <TeacherActionButton
                label={applying ? "Applying draft..." : "Apply AI Draft to Class"}
                icon="check-decagram-outline"
                tone="green"
                disabled={applying}
                onPress={() => void applyJob()}
              />
            </View>
          </>
        ) : (
          <TeacherEmpty
            title="No result loaded"
            subtitle={
              job?.status === "processing" || job?.status === "pending"
                ? `Job state: ${job.status} (${job.progressPercent}%). Polling...`
                : "Generate a job, then refresh until a result is available."
            }
            icon="robot-confused-outline"
          />
        )}
        {outputId && !questions.length ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <TeacherActionButton
              label="Open generated assessment editor"
              icon="clipboard-edit-outline"
              tone="blue"
              onPress={() => navigation.navigate("TeacherAssessmentEditor", { assessmentId: outputId, classId })}
            />
          </View>
        ) : null}
      </TeacherPanel>
    </TeacherScreen>
  );
}
