import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { AdminAcademicScreen } from "./AdminAcademicScreen";

export function AdminAssessmentsGradingSettingsScreen({
  navigation,
}: NativeStackScreenProps<
  RootStackParamList,
  "AdminSettingsAssessmentsGrading"
>) {
  return (
    <AdminAcademicScreen
      navigation={navigation}
      workspace="assessments-grading"
    />
  );
}
