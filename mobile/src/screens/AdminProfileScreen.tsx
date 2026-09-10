import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { toAppError } from "../api/http";
import { PasswordChangeForm } from "../components/account/PasswordChangeForm";
import { AppVersionInfo } from "../components/AppVersionInfo";
import {
  AdminButton,
  AdminDataRow,
  AdminField,
  AdminMetricStrip,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
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

  const saveProfile = async () => {
    try {
      setSaving(true);
      await updateProfile({
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
      });
      Alert.alert("Profile saved", "Administrator identity was updated.");
    } catch (error) {
      Alert.alert("Profile update rejected", toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreen
      title="Administrator profile"
      subtitle="Account identity and security"
      onRefresh={() => void refreshAuth()}
    >
      <AdminMetricStrip items={[
        { label: "Role", value: "Admin" },
        { label: "Status", value: user?.status ?? "--", tone: "green" },
        { label: "Verified", value: user?.isEmailVerified ? "Yes" : "No" },
      ]} />

      <AdminSection title="Account identity">
        <AdminDataRow title={name} subtitle={user?.email ?? "No email"} status={user?.status ?? undefined} statusTone="green" />
      </AdminSection>

      <AdminSection title="Profile identity" subtitle="These are the account-owned name fields used across Nexora">
        <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
          <AdminField label="Administrator first name" placeholder="First name" value={firstName} onChangeText={setFirstName} />
          <AdminField label="Administrator middle name" placeholder="Middle name" value={middleName} onChangeText={setMiddleName} />
          <AdminField label="Administrator last name" placeholder="Last name" value={lastName} onChangeText={setLastName} />
          <AdminButton
            label={saving ? "Saving…" : "Save profile"}
            icon="content-save"
            tone="green"
            variant="solid"
            disabled={saving || !firstName.trim() || !lastName.trim()}
            onPress={() => void saveProfile()}
          />
        </View>
      </AdminSection>

      <AdminSection title="Security" subtitle="Password changes use the authenticated account contract">
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}><PasswordChangeForm /></View>
      </AdminSection>

      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <AdminButton label="Sign out" icon="logout" tone="red" onPress={() => void logout()} />
      </View>
      <Text style={{ color: theme.muted, fontSize: 11, textAlign: "center", margin: 16 }}>
        Profile identity remains protected by the same completion gate.
      </Text>
      <AppVersionInfo color={theme.muted} style={{ marginBottom: 16, marginHorizontal: 16 }} />
    </AdminScreen>
  );
}
