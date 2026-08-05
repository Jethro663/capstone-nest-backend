import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { evaluationsApi, type EvaluationInboxItem, type SubmitEvaluationDto } from "../api/services/evaluations";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { studentDarkTheme as theme } from "../theme/studentDark";

type Props = NativeStackScreenProps<RootStackParamList, "StudentEvaluations">;
type TabFilter = "pending" | "submitted";

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabFilter>("pending");
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationInboxItem | null>(null);

  // Form ratings
  const [pedagogicalRating, setPedagogicalRating] = useState(5);
  const [subjectKnowledgeRating, setSubjectKnowledgeRating] = useState(5);
  const [classroomManagementRating, setClassroomManagementRating] = useState(5);
  const [learningMaterialsRating, setLearningMaterialsRating] = useState(5);
  const [comments, setComments] = useState("");

  const inboxQuery = useQuery({
    queryKey: ["student-evaluations-inbox"],
    queryFn: () => evaluationsApi.getStudentInbox(),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: SubmitEvaluationDto) => evaluationsApi.submitEvaluation(payload),
    onSuccess: (data) => {
      Alert.alert("Evaluation Submitted", data.message || "Thank you for submitting your evaluation feedback!");
      setSelectedEvaluation(null);
      void queryClient.invalidateQueries({ queryKey: ["student-evaluations-inbox"] });
    },
    onError: (err) => {
      Alert.alert("Submission Failed", toAppError(err).message);
    },
  });

  const inboxItems = inboxQuery.data ?? [];
  const pendingItems = useMemo(() => inboxItems.filter((item) => item.status === "pending"), [inboxItems]);
  const submittedItems = useMemo(() => inboxItems.filter((item) => item.status === "submitted"), [inboxItems]);

  const visibleItems = activeTab === "pending" ? pendingItems : submittedItems;

  const handleSubmit = () => {
    if (!selectedEvaluation) return;
    submitMutation.mutate({
      evaluationId: selectedEvaluation.id,
      pedagogicalRating,
      subjectKnowledgeRating,
      classroomManagementRating,
      learningMaterialsRating,
      comments: comments.trim() || undefined,
    });
  };

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable refreshing={inboxQuery.isRefetching} onRefresh={() => void inboxQuery.refetch()} />
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
      {visibleItems.length === 0 ? (
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
              key={item.id}
              onPress={() => {
                if (item.status === "pending") {
                  setSelectedEvaluation(item);
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
                Instructor: {item.teacherName || "Assigned Teacher"} | Due: {item.dueDate || "N/A"}
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
                Please rate your instructor across the following categories (1 = Needs Improvement, 5 = Excellent):
              </Text>

              <StarRating label="1. Pedagogical Competence" rating={pedagogicalRating} onChange={setPedagogicalRating} />
              <StarRating label="2. Subject Knowledge & Mastery" rating={subjectKnowledgeRating} onChange={setSubjectKnowledgeRating} />
              <StarRating label="3. Classroom & Time Management" rating={classroomManagementRating} onChange={setClassroomManagementRating} />
              <StarRating label="4. Learning Resources & Support" rating={learningMaterialsRating} onChange={setLearningMaterialsRating} />

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
