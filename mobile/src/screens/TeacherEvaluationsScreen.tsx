import { mobileBrand } from "../theme/mobileBrand";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTeacherEvaluationSummary } from "../api/hooks";
import { evaluationsApi, type AssignedSystemEvaluation } from "../api/services/evaluations";
import { toAppError } from "../api/http";
import type { TeacherDrawerScreenProps } from "../navigation/types";
import type { TeacherEvaluationType } from "../types/teacher";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  TeacherSelectMenu,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherFlatSection,
  TeacherSegmentedTabs,
  TeacherSummaryStrip,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = TeacherDrawerScreenProps<"TeacherEvaluations">;
type GradingFilter = "all" | "Q1" | "Q2" | "Q3" | "Q4";

const evaluationTypes: Array<{ label: string; value: TeacherEvaluationType }> = [
  { label: "Teacher Class", value: "teacher_class" },
  { label: "JA Hub", value: "ja_hub" },
  { label: "Learners Path", value: "learners_path" },
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

export function TeacherEvaluationsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"to_answer" | "feedback">("to_answer");
  const [evaluationType, setEvaluationType] = useState<TeacherEvaluationType>("teacher_class");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [gradingPeriod, setGradingPeriod] = useState<GradingFilter>("all");
  const [selectedEvaluation, setSelectedEvaluation] = useState<AssignedSystemEvaluation | null>(null);
  const [questionRatings, setQuestionRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");

  const inboxQuery = useQuery({
    queryKey: ["system-evaluations-inbox", "teacher"],
    queryFn: () => evaluationsApi.getMySystemEvaluations(),
  });
  const summaryQuery = useTeacherEvaluationSummary(evaluationType, {
    classId: selectedClassId === "all" ? undefined : selectedClassId,
    gradingPeriod: gradingPeriod === "all" ? undefined : gradingPeriod,
  });

  const submitMutation = useMutation({
    mutationFn: ({ assignmentId, ratings, feedback }: { assignmentId: string; ratings: Record<string, number>; feedback?: string }) =>
      evaluationsApi.submitAssignedSystemEvaluation(assignmentId, {
        questionRatings: ratings,
        feedback,
      }),
    onSuccess: () => {
      Alert.alert("Evaluation Submitted", "Thank you for submitting your evaluation feedback.");
      setSelectedEvaluation(null);
      setQuestionRatings({});
      setComments("");
      void queryClient.invalidateQueries({ queryKey: ["system-evaluations-inbox"] });
      void inboxQuery.refetch();
    },
    onError: (error) => Alert.alert("Submission Failed", toAppError(error).message),
  });

  const pendingForms = inboxQuery.data?.pending ?? [];
  const submittedForms = inboxQuery.data?.completed ?? [];
  const inboxItems = [...pendingForms, ...submittedForms];
  const categoryAverages = summaryQuery.data?.categoryAverages ?? [];
  const trends = summaryQuery.data?.trends ?? [];
  const summaryComments = summaryQuery.data?.comments ?? [];
  const periodOptions: GradingFilter[] = ["all", ...(summaryQuery.data?.periods ?? [])];

  const openEvaluation = (item: AssignedSystemEvaluation) => {
    setQuestionRatings(Object.fromEntries(item.questions.map((question) => [question.key, 5])));
    setComments("");
    setSelectedEvaluation(item);
  };

  return (
    <TeacherScreen
      title="Evaluations"
      subtitle="Complete assigned forms or inspect anonymous learner feedback."
      icon="clipboard-check-outline"
      onBackPress={() => navigation.goBack()}
      refreshing={summaryQuery.isRefetching || inboxQuery.isRefetching}
      onRefresh={() => void Promise.all([summaryQuery.refetch(), inboxQuery.refetch()])}
    >
      <TeacherSegmentedTabs
        accessibilityLabel="Evaluation views"
        activeKey={viewMode}
        items={[
          { key: "to_answer", label: "To answer", count: pendingForms.length },
          { key: "feedback", label: "Feedback", count: summaryQuery.data?.overview.responseCount ?? 0 },
        ]}
        onSelect={setViewMode}
      />

      {viewMode === "to_answer" ? (
        <>
          <TeacherSummaryStrip
            items={[
              { label: "Pending", value: pendingForms.length, tone: "amber" },
              { label: "Submitted", value: submittedForms.length, tone: "green" },
              { label: "Total", value: inboxItems.length, tone: "blue" },
            ]}
          />
          <TeacherFlatSection title="Assigned evaluations" subtitle="Answer pending forms first; submitted forms stay visible as a record.">
            {inboxQuery.isError ? (
              <TeacherEmpty title="Unable to load evaluation forms" subtitle={toAppError(inboxQuery.error).message} icon="alert-circle-outline" />
            ) : inboxItems.length ? (
              inboxItems.map((item) => (
                <TeacherRow
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.class?.subjectCode ?? item.targetModule.replaceAll("_", " ")} · Due ${formatDate(item.endsAt)}`}
                  onPress={item.status === "pending" ? () => openEvaluation(item) : undefined}
                  right={
                    <TeacherChip
                      label={item.status === "submitted" ? "Submitted" : "Answer"}
                      active={item.status === "pending"}
                      onPress={item.status === "pending" ? () => openEvaluation(item) : undefined}
                    />
                  }
                />
              ))
            ) : (
              <TeacherEmpty title="No evaluation forms" subtitle="There are no assigned forms for your account." icon="checkbox-marked-circle-outline" />
            )}
          </TeacherFlatSection>
        </>
      ) : (
        <>
          <TeacherSummaryStrip
            items={[
              { label: "Responses", value: summaryQuery.data?.overview.responseCount ?? 0, tone: "red" },
              { label: "Overall avg", value: summaryQuery.data ? summaryQuery.data.overview.averageOverall.toFixed(2) : "N/A", tone: "blue" },
              { label: "Response rate", value: `${summaryQuery.data?.overview.responseRate ?? 0}%`, tone: "green" },
            ]}
          />

          <TeacherSelectMenu
            label="Evaluation type"
            selectedValue={evaluationType}
            options={evaluationTypes}
            onSelect={setEvaluationType}
          />
          <TeacherSelectMenu
            label="Class filter"
            selectedValue={selectedClassId}
            options={[
              { value: "all", label: "All classes" },
              ...(summaryQuery.data?.classes ?? []).map((entry) => ({
                value: entry.id,
                label: entry.subjectCode,
              })),
            ]}
            onSelect={setSelectedClassId}
          />
          <TeacherSelectMenu
            label="Grading period"
            selectedValue={gradingPeriod}
            options={periodOptions.map((value) => ({
              value,
              label: value === "all" ? "All periods" : value,
            }))}
            onSelect={setGradingPeriod}
          />

          <TeacherFlatSection title={summaryQuery.data?.tabTitle ?? "Evaluation summary"} subtitle={summaryQuery.data?.tabDescription ?? "Evaluation results for the selected filters."}>
            {summaryQuery.isError ? (
              <TeacherEmpty title="Unable to load analytics" subtitle={toAppError(summaryQuery.error).message} icon="alert-circle-outline" />
            ) : categoryAverages.length ? (
              categoryAverages.map((entry) => (
                <TeacherRow key={entry.key} title={entry.label} subtitle={`Average rating: ${entry.average.toFixed(2)} / 5`} />
              ))
            ) : (
              <TeacherEmpty title="No evaluation summaries" subtitle="No evaluation submissions match these filters." icon="clipboard-alert-outline" />
            )}
          </TeacherFlatSection>

          {trends.length ? (
            <TeacherFlatSection title="Response coverage" subtitle="Submitted responses compared with eligible learners.">
              {trends.map((entry) => (
                <TeacherRow
                  key={`${entry.classId}-${entry.gradingPeriod}`}
                  title={`${entry.classLabel} · ${entry.gradingPeriod}`}
                  subtitle={`${entry.responseCount} of ${entry.eligibleCount} eligible learners responded`}
                />
              ))}
            </TeacherFlatSection>
          ) : null}

          {summaryComments.length ? (
            <TeacherFlatSection title="Anonymous comments" subtitle="Learner feedback returned by the current contract.">
              {summaryComments.map((entry) => (
                <TeacherRow key={entry.id} title={entry.comment} subtitle={`${entry.classLabel} · ${entry.gradingPeriod} · ${formatDate(entry.submittedAt)}`} />
              ))}
            </TeacherFlatSection>
          ) : null}
        </>
      )}

      <Modal visible={Boolean(selectedEvaluation)} transparent animationType="slide" onRequestClose={() => setSelectedEvaluation(null)}>
        <View style={{ flex: 1, backgroundColor: mobileBrand.scrimStrong, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: theme.blue, textTransform: "uppercase" }}>
                  {selectedEvaluation?.class?.subjectCode ?? selectedEvaluation?.targetModule.replaceAll("_", " ")}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 16, fontWeight: "800", color: theme.text }}>{selectedEvaluation?.title}</Text>
              </View>
              <Pressable onPress={() => setSelectedEvaluation(null)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 14 }}>
                Rate each question from 1 (Needs Improvement) to 5 (Excellent).
              </Text>
              {(selectedEvaluation?.questions ?? []).map((question) => {
                const value = questionRatings[question.key] ?? 5;
                return (
                  <View key={question.key} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{question.label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: theme.amber }}>{value} / 5</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Pressable key={star} onPress={() => setQuestionRatings((current) => ({ ...current, [question.key]: star }))} style={{ padding: 4 }}>
                          <MaterialCommunityIcons name={star <= value ? "star" : "star-outline"} size={22} color={star <= value ? theme.amber : theme.muted} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, marginTop: 8, marginBottom: 6 }}>Additional feedback:</Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={comments}
                onChangeText={setComments}
                placeholder="Write constructive evaluation feedback..."
                placeholderTextColor={theme.muted}
                style={{ borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2, padding: 10, fontSize: 12, color: theme.text, minHeight: 70 }}
              />
            </ScrollView>

            <Pressable
              onPress={() => {
                if (!selectedEvaluation) return;
                submitMutation.mutate({ assignmentId: selectedEvaluation.id, ratings: questionRatings, feedback: comments.trim() || undefined });
              }}
              disabled={submitMutation.isPending}
              style={{ borderRadius: 10, backgroundColor: theme.blue, paddingVertical: 12, alignItems: "center", opacity: submitMutation.isPending ? 0.6 : 1 }}
            >
              <Text style={{ color: mobileBrand.white, fontSize: 13, fontWeight: "800" }}>
                {submitMutation.isPending ? "Submitting..." : "Submit Evaluation"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}
