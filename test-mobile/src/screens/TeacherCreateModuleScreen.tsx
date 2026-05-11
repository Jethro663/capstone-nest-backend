import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, View } from "react-native";
import { useTeacherCreateModuleMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherInlineField,
  TeacherPanel,
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherCreateModule">;

export function TeacherCreateModuleScreen({ navigation, route }: Props) {
  const { classId } = route.params;
  const mutation = useTeacherCreateModuleMutation(classId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const handleSubmit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert("Missing title", "Please enter a module title before saving.");
      return;
    }

    try {
      await mutation.mutateAsync({
        classId,
        title: cleanTitle,
        description: description.trim() || undefined,
        isVisible,
        isLocked,
      });
      Alert.alert("Module created", "The module has been added to this class.");
      navigation.goBack();
    } catch (error) {
      const appError = toAppError(error);
      Alert.alert("Unable to create module", appError.message);
    }
  };

  return (
    <TeacherScreen
      title="Create Module"
      subtitle="Create a module from mobile so teachers can organize content directly from the app."
      icon="folder-plus-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
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
      <TeacherPanel title="Module details" subtitle="Title is required. Description and visibility options are optional.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField
            label="Module title"
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Week 3 Algebra"
          />
          <TeacherInlineField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What this module covers"
            multiline
          />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherChip
              label={isVisible ? "Visible to students" : "Hidden from students"}
              active={isVisible}
              onPress={() => setIsVisible((value) => !value)}
            />
            <TeacherChip
              label={isLocked ? "Locked module" : "Unlocked module"}
              active={isLocked}
              onPress={() => setIsLocked((value) => !value)}
            />
          </View>
          <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
            <TeacherActionButton
              label={mutation.isPending ? "Creating..." : "Create module"}
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
