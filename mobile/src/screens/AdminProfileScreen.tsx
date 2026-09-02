import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { toAppError } from "../api/http";
import { PasswordChangeForm } from "../components/account/PasswordChangeForm";
import { TeacherActionButton, TeacherPanel, TeacherRow, TeacherScreen, TeacherStats, teacherTheme as theme } from "../components/teacher/TeacherMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";

type Props = BottomTabScreenProps<MainTabParamList, "Profile">;

export function AdminProfileScreen(_: Props) {
  const { user, logout, refreshAuth, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [middleName, setMiddleName] = useState(user?.middleName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const name = [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") || "Administrator";
  return (
    <TeacherScreen title="Administrator profile" workspaceLabel="Admin workspace" subtitle="Authenticated account details and secure password controls." icon="shield-account-outline" onRefresh={() => void refreshAuth()}>
      <TeacherStats items={[{ label: "Role", value: "Admin", tone: "red" }, { label: "Status", value: user?.status ?? "--", tone: "green" }, { label: "Verified", value: user?.isEmailVerified ? "Yes" : "No", tone: "blue" }]} />
      <TeacherPanel title="Account identity"><TeacherRow title={name} subtitle={user?.email ?? "No email"} /></TeacherPanel>
      <TeacherPanel title="Profile identity" subtitle="Update the same account-owned name fields enforced by the completion gate."><View style={{ padding: 14, gap: 8 }}><TextInput accessibilityLabel="Administrator first name" placeholder="First name" placeholderTextColor={theme.muted} value={firstName} onChangeText={setFirstName} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} /><TextInput accessibilityLabel="Administrator middle name" placeholder="Middle name" placeholderTextColor={theme.muted} value={middleName} onChangeText={setMiddleName} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} /><TextInput accessibilityLabel="Administrator last name" placeholder="Last name" placeholderTextColor={theme.muted} value={lastName} onChangeText={setLastName} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, padding: 11 }} /><TeacherActionButton label={saving ? "Saving..." : "Save profile"} icon="content-save" tone="green" disabled={saving || !firstName.trim() || !lastName.trim()} onPress={() => void (async () => { try { setSaving(true); await updateProfile({ firstName: firstName.trim(), middleName: middleName.trim() || undefined, lastName: lastName.trim() }); Alert.alert("Profile saved", "Administrator identity was updated."); } catch (error) { Alert.alert("Profile update rejected", toAppError(error).message); } finally { setSaving(false); } })()} /></View></TeacherPanel>
      <TeacherPanel title="Security" subtitle="Password changes use the authenticated backend contract and clear sensitive fields after every attempt."><View style={{ padding: 14 }}><PasswordChangeForm /></View></TeacherPanel>
      <View style={{ marginHorizontal: 16, marginTop: 10 }}><TeacherActionButton label="Sign out" icon="logout" tone="red" onPress={() => void logout()} /></View>
      <Text style={{ color: theme.muted, fontSize: 11, textAlign: "center", margin: 16 }}>Profile identity edits use the same forced completion gate when names are missing.</Text>
    </TeacherScreen>
  );
}
