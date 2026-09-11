import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { AdminAcademicScreen } from "./AdminAcademicScreen";

export function AdminAuditRecoverySettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AdminSettingsAuditRecovery">) {
  return (
    <AdminAcademicScreen navigation={navigation} workspace="audit-recovery" />
  );
}
