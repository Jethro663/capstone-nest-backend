import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTeacherClasses, useTeacherEvaluationSummary } from "../api/hooks";
import { evaluationsApi, type EvaluationInboxItem } from "../api/services/evaluations";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import type { TeacherEvaluationType } from "../types/teacher";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherEvaluations">;

type GradingFilter = "all" | "Q1" | "Q2" | "Q3" | "Q4";

const evaluationTypes: Array<{ label: string; value: TeacherEvaluationType }> = [
  { label: "Teacher Class", value: "teacher_class" },
  { label: "JA Hub", value: "ja_hub" },
  { label: "Learners Path", value: "learners_path" },
];

export function TeacherEvaluationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);

  const [viewMode, setViewMode] = useState<"forms" | "analytics">("forms");
  const [evaluationType, setEvaluationType] = useState<TeacherEvaluationType>("teacher_class");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [gradingPeriod, setGradingPeriod] = useState<GradingFilter>("all");
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationInboxItem | null>(null);

  // Ratings state
  const [pedagogicalRating, setPedagogicalRating] = useState(5);
  const [subjectKnowledgeRating, setSubjectKnowledgeRating] = useState(5);
  const [classroomManagementRating, setClassroomManagementRating] = useState(5);
  const [learningMaterialsRating, setLearningMaterialsRating] = useState(5);
  const [comments, setComments] = useState("");

  const inboxQuery = useQuery({
    queryKey: ["teacher-evaluations-inbox"],
    queryFn: () => evaluationsApi.getStudentInbox(),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof evaluationsApi.submitEvaluation>[0]) => evaluationsApi.submitEvaluation(payload),
    onSuccess: (data) => {
      Alert.alert("Evaluation Submitted", data.message || "Thank you for submitting your evaluation feedback!");
      setSelectedEvaluation(null);
      void queryClient.invalidateQueries({ queryKey: ["teacher-evaluations-inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["student-evaluations-inbox"] });
      void inboxQuery.refetch();
    },
    onError: (err) => {
      Alert.alert("Submission Failed", toAppError(err).message);
    },
  });

  const summaryQuery = useTeacherEvaluationSummary(evaluationType, {
    classId: selectedClassId === "all" ? undefined : selectedClassId,
    gradingPeriod: gradingPeriod === "all" ? undefined : gradingPeriod,
  });

  const classAverages = summaryQuery.data?.classAverages ?? [];
  const gradingBreakdown = summaryQuery.data?.gradingPeriodBreakdown ?? [];
  const inboxItems = inboxQuery.data ?? [];
  const pendingForms = inboxItems.filter((item) => item.status === "pending");
  const submittedForms = inboxItems.filter((item) => item.status === "submitted");

  const selectedClass = useMemo(
    () => classesQuery.data?.find((entry) => entry.id === selectedClassId),
    [classesQuery.data, selectedClassId],
  );

  return (
    <TeacherScreen
      title="Evaluations"
      subtitle="Complete evaluation forms or inspect class performance averages."
      icon="clipboard-check-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={summaryQuery.isRefetching || classesQuery.isRefetching || inboxQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([summaryQuery.refetch(), classesQuery.refetch(), inboxQuery.refetch()]);
      }}
    >
      {/* View Mode Selector */}
      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 8 }}>
        <TeacherChip label={`Evaluation Forms (${pendingForms.length} Pending)`} active={viewMode === "forms"} onPress={() => setViewMode("forms")} />
        <TeacherChip label="Class Analytics" active={viewMode === "analytics"} onPress={() => setViewMode("analytics")} />
      </View>

      {viewMode === "forms" ? (
        <>
          <TeacherStats
            items={[
              { label: "Pending", value: pendingForms.length, tone: "amber" },
              { label: "Submitted", value: submittedForms.length, tone: "green" },
              { label: "Total Forms", value: inboxItems.length, tone: "blue" },
            ]}
          />

          <TeacherPanel title="Evaluation Forms to Answer" subtitle="Select a form to provide constructive evaluation feedback.">
            {inboxItems.length ? (
              inboxItems.map((item) => (
                <TeacherRow
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.subjectCode} · ${item.teacherName || "Assigned Teacher"} · Due ${item.dueDate || "N/A"}`}
                  onPress={item.status === "pending" ? () => setSelectedEvaluation(item) : undefined}
                  right={
                    <TeacherChip
                      label={item.status === "submitted" ? "Submitted" : "Answer"}
                      active={item.status === "pending"}
                      onPress={item.status === "pending" ? () => setSelectedEvaluation(item) : undefined}
                    />
                  }
                />
              ))
            ) : (
              <TeacherEmpty
                title="No evaluation forms"
                subtitle="All evaluation feedback forms are currently completed!"
                icon="checkbox-marked-circle-outline"
              />
            )}
          </TeacherPanel>
        </>
      ) : (
        <>
          <TeacherStats
            items={[
              { label: "Responses", value: summaryQuery.data?.responseCount ?? 0, tone: "red" },
              {
                label: "Overall avg",
                value:
                  typeof summaryQuery.data?.overallAverage === "number"
                    ? summaryQuery.data.overallAverage.toFixed(2)
                    : "N/A",
                tone: "blue",
              },
              { label: "Class rows", value: classAverages.length, tone: "green" },
            ]}
          />

          <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {evaluationTypes.map((entry) => (
              <TeacherChip
                key={entry.value}
                label={entry.label}
                active={evaluationType === entry.value}
                onPress={() => setEvaluationType(entry.value)}
              />
            ))}
          </View>

          <View style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherChip label="All classes" active={selectedClassId === "all"} onPress={() => setSelectedClassId("all")} />
            {(classesQuery.data ?? []).slice(0, 6).map((entry) => (
              <TeacherChip
                key={entry.id}
                label={entry.subjectCode}
                active={selectedClassId === entry.id}
                onPress={() => setSelectedClassId(entry.id)}
              />
            ))}
          </View>

          <View style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["all", "Q1", "Q2", "Q3", "Q4"] as GradingFilter[]).map((entry) => (
              <TeacherChip
                key={entry}
                label={entry === "all" ? "All quarters" : entry}
                active={gradingPeriod === entry}
                onPress={() => setGradingPeriod(entry)}
              />
            ))}
          </View>

          <TeacherPanel title="Class averages" subtitle="Average evaluation scores by class for the selected filters.">
            {classAverages.length ? (
              classAverages.map((entry) => (
                <TeacherRow
                  key={`${entry.classId}-${entry.classCode || "class"}`}
                  title={entry.classCode || entry.className || entry.classId}
                  subtitle={`Average: ${entry.averageScore ?? "N/A"} | Responses: ${entry.responseCount ?? 0}`}
                />
              ))
            ) : (
              <TeacherEmpty
                title="No evaluation summaries"
                subtitle="No evaluation submissions found for this filter combination."
                icon="clipboard-alert-outline"
              />
            )}
          </TeacherPanel>
        </>
      )}

      {/* Answer Form Modal */}
      <Modal visible={Boolean(selectedEvaluation)} transparent animationType="slide" onRequestClose={() => setSelectedEvaluation(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: theme.blue, textTransform: "uppercase" }}>
                  {selectedEvaluation?.subjectCode} | {selectedEvaluation?.teacherName}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 16, fontWeight: "800", color: theme.text }}>
                  {selectedEvaluation?.title}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedEvaluation(null)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 14 }}>
                Rate across the following categories (1 = Needs Improvement, 5 = Excellent):
              </Text>

              {[
                { label: "Pedagogical Competence", value: pedagogicalRating, set: setPedagogicalRating },
                { label: "Subject Knowledge", value: subjectKnowledgeRating, set: setSubjectKnowledgeRating },
                { label: "Classroom Management", value: classroomManagementRating, set: setClassroomManagementRating },
                { label: "Learning Materials", value: learningMaterialsRating, set: setLearningMaterialsRating },
              ].map((cat) => (
                <View key={cat.label} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{cat.label}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: theme.amber }}>{cat.value} / 5</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable key={star} onPress={() => cat.set(star)} style={{ padding: 4 }}>
                        <MaterialCommunityIcons name={star <= cat.value ? "star" : "star-outline"} size={22} color={star <= cat.value ? theme.amber : theme.muted} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}

              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, marginTop: 8, marginBottom: 6 }}>Comments:</Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={comments}
                onChangeText={setComments}
                placeholder="Write constructive evaluation feedback..."
                placeholderTextColor={theme.muted}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface2,
                  padding: 10,
                  fontSize: 12,
                  color: theme.text,
                  minHeight: 70,
                }}
              />
            </ScrollView>

            <Pressable
              onPress={() => {
                if (!selectedEvaluation) return;
                submitMutation.mutate({
                  evaluationId: selectedEvaluation.id,
                  pedagogicalRating,
                  subjectKnowledgeRating,
                  classroomManagementRating,
                  learningMaterialsRating,
                  comments: comments.trim() || undefined,
                });
              }}
              disabled={submitMutation.isPending}
              style={{ borderRadius: 10, backgroundColor: theme.blue, paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>
                {submitMutation.isPending ? "Submitting..." : "Submit Evaluation"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}
