import { Text, View } from "react-native";
import { TeacherActionButton, TeacherRow, stripRichText } from "../../components/teacher/TeacherMobilePrimitives";
import type { QuizDraftStructuredOutput } from "../../types/ai";

interface TeacherAiDraftReviewPanelProps {
  draft: QuizDraftStructuredOutput;
  saving: boolean;
  applying: boolean;
  onMarkQuestionReviewed: (questionIndex: number) => void;
  onAcceptWarning: (issueId: string) => void;
  onPreviewApply: () => void;
}

export function TeacherAiDraftReviewPanel({
  draft,
  saving,
  applying,
  onMarkQuestionReviewed,
  onAcceptWarning,
  onPreviewApply,
}: TeacherAiDraftReviewPanelProps) {
  const unresolvedIssues = (draft.reviewIssues ?? []).filter((issue) => !issue.resolved);
  const cannotApply = saving || applying || draft.questions.length === 0 || draft.qualityGate === "fail" || draft.reviewRequired === true;

  return (
    <>
      <TeacherRow
        title={draft.title || "AI draft"}
        subtitle={`${draft.questions.length} question(s) • Quality: ${draft.qualityGate ?? "pending"} • Review: ${draft.reviewState ?? "pending"}`}
      />
      {draft.questions.map((question, index) => (
        <View key={question.id ?? `${question.content}-${index}`}>
          <TeacherRow
            title={`Q${index + 1}: ${stripRichText(question.content) || "No question text"}`}
            subtitle={`Type: ${question.type || "multiple_choice"} • Points: ${question.points ?? 1} • ${question.reviewed ? "Reviewed" : "Needs review"}`}
          />
          {!question.reviewed ? (
            <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
              <TeacherActionButton
                label={`Mark question ${index + 1} reviewed`}
                icon="check-circle-outline"
                tone="blue"
                disabled={saving}
                onPress={() => onMarkQuestionReviewed(index)}
              />
            </View>
          ) : null}
        </View>
      ))}
      {unresolvedIssues.map((issue) => (
        <View key={issue.id} style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <Text style={{ color: issue.severity === "blocking" ? "#b91c1c" : "#92400e", fontSize: 13 }}>
            {issue.severity === "blocking" ? "Blocking: " : "Warning: "}{issue.message}
          </Text>
          {issue.severity === "warning" ? (
            <View style={{ marginTop: 6 }}>
              <TeacherActionButton
                label="Accept warning"
                icon="alert-circle-check-outline"
                tone="amber"
                disabled={saving}
                onPress={() => onAcceptWarning(issue.id)}
              />
            </View>
          ) : null}
        </View>
      ))}
      <View style={{ paddingHorizontal: 14, paddingVertical: 14, gap: 8 }}>
        {draft.reviewRequired || draft.qualityGate === "fail" ? (
          <Text style={{ color: "#92400e", fontSize: 13 }}>Finish the review checklist before applying this draft.</Text>
        ) : null}
        <TeacherActionButton
          label={applying ? "Preparing apply preview..." : "Review and apply"}
          icon="check-decagram-outline"
          tone="green"
          disabled={cannotApply}
          onPress={onPreviewApply}
        />
      </View>
    </>
  );
}
