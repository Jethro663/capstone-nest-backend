import { mobileBrand } from "../theme/mobileBrand";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AppAlert as Alert } from "../components/ui/AppAlert";
import {
  evaluationsApi,
  type AcademicPeriodKey,
  type TeacherEvaluationQuestion,
  type TeacherEvaluationType,
} from "../api/services/evaluations";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { studentDarkTheme as theme } from "../theme/studentDark";

import { useStudentClasses } from "../api/hooks";
import { useAuth } from "../providers/AuthProvider";
import { RoleHeaderNavigationButton } from "../components/navigation/RoleNavigationDrawer";

type Props = BottomTabScreenProps<MainTabParamList, "StudentEvaluations">;
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

export const EVALUATION_RATING_SCALE = [
  {
    value: 0,
    label: "Not observed",
    description: "The behavior or result was not demonstrated.",
  },
  {
    value: 1,
    label: "Rarely",
    description: "It was demonstrated only in a few instances.",
  },
  {
    value: 2,
    label: "Sometimes",
    description: "It was demonstrated in some instances, but not regularly.",
  },
  {
    value: 3,
    label: "Usually",
    description: "It was demonstrated in most instances.",
  },
  {
    value: 4,
    label: "Consistently",
    description: "It was demonstrated reliably across the experience.",
  },
  {
    value: 5,
    label: "Excellent",
    description: "It was demonstrated at an exceptional level throughout.",
  },
] as const;

function RatingScale({
  label,
  rating,
  onChange,
}: {
  label: string;
  rating: number | null;
  onChange: (val: number) => void;
}) {
  const selectedOption = EVALUATION_RATING_SCALE.find(
    (option) => option.value === rating,
  );

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {EVALUATION_RATING_SCALE.map((option) => {
          const selected = rating === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.value} stars, ${option.label}, for ${label}`}
              accessibilityHint={option.description}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={{
                width: "31%",
                minHeight: 52,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected ? theme.blue : theme.border,
                backgroundColor: selected ? theme.blue : theme.bg,
                paddingHorizontal: 8,
                paddingVertical: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: selected ? mobileBrand.white : theme.text,
                }}
              >
                {option.value}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 2,
                  fontSize: 9,
                  fontWeight: "800",
                  color: selected ? mobileBrand.white : theme.muted,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View
        accessibilityLiveRegion="polite"
        style={{
          minHeight: 62,
          marginTop: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: selectedOption ? "solid" : "dashed",
          borderColor: theme.border,
          backgroundColor: theme.bg,
          padding: 10,
        }}
      >
        {selectedOption ? (
          <>
            <Text style={{ fontSize: 12, fontWeight: "900", color: theme.text }}>
              {selectedOption.value} · {selectedOption.label}
            </Text>
            <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 16, color: theme.muted }}>
              {selectedOption.description}
            </Text>
          </>
        ) : (
          <Text style={{ fontSize: 11, lineHeight: 16, color: theme.muted }}>
            Choose a rating. Zero is valid and different from unanswered.
          </Text>
        )}
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
  const [ratings, setRatings] = useState<Record<string, number | null>>({});
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

  const answeredCount = selectedEvaluation
    ? selectedEvaluation.questions.filter(
        (question) => ratings[question.key] !== null && ratings[question.key] !== undefined,
      ).length
    : 0;
  const hasMissingRating = selectedEvaluation
    ? answeredCount !== selectedEvaluation.questions.length
    : true;

  useEffect(() => {
    if (!selectedEvaluation) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelectedEvaluation(null);
      return true;
    });
    return () => subscription.remove();
  }, [selectedEvaluation]);

  const handleSubmit = () => {
    if (!selectedEvaluation || hasMissingRating) return;
    const values = Object.fromEntries(
      selectedEvaluation.questions.map((question) => [
        question.key,
        Number(ratings[question.key]),
      ]),
    );
    submitMutation.mutate({ item: selectedEvaluation, values, comment: comments.trim() || undefined });
  };

  const openEvaluation = (item: EvaluationListItem) => {
    setRatings(Object.fromEntries(item.questions.map((question) => [question.key, null])));
    setComments("");
    setSelectedEvaluation(item);
  };

  if (selectedEvaluation) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
        style={{ flex: 1 }}
      >
      <ScreenScroll backgroundColor={theme.bg} keyboardShouldPersistTaps="handled">
        <View
          style={{
            backgroundColor: theme.header,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 7,
              paddingBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <RoleHeaderNavigationButton
              onBackPress={() => setSelectedEvaluation(null)}
              preferBack
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: theme.muted,
                }}
              >
                {selectedEvaluation.subjectCode} · {selectedEvaluation.subjectName}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 18, fontWeight: "900", color: theme.text }}>
                {selectedEvaluation.title}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 }}>
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
              {selectedEvaluation.description}
            </Text>
            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text style={{ flex: 1, fontSize: 11, lineHeight: 16, color: theme.muted }}>
                Choose one answer per question. Zero is valid; blank means unanswered.
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "900", color: theme.blue }}>
                {answeredCount} of {selectedEvaluation.questions.length}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 12, gap: 12 }}>
            {selectedEvaluation.questions.map((question, index) => (
              <View
                key={question.key}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.header,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "900", color: mobileBrand.white }}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "800", color: theme.text }}>
                    {question.label}
                  </Text>
                </View>
                <RatingScale
                  label={question.label}
                  rating={ratings[question.key] ?? null}
                  onChange={(value) =>
                    setRatings((current) => ({ ...current, [question.key]: value }))
                  }
                />
              </View>
            ))}
          </View>

          <View
            style={{
              marginTop: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "800", color: theme.text }}>
              Optional comment
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={comments}
              onChangeText={setComments}
              placeholder="Share constructive feedback about this experience."
              placeholderTextColor={theme.muted}
              style={{
                minHeight: 96,
                marginTop: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.bg,
                padding: 12,
                fontSize: 12,
                lineHeight: 18,
                color: theme.text,
                textAlignVertical: "top",
              }}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit Evaluation"
            onPress={handleSubmit}
            disabled={submitMutation.isPending || hasMissingRating}
            style={{
              minHeight: 50,
              marginTop: 14,
              borderRadius: 12,
              backgroundColor: theme.red,
              alignItems: "center",
              justifyContent: "center",
              opacity: submitMutation.isPending || hasMissingRating ? 0.45 : 1,
            }}
          >
            <Text style={{ color: mobileBrand.white, fontSize: 14, fontWeight: "900" }}>
              {submitMutation.isPending ? "Submitting..." : "Submit Evaluation"}
            </Text>
          </Pressable>
          {hasMissingRating ? (
            <Text style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: theme.muted }}>
              Complete every rating before submitting.
            </Text>
          ) : null}
        </View>
      </ScreenScroll>
      </KeyboardAvoidingView>
    );
  }

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
        <View style={{ paddingHorizontal: 16, paddingTop: 7, paddingBottom: 7 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <RoleHeaderNavigationButton onBackPress={navigation.goBack} />
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.redSoft,
              }}
            >
              <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={theme.redText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
                Student Inbox
              </Text>
              <Text style={{ marginTop: 2, fontSize: 20, fontWeight: "900", color: theme.text }}>Evaluations</Text>
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
          accessibilityRole="button"
          accessibilityLabel="Show pending evaluations"
          accessibilityState={{ selected: activeTab === "pending" }}
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
          accessibilityRole="button"
          accessibilityLabel="Show submitted evaluations"
          accessibilityState={{ selected: activeTab === "submitted" }}
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

      <View
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 11, lineHeight: 17, color: theme.muted }}>
          Rating guide: <Text style={{ fontWeight: "900", color: theme.text }}>0 Not observed</Text>
          {" to "}
          <Text style={{ fontWeight: "900", color: theme.text }}>5 Excellent</Text>. Nothing is selected until you choose it.
        </Text>
      </View>

      {/* Evaluation List */}
      {inboxQuery.isLoading || systemInboxQuery.isLoading ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 24, alignItems: "center" }}
        >
          <MaterialCommunityIcons name="clock-outline" size={32} color={theme.blue} />
          <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "800", color: theme.text }}>
            Loading evaluations...
          </Text>
          <Text style={{ marginTop: 4, textAlign: "center", fontSize: 12, color: theme.muted }}>
            Checking your assigned and submitted forms.
          </Text>
        </View>
      ) : inboxQuery.isError || systemInboxQuery.isError ? (
        <View style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.red, backgroundColor: theme.surface, padding: 24, alignItems: "center" }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.red} />
          <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "800", color: theme.text }}>Evaluations unavailable</Text>
          <Text style={{ marginTop: 4, textAlign: "center", fontSize: 12, color: theme.muted }}>
            {toAppError(inboxQuery.error ?? systemInboxQuery.error).message}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading evaluations"
            onPress={() => void Promise.all([inboxQuery.refetch(), systemInboxQuery.refetch()])}
            style={{ marginTop: 12, borderRadius: 999, backgroundColor: theme.blue, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ color: mobileBrand.white, fontSize: 11, fontWeight: "800" }}>Retry</Text>
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
          {visibleItems.map((item) => {
            const cardStyle = {
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                padding: 14,
              };
            const cardContent = (
              <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: theme.blue, textTransform: "uppercase" }}>
                  {item.subjectCode} - {item.subjectName}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: item.status === "submitted" ? mobileBrand.successSoft : mobileBrand.warningSoft,
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
                  <Text style={{ color: mobileBrand.white, fontSize: 11, fontWeight: "800" }}>Start Evaluation</Text>
                </View>
              ) : null}
              </>
            );

            return item.status === "pending" ? (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`Start ${item.title}`}
                onPress={() => openEvaluation(item)}
                style={cardStyle}
              >
                {cardContent}
              </Pressable>
            ) : (
              <View
                key={item.key}
                accessible
                accessibilityLabel={`Submitted ${item.title}`}
                style={cardStyle}
              >
                {cardContent}
              </View>
            );
          })}
        </View>
      )}
    </ScreenScroll>
  );
}
