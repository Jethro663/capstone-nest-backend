import { useState } from "react";
import { Alert, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { adminApi } from "../api/services/admin";
import { toAppError } from "../api/http";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import type { RootStackParamList } from "../navigation/types";
import {
  AdminButton,
  AdminChip,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "AdminCreateUser">;
type Role = "student" | "teacher" | "admin";

export function AdminCreateUserScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const network = useAdminNetworkStatus();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [lrn, setLrn] = useState("");
  const [gradeLevel, setGradeLevel] = useState<"7" | "8" | "9" | "10">("7");
  const [employeeId, setEmployeeId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreate =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    (role !== "student" || /^\d{12}$/.test(lrn.trim())) &&
    (role !== "teacher" || (employeeId.trim() && contactNumber.trim()));
  const create = async () => {
    if (network.isOffline) {
      setError(
        "A live connection is required. Account and role writes are never queued while offline.",
      );
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const user = await adminApi.createUser({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        role,
        ...(role === "student"
          ? { lrn: lrn.trim(), gradeLevel }
          : role === "teacher"
            ? {
                employeeId: employeeId.trim().toUpperCase(),
                contactNumber: contactNumber.trim(),
              }
            : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      navigation.replace("AdminUserDetail", { userId: user.id });
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminScreen
      title="Create user"
      subtitle="One authoritative account and profile request"
      showBackButton
      onBackPress={navigation.goBack}
    >
      {network.isOffline ? (
        <AdminNotice
          title="Offline · creation disabled"
          description="Account and role writes require a live connection and are never queued."
          tone="amber"
          icon="cloud-off-outline"
        />
      ) : null}
      {error ? (
        <AdminNotice
          title="User was not created"
          description={error}
          tone="red"
        />
      ) : null}
      <AdminSection
        title="Identity"
        subtitle="Names and verified email destination"
      >
        <View style={{ padding: 16, gap: 10 }}>
          <AdminField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <AdminField
            label="Middle name"
            value={middleName}
            onChangeText={setMiddleName}
          />
          <AdminField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
          />
          <AdminField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </AdminSection>
      <AdminSection
        title="Role and onboarding"
        subtitle="Role-specific identifiers are required"
      >
        <View style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["student", "teacher", "admin"] as const).map((entry) => (
              <AdminChip
                key={entry}
                label={entry}
                active={role === entry}
                onPress={() => setRole(entry)}
              />
            ))}
          </View>
          {role === "student" ? (
            <>
              <AdminField
                label="LRN"
                value={lrn}
                onChangeText={setLrn}
                keyboardType="number-pad"
                maxLength={12}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["7", "8", "9", "10"] as const).map((entry) => (
                  <AdminChip
                    key={entry}
                    label={`Grade ${entry}`}
                    active={gradeLevel === entry}
                    onPress={() => setGradeLevel(entry)}
                  />
                ))}
              </View>
            </>
          ) : null}
          {role === "teacher" ? (
            <>
              <AdminField
                label="Employee ID"
                value={employeeId}
                onChangeText={setEmployeeId}
                autoCapitalize="characters"
                maxLength={20}
              />
              <AdminField
                label="Contact number"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
                maxLength={13}
              />
            </>
          ) : null}
          <AdminButton
            label={busy ? "Creating…" : "Review and create user"}
            icon="account-plus"
            tone="green"
            variant="solid"
            disabled={network.isOffline || busy || !canCreate}
            onPress={() =>
              Alert.alert(
                "Create this account?",
                "The account, role, and role profile will be created together. Verification email delivery follows the existing backend procedure.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Create", onPress: () => void create() },
                ],
              )
            }
          />
        </View>
      </AdminSection>
    </AdminScreen>
  );
}
