import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { AdminAcademicScreen } from "./AdminAcademicScreen";

export function AdminLearnerCompletionSettingsScreen({
  navigation,
}: NativeStackScreenProps<
  RootStackParamList,
  "AdminSettingsLearnerCompletion"
>) {
  return (
    <AdminAcademicScreen
      navigation={navigation}
      workspace="learner-completion"
    />
  );
}
