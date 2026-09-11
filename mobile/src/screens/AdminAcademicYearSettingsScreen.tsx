import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { AdminAcademicScreen } from "./AdminAcademicScreen";

export function AdminAcademicYearSettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AdminSettingsAcademicYear">) {
  return (
    <AdminAcademicScreen navigation={navigation} workspace="academic-year" />
  );
}
