import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  evaluationsApi,
  type AcademicPeriodKey,
  type TeacherEvaluationQuestion,
  type TeacherEvaluationType,
} from "../api/services/evaluations";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { studentDarkTheme as theme } from "../theme/studentDark";

import { useStudentClasses } from "../api/hooks";
import { useAuth } from "../providers/AuthProvider";

type Props = NativeStackScreenProps<RootStackParamList, "StudentEvaluations">;
type TabFilter = "pending" | "submitted";
type EvaluationListItem = {
  key: string;
  kind: "teacher" | "system";
  status: "pending" | "submitted";
  classId: string | null;
  subjectCode: string;
  subjectName: string;
  title: string;
  description: string;
  gradingPeriod?: AcademicPeriodKey;
  evaluationType?: TeacherEvaluationType;
  assignmentId?: string;
  dueDate?: string;
  submittedAt?: string | null;
  questions: TeacherEvaluationQuestion[];
};

function StarRating({ label, rating, onChange }: { label: string; rating: number; onChange: (val: number) => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: "900", color: theme.amber }}>{rating} / 5</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => onChange(star)} style={{ padding: 4 }}>
            <MaterialCommunityIcons
              name={star <= rating ? "star" : "star-outline"}
              size={24}
              color={star <= rating ? theme.amber : theme.muted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function StudentEvaluationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const classesQuery = useStudentClasses(user?.userId || user?.id);

  const [activeTab, setActiveTab] = useState<TabFilter>("pending");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationListItem | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");

  const inboxQuery = useQuery({
    queryKey: ["student-evaluations-inbox"],
    queryFn: () => evaluationsApi.getStudentInbox(),
  });
  const systemInboxQuery = useQuery({
    queryKey: ["system-evaluations-inbox"],
    queryFn: () => evaluationsApi.getMySystemEvaluations(),
  });

  const submitMutation = useMutation({
    mutationFn: async ({ item, values, comment }: { item: EvaluationListItem; values: Record<string, number>; comment?: string }) => {
      if (item.kind === "system" && item.assignmentId) {
        return evaluationsApi.submitAssignedSystemEvaluation(item.assignmentId, {
          questionRatings: values,
          feedback: comment,
        });
      }
      if (!item.classId || !item.gradingPeriod || !item.evaluationType) {
        throw new Error("This teacher evaluation is missing its class or grading period.");
      }
      return evaluationsApi.submitEvaluation({
        classId: item.classId,
        gradingPeriod: item.gradingPeriod,
        evaluationType: item.evaluationType,
        ratings: values,
        comment,
      });
    },
    onSuccess: () => {
      Alert.alert("Evaluation Submitted", "Thank you for submitting your evaluation feedback!");
      setSelectedEvaluation(null);
      setActiveTab("submitted");
      void queryClient.invalidateQueries({ queryKey: ["student-evaluations-inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["teacher-evaluations-inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["system-evaluations-inbox"] });
      void Promise.all([inboxQuery.refetch(), systemInboxQuery.refetch()]);
    },
    onError: (err) => {
      Alert.alert("Submission Failed", toAppError(err).message);
    },
  });

  const pendingItems = useMemo<EvaluationListItem[]>(() => [
    ...(inboxQuery.data?.pending ?? []).map((item) => ({
      key: `teacher-${item.classId}-${item.gradingPeriod}-${item.evaluationType}`,
      kind: "teacher" as const,
      status: "pending" as const,
      classId: item.classId,
      subjectCode: item.class.subjectCode,
      subjectName: item.class.subjectName,
      title: item.title,
      description: item.description,
      gradingPeriod: item.gradingPeriod,
      evaluationType: item.evaluationType,
      questions: item.questions,
    })),
    ...(systemInboxQuery.data?.pending ?? []).map((item) => ({
      key: `system-${item.id}`,
      kind: "system" as const,
      status: "pending" as const,
      classId: item.classId,
      subjectCode: item.class?.subjectCode ?? item.targetModule.toUpperCase(),
      subjectName: item.class?.subjectName ?? "Nexora system",
      title: item.title,
      description: item.description,
      assignmentId: item.id,
      dueDate: item.endsAt,
      questions: item.questions,
    })),
  ], [inboxQuery.data, systemInboxQuery.data]);
  const submittedItems = useMemo<EvaluationListItem[]>(() => [
    ...(inboxQuery.data?.completed ?? []).map((item) => ({
      key: `teacher-completed-${item.id}`,
      kind: "teacher" as const,
      status: "submitted" as const,
      classId: item.classId,
      subjectCode: item.class?.subjectCode ?? "CLASS",
      subjectName: item.class?.subjectName ?? "Class evaluation",
      title: item.title,
      gradingPeriod: item.gradingPeriod,
      evaluationType: item.evaluationType,
      submittedAt: item.submittedAt,
      description: "Submitted teacher evaluation",
      questions: [],
    })),
    ...(systemInboxQuery.data?.completed ?? []).map((item) => ({
      key: `system-completed-${item.id}`,
      kind: "system" as const,
      status: "submitted" as const,
      classId: item.classId,
      subjectCode: item.class?.subjectCode ?? item.targetModule.toUpperCase(),
      subjectName: item.class?.subjectName ?? "Nexora system",
      title: item.title,
      description: item.description,
      assignmentId: item.id,
      dueDate: item.endsAt,
      submittedAt: item.submittedAt,
      questions: item.questions,
    })),
  ], [inboxQuery.data, systemInboxQuery.data]);

  const visibleItems = useMemo(() => {
    let list = activeTab === "pending" ? pendingItems : submittedItems;
    if (selectedClassId !== "all") {
      list = list.filter((item) => item.classId === selectedClassId);
    }
    return list;
  }, [activeTab, pendingItems, selectedClassId, submittedItems]);

  const handleSubmit = () => {
    if (!selectedEvaluation) return;
    submitMutation.mutate({ item: selectedEvaluation, values: ratings, comment: comments.trim() || undefined });
  };

  const openEvaluation = (item: EvaluationListItem) => {
    setRatings(Object.fromEntries(item.questions.map((question) => [question.key, 5])));
    setComments("");
    setSelectedEvaluation(item);
  };

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable
          refreshing={inboxQuery.isRefetching || systemInboxQuery.isRefetching}
          onRefresh={() => void Promise.all([inboxQuery.refetch(), systemInboxQuery.refetch()])}
        />
      }
    >
      <View style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
            </Pressable>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.blue,
              }}
            >
              <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
                Student Inbox
              </Text>
              <Text style={{ marginTop: 2, fontSize: 22, fontWeight: "800", color: theme.text }}>Student Evaluations</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Class Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 16, marginTop: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setSelectedClassId("all")}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selectedClassId === "all" ? theme.blue : theme.border,
              backgroundColor: selectedClassId === "all" ? theme.surface : theme.bg,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: selectedClassId === "all" ? theme.blue : theme.muted }}>
              All classes
            </Text>
          </Pressable>
          {(classesQuery.data ?? []).map((entry) => {
            const active = selectedClassId === entry.id || selectedClassId === entry.subjectCode;
            return (
              <Pressable
                key={entry.id}
                onPress={() => setSelectedClassId(entry.id)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? theme.blue : theme.border,
                  backgroundColor: active ? theme.surface : theme.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: active ? theme.blue : theme.muted }}>
                  {entry.subjectCode}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Tabs */}
      <View style={{ marginHorizontal: 16, marginTop: 14, flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => setActiveTab("pending")}
          style={{
            flex: 1,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: activeTab === "pending" ? theme.blue : theme.border,
            backgroundColor: activeTab === "pending" ? theme.surface : theme.bg,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "800", color: activeTab === "pending" ? theme.blue : theme.muted }}>
            Pending ({pendingItems.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("submitted")}
          style={{
            flex: 1,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: activeTab === "submitted" ? theme.green : theme.border,
            backgroundColor: activeTab === "submitted" ? theme.surface : theme.bg,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "800", color: activeTab === "submitted" ? theme.green : theme.muted }}>
            Submitted ({submittedItems.length})
          </Text>
        </Pressable>
      </View>

      {/* Evaluation List */}
      {inboxQuery.isError || systemInboxQuery.isError ? (
        <View style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.red, backgroundColor: theme.surface, padding: 24, alignItems: "center" }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.red} />
          <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "800", color: theme.text }}>Evaluations unavailable</Text>
          <Text style={{ marginTop: 4, textAlign: "center", fontSize: 12, color: theme.muted }}>
            {toAppError(inboxQuery.error ?? systemInboxQuery.error).message}
          </Text>
          <Pressable
            onPress={() => void Promise.all([inboxQuery.refetch(), systemInboxQuery.refetch()])}
            style={{ marginTop: 12, borderRadius: 999, backgroundColor: theme.blue, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      ) : visibleItems.length === 0 ? (
        <View style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 24, alignItems: "center" }}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={32} color={theme.muted} />
          <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "800", color: theme.text }}>
            No {activeTab} evaluations
          </Text>
          <Text style={{ marginTop: 4, textAlign: "center", fontSize: 12, color: theme.muted }}>
            {activeTab === "pending" ? "You have completed all pending evaluation forms!" : "Your submitted feedback forms will appear here."}
          </Text>
        </View>
      ) : (
        <View style={{ marginHorizontal: 16, marginTop: 12, gap: 10 }}>
          {visibleItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                if (item.status === "pending") {
                  openEvaluation(item);
                }
              }}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: theme.blue, textTransform: "uppercase" }}>
                  {item.subjectCode} - {item.subjectName}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: item.status === "submitted" ? "#DCFCE7" : "#FEF3C7",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "800", color: item.status === "submitted" ? theme.green : theme.amber }}>
                    {item.status === "submitted" ? "Submitted" : "Pending"}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text }}>{item.title}</Text>
              <Text style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>
                {item.kind === "teacher" ? `Period: ${item.gradingPeriod}` : `Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "N/A"}`}
              </Text>
              {item.status === "pending" ? (
                <View style={{ marginTop: 10, alignSelf: "flex-start", borderRadius: 999, backgroundColor: theme.blue, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>Start Evaluation</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}

      {/* Evaluation Form Modal */}
      <Modal visible={Boolean(selectedEvaluation)} transparent animationType="slide" onRequestClose={() => setSelectedEvaluation(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: theme.blue, textTransform: "uppercase" }}>
                  {selectedEvaluation?.subjectCode} | {selectedEvaluation?.subjectName}
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
                {selectedEvaluation?.description || "Rate each category from 1 (Needs Improvement) to 5 (Excellent)."}
              </Text>

              {(selectedEvaluation?.questions ?? []).map((question, index) => (
                <StarRating
                  key={question.key}
                  label={`${index + 1}. ${question.label}`}
                  rating={ratings[question.key] ?? 5}
                  onChange={(value) => setRatings((current) => ({ ...current, [question.key]: value }))}
                />
              ))}

              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, marginTop: 8, marginBottom: 6 }}>
                Qualitative Feedback / Comments (Optional):
              </Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={comments}
                onChangeText={setComments}
                placeholder="Write constructive feedback for your instructor..."
                placeholderTextColor={theme.muted}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                  padding: 12,
                  fontSize: 12,
                  color: theme.text,
                  textAlignVertical: "top",
                  minHeight: 80,
                }}
              />
            </ScrollView>

            <Pressable
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
              style={{
                borderRadius: 12,
                backgroundColor: theme.blue,
                paddingVertical: 12,
                alignItems: "center",
                opacity: submitMutation.isPending ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>
                {submitMutation.isPending ? "Submitting..." : "Submit Evaluation"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenScroll>
  );
}
