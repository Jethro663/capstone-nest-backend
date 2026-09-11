import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { adminApi } from "../api/services/admin";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import type {
  ResetAdminUserPasswordResponse,
  UpdateAdminUserDto,
} from "../types/admin";
import type { User } from "../types/user";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import { useAdminDemoMode } from "../hooks/useAdminDemoMode";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "AdminUserDetail">;
type EditableRole = "student" | "teacher" | "admin";
type UserEditForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  role: EditableRole;
  lrn: string;
  gradeLevel: "" | "7" | "8" | "9" | "10";
  dateOfBirth: Date | null;
  gender: "" | "Male" | "Female";
  phone: string;
  address: string;
  familyName: string;
  familyRelationship:
    "" | "Father" | "Mother" | "Guardian" | "Sibling" | "Other";
  familyContact: string;
};

const roleName = (record: User): EditableRole => {
  const value = record.roles
    .map((role) => (typeof role === "string" ? role : role.name))
    .find(Boolean)
    ?.toLowerCase();
  return value === "teacher" || value === "admin" ? value : "student";
};

const toForm = (record: User): UserEditForm => {
  const profile = record.profile;
  const dateValue =
    record.dateOfBirth ?? record.dob ?? profile?.dateOfBirth ?? profile?.dob;
  const grade = String(record.gradeLevel ?? profile?.gradeLevel ?? "");
  return {
    firstName: record.firstName ?? "",
    middleName: record.middleName ?? "",
    lastName: record.lastName ?? "",
    email: record.email,
    role: roleName(record),
    lrn: String(record.lrn ?? profile?.lrn ?? ""),
    gradeLevel: (["7", "8", "9", "10"].includes(grade)
      ? grade
      : "") as UserEditForm["gradeLevel"],
    dateOfBirth: dateValue ? new Date(dateValue) : null,
    gender: (record.gender ?? profile?.gender ?? "") as UserEditForm["gender"],
    phone: String(record.phone ?? profile?.phone ?? ""),
    address: String(record.address ?? profile?.address ?? ""),
    familyName: String(record.familyName ?? profile?.familyName ?? ""),
    familyRelationship: String(
      record.familyRelationship ?? profile?.familyRelationship ?? "",
    ) as UserEditForm["familyRelationship"],
    familyContact: String(record.familyContact ?? profile?.familyContact ?? ""),
  };
};

const formSignature = (form: UserEditForm | null) =>
  JSON.stringify(form, (_key, value) =>
    value instanceof Date ? value.toISOString() : value,
  );

export function AdminUserDetailScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const network = useAdminNetworkStatus();
  const demoMode = useAdminDemoMode();
  const [resetResult, setResetResult] =
    useState<ResetAdminUserPasswordResponse | null>(null);
  const [showPurge, setShowPurge] = useState(false);
  const [purgeConfirmName, setPurgeConfirmName] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserEditForm | null>(null);
  const [baseline, setBaseline] = useState("");
  const [showBirthDate, setShowBirthDate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const user = useQuery({
    queryKey: ["admin-user", route.params.userId],
    queryFn: () => adminApi.getUser(route.params.userId),
  });
  const record = user.data;
  const canRelaxUserLifecycle = demoMode.hasExactRule(
    "user_lifecycle_sequence",
  );
  const canEditDeletedUser = Boolean(
    record?.status === "DELETED" && canRelaxUserLifecycle,
  );
  const canDirectArchive = Boolean(
    record?.status === "SUSPENDED" ||
    (record?.status !== "DELETED" && canRelaxUserLifecycle),
  );
  const canReactivateDeletedUser = Boolean(
    record?.status === "DELETED" && canRelaxUserLifecycle,
  );

  useEffect(() => {
    if (!record || editing) return;
    const next = toForm(record);
    setForm(next);
    setBaseline(formSignature(next));
  }, [editing, record]);

  const dirty = editing && formSignature(form) !== baseline;
  const handleBack = () => {
    if (!editing) return navigation.goBack();
    if (!dirty) return setEditing(false);
    Alert.alert("Discard unsaved changes?", "Your edits have not been saved.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Discard changes",
        style: "destructive",
        onPress: () => {
          if (record) {
            const next = toForm(record);
            setForm(next);
            setBaseline(formSignature(next));
          }
          setEditing(false);
          setFormError(null);
        },
      },
    ]);
  };

  const refreshLists = async () => {
    await Promise.all([
      user.refetch(),
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-user-monitoring"] }),
    ]);
  };
  const requireConnection = (message: string) => {
    if (!network.isOffline) return true;
    Alert.alert("Connection required", message);
    return false;
  };
  const lifecycle = async (action: "suspend" | "reactivate" | "archive") => {
    if (
      !requireConnection(
        "Account lifecycle changes are never queued while offline.",
      )
    )
      return;
    try {
      setBusy(true);
      await adminApi.setUserLifecycle(route.params.userId, action);
      await refreshLists();
    } catch (error) {
      await demoMode.refresh();
      Alert.alert("Lifecycle rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const resetPassword = async () => {
    if (
      !requireConnection(
        "Password changes require a live server connection and are never queued.",
      )
    )
      return;
    try {
      setBusy(true);
      setResetResult(await adminApi.resetUserPassword(route.params.userId));
    } catch (error) {
      Alert.alert("Reset rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (
      !form ||
      !requireConnection(
        "User and role changes require a live server connection and are never queued.",
      )
    )
      return;
    const namesValid = /^[A-Za-z][A-Za-z' -]*$/;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim())
      return setFormError("First name, last name, and email are required.");
    if (
      !namesValid.test(form.firstName.trim()) ||
      !namesValid.test(form.lastName.trim())
    )
      return setFormError(
        "Names may only contain letters, spaces, hyphens, and apostrophes.",
      );
    if (
      form.role === "student" &&
      (!/^\d{12}$/.test(form.lrn) ||
        !form.gradeLevel ||
        !form.dateOfBirth ||
        !form.gender ||
        !/^09\d{9}$/.test(form.phone) ||
        !form.familyName.trim() ||
        !form.familyRelationship ||
        !/^09\d{9}$/.test(form.familyContact))
    ) {
      setFormError(
        "Students require a 12-digit LRN, grade, birth date, gender, valid 09 phone, guardian name, relationship, and valid guardian phone.",
      );
      return;
    }
    const payload: UpdateAdminUserDto = {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || undefined,
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      ...(form.role === "student"
        ? {
            lrn: form.lrn,
            gradeLevel: form.gradeLevel as "7" | "8" | "9" | "10",
            dateOfBirth: form.dateOfBirth?.toISOString().slice(0, 10),
            gender: form.gender as "Male" | "Female",
            phone: form.phone,
            address: form.address.trim() || undefined,
            familyName: form.familyName.trim(),
            familyRelationship: form.familyRelationship as Exclude<
              UserEditForm["familyRelationship"],
              ""
            >,
            familyContact: form.familyContact,
          }
        : {}),
    };
    try {
      setBusy(true);
      setFormError(null);
      const updated = await adminApi.updateUser(route.params.userId, payload);
      queryClient.setQueryData(["admin-user", route.params.userId], updated);
      const next = toForm(updated);
      setForm(next);
      setBaseline(formSignature(next));
      setEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-monitoring"] }),
      ]);
    } catch (error) {
      await demoMode.refresh();
      setFormError(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const purge = async () => {
    if (!record) return;
    const exactName =
      `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim();
    if (
      !requireConnection("Permanent deletion is never queued while offline.") ||
      record.status !== "DELETED" ||
      purgeConfirmName !== exactName
    )
      return;
    try {
      setBusy(true);
      await adminApi.purgeUser(route.params.userId);
      queryClient.removeQueries({
        queryKey: ["admin-user", route.params.userId],
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-monitoring"] }),
      ]);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Purge rejected", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportRecord = async () => {
    try {
      setBusy(true);
      const exported = await adminApi.exportUser(route.params.userId);
      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");
      const fileUri = `${FileSystem.cacheDirectory}user-export-${route.params.userId}.json`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exported, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 },
      );
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Share user archive",
        });
      else Alert.alert("Export prepared", fileUri);
    } catch (error) {
      Alert.alert("Export failed", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const roleNames =
    record?.roles
      .map((role) => (typeof role === "string" ? role : role.name))
      .filter(Boolean) ?? [];
  const profile = record?.profile;
  const teacher = record?.teacherProfile;
  const fullName = record
    ? `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim()
    : "";
  const rightAction =
    record && !editing ? (
      <AdminButton
        label="Edit user"
        icon="account-edit"
        disabled={record.status === "DELETED" && !canEditDeletedUser}
        onPress={() => {
          const next = toForm(record);
          setForm(next);
          setBaseline(formSignature(next));
          setFormError(null);
          setEditing(true);
        }}
      />
    ) : undefined;
  const changeBirthDate = (_event: DateTimePickerEvent, value?: Date) => {
    setShowBirthDate(false);
    if (value)
      setForm((current) =>
        current ? { ...current, dateOfBirth: value } : current,
      );
  };
  const update = <Key extends keyof UserEditForm>(
    key: Key,
    value: UserEditForm[Key],
  ) => setForm((current) => (current ? { ...current, [key]: value } : current));

  return (
    <AdminScreen
      title={editing ? "Edit user" : "User detail"}
      subtitle="Identity, profile, access, and lifecycle"
      showBackButton
      onBackPress={handleBack}
      backLabel={editing ? "Close user editor" : "Back to users"}
      rightAction={rightAction}
      refreshing={user.isRefetching}
      onRefresh={() => void user.refetch()}
    >
      {user.isError ? (
        <AdminEmpty
          title="User unavailable"
          subtitle={toAppError(user.error).message}
          actionLabel="Try again"
          onAction={() => void user.refetch()}
        />
      ) : null}
      {record ? (
        <>
          {network.isOffline ? (
            <AdminNotice
              title="Offline · actions disabled"
              description="This cached record is read-only. User, role, password, lifecycle, and purge writes require a live connection and are never queued."
              tone="amber"
              icon="cloud-off-outline"
            />
          ) : null}
          {record.status === "DELETED" && canRelaxUserLifecycle ? (
            <AdminNotice
              title="Demo mode · archived account exception"
              description="Editing and reactivation are available as audited lifecycle exceptions. Permanent purge still requires the archived state and exact full-name confirmation."
              tone="amber"
              icon="shield-alert-outline"
            />
          ) : null}
          {editing && form ? (
            <>
              {formError ? (
                <AdminNotice
                  title="User changes not ready"
                  description={formError}
                  tone="red"
                  icon="alert-circle-outline"
                />
              ) : null}
              <AdminSection
                title="Account details"
                subtitle="Matches the web administrator edit contract"
              >
                <View style={{ padding: 16, gap: 10 }}>
                  <AdminField
                    label="First name"
                    value={form.firstName}
                    onChangeText={(value) => update("firstName", value)}
                    maxLength={30}
                  />
                  <AdminField
                    label="Middle name"
                    value={form.middleName}
                    onChangeText={(value) => update("middleName", value)}
                    maxLength={30}
                  />
                  <AdminField
                    label="Last name"
                    value={form.lastName}
                    onChangeText={(value) => update("lastName", value)}
                    maxLength={30}
                  />
                  <AdminField
                    label="Email"
                    value={form.email}
                    onChangeText={(value) => update("email", value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={100}
                  />
                  <Text style={{ color: theme.subtext, fontWeight: "800" }}>
                    Role
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {(["student", "teacher", "admin"] as const).map((value) => (
                      <AdminChip
                        key={value}
                        label={value}
                        active={form.role === value}
                        onPress={() => update("role", value)}
                      />
                    ))}
                  </View>
                </View>
              </AdminSection>
              {form.role === "student" ? (
                <AdminSection
                  title="Student profile"
                  subtitle="Complete required learner and guardian fields"
                >
                  <View style={{ padding: 16, gap: 10 }}>
                    <AdminField
                      label="LRN"
                      value={form.lrn}
                      onChangeText={(value) =>
                        update("lrn", value.replace(/\D/g, "").slice(0, 12))
                      }
                      keyboardType="number-pad"
                      maxLength={12}
                    />
                    <Text style={{ color: theme.subtext, fontWeight: "800" }}>
                      Grade level
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["7", "8", "9", "10"] as const).map((value) => (
                        <AdminChip
                          key={value}
                          label={`Grade ${value}`}
                          active={form.gradeLevel === value}
                          onPress={() => update("gradeLevel", value)}
                        />
                      ))}
                    </View>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>
                      Date of birth:{" "}
                      {form.dateOfBirth?.toLocaleDateString() ??
                        "Choose a date"}
                    </Text>
                    <AdminButton
                      label="Choose date of birth"
                      onPress={() => setShowBirthDate(true)}
                    />
                    {showBirthDate ? (
                      <DateTimePicker
                        value={form.dateOfBirth ?? new Date(2012, 0, 1)}
                        mode="date"
                        maximumDate={new Date()}
                        onChange={changeBirthDate}
                      />
                    ) : null}
                    <Text style={{ color: theme.subtext, fontWeight: "800" }}>
                      Gender
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["Male", "Female"] as const).map((value) => (
                        <AdminChip
                          key={value}
                          label={value}
                          active={form.gender === value}
                          onPress={() => update("gender", value)}
                        />
                      ))}
                    </View>
                    <AdminField
                      label="Phone"
                      value={form.phone}
                      onChangeText={(value) =>
                        update("phone", value.replace(/\D/g, "").slice(0, 11))
                      }
                      keyboardType="phone-pad"
                      maxLength={11}
                    />
                    <AdminField
                      label="Address"
                      value={form.address}
                      onChangeText={(value) => update("address", value)}
                      maxLength={180}
                    />
                    <AdminField
                      label="Guardian name"
                      value={form.familyName}
                      onChangeText={(value) => update("familyName", value)}
                      maxLength={80}
                    />
                    <Text style={{ color: theme.subtext, fontWeight: "800" }}>
                      Relationship
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {(
                        [
                          "Father",
                          "Mother",
                          "Guardian",
                          "Sibling",
                          "Other",
                        ] as const
                      ).map((value) => (
                        <AdminChip
                          key={value}
                          label={value}
                          active={form.familyRelationship === value}
                          onPress={() => update("familyRelationship", value)}
                        />
                      ))}
                    </View>
                    <AdminField
                      label="Guardian contact"
                      value={form.familyContact}
                      onChangeText={(value) =>
                        update(
                          "familyContact",
                          value.replace(/\D/g, "").slice(0, 11),
                        )
                      }
                      keyboardType="phone-pad"
                      maxLength={11}
                    />
                  </View>
                </AdminSection>
              ) : null}
              <View style={{ padding: 16, flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AdminButton
                    label="Cancel"
                    onPress={handleBack}
                    disabled={busy}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AdminButton
                    label={busy ? "Saving…" : "Save changes"}
                    icon="content-save"
                    tone="green"
                    variant="solid"
                    disabled={busy || network.isOffline || !dirty}
                    onPress={() => void save()}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <AdminSection
                title={fullName || record.email}
                subtitle={roleNames.join(", ") || "Account"}
              >
                <AdminDataRow
                  title="Email"
                  subtitle={record.email}
                  status={record.isEmailVerified ? "Verified" : "Unverified"}
                  statusTone={record.isEmailVerified ? "green" : "amber"}
                />
                <AdminDataRow title="Account status" subtitle={record.status} />
                {(record.lrn ?? profile?.lrn) ? (
                  <AdminDataRow
                    title="LRN"
                    subtitle={record.lrn ?? profile?.lrn}
                  />
                ) : null}
                {(record.gradeLevel ?? profile?.gradeLevel) ? (
                  <AdminDataRow
                    title="Grade level"
                    subtitle={record.gradeLevel ?? profile?.gradeLevel}
                  />
                ) : null}
                {(record.dateOfBirth ?? profile?.dateOfBirth) ? (
                  <AdminDataRow
                    title="Date of birth"
                    subtitle={new Date(
                      record.dateOfBirth ?? profile?.dateOfBirth ?? "",
                    ).toLocaleDateString()}
                  />
                ) : null}
                {(record.gender ?? profile?.gender) ? (
                  <AdminDataRow
                    title="Gender"
                    subtitle={record.gender ?? profile?.gender}
                  />
                ) : null}
                {(record.phone ?? profile?.phone) ? (
                  <AdminDataRow
                    title="Phone"
                    subtitle={record.phone ?? profile?.phone}
                  />
                ) : null}
                {(record.address ?? profile?.address) ? (
                  <AdminDataRow
                    title="Address"
                    subtitle={record.address ?? profile?.address}
                  />
                ) : null}
                {(record.familyName ?? profile?.familyName) ? (
                  <AdminDataRow
                    title="Guardian"
                    subtitle={`${record.familyName ?? profile?.familyName}${(record.familyRelationship ?? profile?.familyRelationship) ? ` · ${record.familyRelationship ?? profile?.familyRelationship}` : ""}`}
                    meta={record.familyContact ?? profile?.familyContact}
                  />
                ) : null}
                {record.graduatedAt ? (
                  <AdminDataRow
                    title="Graduated"
                    subtitle={new Date(record.graduatedAt).toLocaleDateString()}
                  />
                ) : null}
                {(record.employeeId ?? teacher?.employeeId) ? (
                  <AdminDataRow
                    title="Employee ID"
                    subtitle={record.employeeId ?? teacher?.employeeId}
                  />
                ) : null}
                {(record.contactNumber ?? teacher?.contactNumber) ? (
                  <AdminDataRow
                    title="Contact"
                    subtitle={record.contactNumber ?? teacher?.contactNumber}
                  />
                ) : null}
                {(record.department ?? teacher?.department) ? (
                  <AdminDataRow
                    title="Department"
                    subtitle={record.department ?? teacher?.department}
                  />
                ) : null}
                {(record.specialization ?? teacher?.specialization) ? (
                  <AdminDataRow
                    title="Specialization"
                    subtitle={record.specialization ?? teacher?.specialization}
                  />
                ) : null}
              </AdminSection>
              {resetResult ? (
                <AdminNotice
                  title={
                    resetResult.emailDeliveryStatus === "failed"
                      ? "Password changed; email failed"
                      : "Temporary password created"
                  }
                  description={`${resetResult.generatedPassword}${resetResult.emailDeliveryError ? ` · ${resetResult.emailDeliveryError}` : ""}`}
                  tone={
                    resetResult.emailDeliveryStatus === "failed"
                      ? "amber"
                      : "green"
                  }
                  icon="key-outline"
                />
              ) : null}
              <AdminSection
                title="Account actions"
                subtitle="Routine actions remain separate from permanent deletion"
              >
                <View style={{ padding: 16, gap: 8 }}>
                  <AdminButton
                    label={busy ? "Working…" : "Reset password"}
                    icon="key-outline"
                    variant="solid"
                    disabled={
                      busy || network.isOffline || record.status === "DELETED"
                    }
                    onPress={() => void resetPassword()}
                  />
                  <AdminButton
                    label="Export user archive"
                    icon="download"
                    tone="green"
                    variant="solid"
                    disabled={busy}
                    onPress={() => void exportRecord()}
                  />
                  {record.status === "SUSPENDED" || canReactivateDeletedUser ? (
                    <AdminButton
                      label="Reactivate account"
                      icon="account-check"
                      tone="green"
                      variant="solid"
                      disabled={busy || network.isOffline}
                      onPress={() =>
                        Alert.alert(
                          "Reactivate account?",
                          record.status === "DELETED"
                            ? "Demo mode will restore this archived account as an audited exception."
                            : "The user will regain sign-in access.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Reactivate",
                              onPress: () => void lifecycle("reactivate"),
                            },
                          ],
                        )
                      }
                    />
                  ) : record.status !== "DELETED" ? (
                    <AdminButton
                      label="Suspend account"
                      icon="account-lock"
                      tone="amber"
                      variant="solid"
                      disabled={busy || network.isOffline}
                      onPress={() =>
                        Alert.alert(
                          "Suspend account?",
                          "All records are preserved, but sign-in access is removed.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Suspend",
                              style: "destructive",
                              onPress: () => void lifecycle("suspend"),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
                  {canDirectArchive ? (
                    <AdminButton
                      label="Archive account"
                      icon="archive-outline"
                      tone="red"
                      variant="solid"
                      disabled={busy || network.isOffline}
                      onPress={() =>
                        Alert.alert(
                          "Archive account?",
                          "The account will be soft-deleted; official records remain preserved.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Archive",
                              style: "destructive",
                              onPress: () => void lifecycle("archive"),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
                  {record.status === "DELETED" ? (
                    <AdminButton
                      label={
                        showPurge
                          ? "Cancel permanent deletion"
                          : "Purge permanently"
                      }
                      icon={showPurge ? "close" : "delete-forever"}
                      tone="red"
                      variant="solid"
                      disabled={busy || network.isOffline}
                      onPress={() => {
                        setShowPurge((value) => !value);
                        setPurgeConfirmName("");
                      }}
                    />
                  ) : null}
                </View>
              </AdminSection>
              {record.status === "DELETED" && showPurge ? (
                <AdminSection
                  title="Permanent deletion"
                  subtitle="This matches the web guard and cannot be undone"
                >
                  <View style={{ padding: 16, gap: 10 }}>
                    <AdminNotice
                      title="Export first"
                      description="Purging removes the archived account permanently. Export its archive before continuing."
                      tone="red"
                      icon="alert-octagon-outline"
                    />
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 12,
                        lineHeight: 18,
                      }}
                    >
                      Type the full name exactly: {fullName}
                    </Text>
                    <AdminField
                      label="Full name confirmation"
                      value={purgeConfirmName}
                      onChangeText={setPurgeConfirmName}
                      autoCapitalize="words"
                    />
                    <AdminButton
                      label={busy ? "Purging…" : "Purge user permanently"}
                      icon="delete-forever"
                      tone="red"
                      variant="solid"
                      disabled={
                        busy ||
                        network.isOffline ||
                        !fullName ||
                        purgeConfirmName !== fullName
                      }
                      onPress={() => void purge()}
                    />
                  </View>
                </AdminSection>
              ) : null}
            </>
          )}
        </>
      ) : (
        <View style={{ padding: 24 }}>
          <Text style={{ color: theme.muted }}>Loading user record…</Text>
        </View>
      )}
    </AdminScreen>
  );
}
