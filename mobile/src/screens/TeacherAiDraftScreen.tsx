import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";
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

export function TeacherAiDraftScreen({ navigation, route }: AiDraftProps) {
  const { classId } = route.params;
  const [indexStatus, setIndexStatus] = useState<Awaited<ReturnType<typeof aiApi.getClassIndexStatus>> | null>(null);
  const [job, setJob] = useState<Awaited<ReturnType<typeof aiApi.createQuizDraftJob>> | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof aiApi.getQuizDraftJobResult>> | null>(null);
  const [title, setTitle] = useState("AI Draft Assessment");
  const [questionCount, setQuestionCount] = useState("10");
  const [teacherNote, setTeacherNote] = useState("");
  const [loading, setLoading] = useState(false);

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

  const refreshJob = async () => {
    if (!job?.id) return;
    try {
      const nextJob = await aiApi.getTeacherJobStatus(job.id);
      setJob(nextJob);
      if (nextJob.status === "completed") {
        setResult(await aiApi.getQuizDraftJobResult(nextJob.id));
      }
    } catch (error) {
      Alert.alert("Unable to refresh job", getErrorMessage(error));
    }
  };

  const createJob = async () => {
    try {
      const created = await aiApi.createQuizDraftJob({
        classId,
        title: title.trim() || "AI Draft Assessment",
        questionCount: Number.parseInt(questionCount, 10) || 10,
        teacherNote: teacherNote.trim() || undefined,
        useAllReadySources: true,
      });
      setJob(created);
      setResult(null);
    } catch (error) {
      Alert.alert("Unable to create AI draft", getErrorMessage(error));
    }
  };

  const deleteJob = async () => {
    if (!job?.id) return;
    try {
      await aiApi.deleteTeacherJob(job.id);
      setJob(null);
      setResult(null);
    } catch (error) {
      Alert.alert("Unable to delete job", getErrorMessage(error));
    }
  };

  const outputId = job?.outputId || result?.result?.outputId;
  const questionTotal = result?.result?.structuredOutput?.questions?.length ?? 0;

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
          <TeacherActionButton label="Reindex class" icon="database-refresh-outline" tone="amber" onPress={() => void aiApi.reindexClass(classId).then(loadStatus).catch((error) => Alert.alert("Unable to reindex", getErrorMessage(error)))} />
        </View>
      </TeacherPanel>
      <TeacherPanel title="Generate quiz draft" subtitle="Creates a teacher AI quiz draft job from ready class sources.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Title" value={title} onChangeText={setTitle} />
          <TeacherInlineField label="Question count" value={questionCount} onChangeText={setQuestionCount} />
          <TeacherInlineField label="Teacher note" value={teacherNote} onChangeText={setTeacherNote} multiline />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label="Generate" icon="auto-fix" tone="green" onPress={() => void createJob()} />
            <TeacherActionButton label="Refresh job" icon="refresh" tone="blue" disabled={!job} onPress={() => void refreshJob()} />
            <TeacherActionButton label="Delete job" icon="trash-can-outline" tone="red" disabled={!job} onPress={() => void deleteJob()} />
          </View>
        </View>
      </TeacherPanel>
      <TeacherPanel title="Generated result" subtitle={job?.message || job?.errorMessage || "Refresh after the job completes."}>
        {result?.result?.structuredOutput ? (
          <>
            <TeacherRow title={result.result.structuredOutput.title || "AI draft"} subtitle={stripRichText(result.result.structuredOutput.description || "Generated quiz draft")} />
            {(result.result.structuredOutput.questions ?? []).slice(0, 8).map((question, index) => (
              <TeacherRow key={`${question.content}-${index}`} title={`Question ${index + 1}`} subtitle={stripRichText(question.content || "No question text")} />
            ))}
          </>
        ) : (
          <TeacherEmpty title="No result loaded" subtitle="Generate a job, then refresh until a result is available." icon="robot-confused-outline" />
        )}
        {outputId ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <TeacherActionButton
              label="Open generated assessment"
              icon="clipboard-edit-outline"
              tone="green"
              onPress={() => navigation.navigate("TeacherAssessmentEditor", { assessmentId: outputId, classId })}
            />
          </View>
        ) : null}
      </TeacherPanel>
    </TeacherScreen>
  );
}
