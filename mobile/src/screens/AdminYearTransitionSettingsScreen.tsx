import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { AdminAcademicScreen } from "./AdminAcademicScreen";

export function AdminYearTransitionSettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AdminSettingsYearTransition">) {
  return (
    <AdminAcademicScreen navigation={navigation} workspace="year-transition" />
  );
}
