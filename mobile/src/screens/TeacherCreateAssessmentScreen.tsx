import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, View } from "react-native";
import { useTeacherCreateAssessmentMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import type { AssessmentType } from "../types/assessment";
import type { RootStackParamList } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherInlineField,
  TeacherPanel,
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherCreateAssessment">;

const assessmentTypes: AssessmentType[] = [
  "quiz",
  "exam",
  "assignment",
  "written_work",
  "performance_task",
  "quarterly_assessment",
  "file_upload",
];

function normalizeDueDate(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Use a valid date format such as YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm.");
  }
  if (parsed.getTime() < Date.now()) {
    throw new Error("Assessment due date cannot be earlier than the present date and time.");
  }
  return parsed.toISOString();
}

export function TeacherCreateAssessmentScreen({ navigation, route }: Props) {
  const { classId } = route.params;
  const mutation = useTeacherCreateAssessmentMutation(classId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("quiz");
  const [passingScore, setPassingScore] = useState("60");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [strictMode, setStrictMode] = useState(false);

  const handleSubmit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert("Missing title", "Please enter an assessment title.");
      return;
    }

    let dueDate: string | undefined;
    if (dueDateInput.trim()) {
      try {
        dueDate = normalizeDueDate(dueDateInput);
      } catch (error) {
        Alert.alert("Invalid Due Date", toAppError(error).message);
        return;
      }
    }

    const parsedPassing = Number.parseInt(passingScore, 10);
    const parsedAttempts = Number.parseInt(maxAttempts, 10);

    try {
      const created = await mutation.mutateAsync({
        classId,
        title: cleanTitle,
        description: description.trim() || undefined,
        type: assessmentType,
        dueDate,
        passingScore: Number.isFinite(parsedPassing) && parsedPassing > 0 ? parsedPassing : undefined,
        maxAttempts: Number.isFinite(parsedAttempts) && parsedAttempts > 0 ? parsedAttempts : undefined,
        strictMode,
      });
      Alert.alert("Assessment created", "The assessment draft has been created. Please add questions in the editor.", [
        {
          text: "Add Questions Now",
          onPress: () => {
            navigation.replace("TeacherAssessmentEditor", {
              assessmentId: created.id,
              classId,
            });
          },
        },
      ]);
    } catch (error) {
      const appError = toAppError(error);
      Alert.alert("Unable to create assessment", appError.message);
    }
  };

  return (
    <TeacherScreen
      title="Create Assessment"
      subtitle="Create a new class assessment from mobile, including type and due date."
      icon="clipboard-plus-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.redSoft,
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
    >
      <TeacherPanel title="Assessment details" subtitle="Title is required. Other fields can be adjusted later from detail screens.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField
            label="Assessment title"
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Quarter 1 Algebra Quiz"
          />
          <TeacherInlineField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Assessment instructions"
            multiline
          />
          <TeacherInlineField
            label="Due date"
            value={dueDateInput}
            onChangeText={setDueDateInput}
            placeholder="2026-05-30 14:00"
          />
          <TeacherInlineField
            label="Passing score"
            value={passingScore}
            onChangeText={setPassingScore}
            placeholder="60"
          />
          <TeacherInlineField
            label="Max attempts"
            value={maxAttempts}
            onChangeText={setMaxAttempts}
            placeholder="1"
          />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {assessmentTypes.map((type) => (
              <TeacherChip
                key={type}
                label={type.replace(/_/g, " ")}
                active={assessmentType === type}
                onPress={() => setAssessmentType(type)}
              />
            ))}
          </View>
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherChip
              label={strictMode ? "Strict mode enabled" : "Strict mode disabled"}
              active={strictMode}
              onPress={() => setStrictMode((value) => !value)}
            />
          </View>
          <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
            <TeacherActionButton
              label={mutation.isPending ? "Creating..." : "Create assessment"}
              icon="content-save-outline"
              tone="green"
              onPress={() => void handleSubmit()}
              disabled={mutation.isPending}
            />
            <TeacherActionButton label="Cancel" icon="close" tone="neutral" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </TeacherPanel>
    </TeacherScreen>
  );
}
