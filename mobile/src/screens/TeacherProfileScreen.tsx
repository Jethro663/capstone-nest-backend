import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { API_BASE_URL } from "../api/config";
import {
  useTeacherProfile,
  useTeacherProfileAvatarMutation,
  useTeacherProfileUpdateMutation,
} from "../api/hooks";
import { toAppError } from "../api/http";
import { normalizePhilippinePhone } from "../utils/studentIdentity";
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherAccordionSection,
  TeacherActionButton,
  TeacherInlineField,
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import { PasswordChangeForm } from "../components/account/PasswordChangeForm";
import { AppVersionInfo } from "../components/AppVersionInfo";

type Props = BottomTabScreenProps<MainTabParamList, "Profile">;

const assetBaseUrl = API_BASE_URL.replace(/\/api$/, "");

function resolveImageUri(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${assetBaseUrl}${path}`;
}

export function TeacherProfileScreen(_: Props) {
  const { user, logout } = useAuth();
  const profileQuery = useTeacherProfile();
  const profile = profileQuery.data;
  const updateMutation = useTeacherProfileUpdateMutation(user?.userId || user?.id);
  const avatarMutation = useTeacherProfileAvatarMutation();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [expandedSection, setExpandedSection] = useState<
    "contact" | "professional" | "security" | null
  >("contact");

  useEffect(() => {
    setPhone(profile?.phone ?? profile?.contactNumber ?? "");
    setAddress(profile?.address ?? "");
    setDepartment(profile?.department ?? "");
    setSpecialization(profile?.specialization ?? "");
    setEmployeeId(profile?.employeeId ?? "");
  }, [profile?.address, profile?.contactNumber, profile?.department, profile?.employeeId, profile?.phone, profile?.specialization]);

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Teacher",
    [user?.email, user?.firstName, user?.lastName],
  );
  const avatarUri = resolveImageUri(profile?.profilePicture || user?.profilePicture);

  const saveProfile = async () => {
    try {
      const trimmedPhone = phone.trim();
      const normPhone = trimmedPhone ? normalizePhilippinePhone(trimmedPhone) : undefined;
      
      if (trimmedPhone && !normPhone) {
        Alert.alert("Invalid Phone", "Use 09XXXXXXXXX or +639XXXXXXXXX.");
        return;
      }

      await updateMutation.mutateAsync({
        phone: normPhone ?? undefined,
        contactNumber: normPhone ?? undefined,
        address: address.trim() || undefined,
        department: department.trim() || undefined,
        specialization: specialization.trim() || undefined,
        employeeId: employeeId.trim() || undefined,
      });
    } catch (error) {
      Alert.alert("Unable to save teacher profile", toAppError(error).message);
    }
  };

  const uploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (selection.canceled || !selection.assets[0]) {
      return;
    }

    const asset = selection.assets[0];
    try {
      await avatarMutation.mutateAsync({
        uri: asset.uri,
        name: asset.fileName || "teacher-avatar.jpg",
        type: asset.mimeType || "image/jpeg",
      });
    } catch (error) {
      Alert.alert("Unable to upload avatar", toAppError(error).message);
    }
  };

  return (
    <TeacherScreen
      title="Profile"
      subtitle="Teacher profile fields now use the teacher profile API instead of the student endpoint."
      icon="account-circle-outline"
      refreshing={profileQuery.isRefetching}
      onRefresh={() => {
        void profileQuery.refetch();
      }}
    >
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 4,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          overflow: "hidden",
        }}
      >
        <View style={{ height: 5, backgroundColor: theme.red }} />
        <View style={{ paddingHorizontal: 18, paddingVertical: 18, alignItems: "center" }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              backgroundColor: theme.active,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 8,
              borderWidth: 3,
              borderColor: theme.redSoft,
            }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ fontSize: 26, fontWeight: "800", color: theme.text }}>{fullName.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <Text style={{ marginTop: 12, fontSize: 16, fontWeight: "800", color: theme.text }}>{fullName}</Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: theme.muted }}>{user?.email}</Text>
          <View style={{ marginTop: 12 }}>
            <TeacherActionButton label="Change photo" icon="image-edit-outline" tone="red" onPress={() => void uploadAvatar()} disabled={avatarMutation.isPending} />
          </View>
        </View>
      </View>

      <TeacherAccordionSection
        title="Contact details"
        subtitle="Phone number and home address."
        icon="card-account-phone-outline"
        expanded={expandedSection === "contact"}
        onToggle={() =>
          setExpandedSection((current) => (current === "contact" ? null : "contact"))
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Phone" value={phone} onChangeText={setPhone} placeholder="09XXXXXXXXX" maxLength={13} />
          <TeacherInlineField label="Address" value={address} onChangeText={setAddress} placeholder="Home address" multiline />
          <View style={{ marginTop: 12, alignItems: "flex-start" }}>
            <TeacherActionButton label="Save contact details" icon="content-save-outline" tone="red" onPress={() => void saveProfile()} disabled={updateMutation.isPending} />
          </View>
        </View>
      </TeacherAccordionSection>

      <TeacherAccordionSection
        title="Professional details"
        subtitle="Department, specialization, and employee record."
        icon="briefcase-account-outline"
        expanded={expandedSection === "professional"}
        onToggle={() =>
          setExpandedSection((current) =>
            current === "professional" ? null : "professional",
          )
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Department" value={department} onChangeText={setDepartment} placeholder="Department" />
          <TeacherInlineField label="Specialization" value={specialization} onChangeText={setSpecialization} placeholder="Specialization" />
          <TeacherInlineField label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="Employee ID" />
          <View style={{ marginTop: 12, alignItems: "flex-start" }}>
            <TeacherActionButton label="Save professional details" icon="content-save-outline" tone="red" onPress={() => void saveProfile()} disabled={updateMutation.isPending} />
          </View>
        </View>
      </TeacherAccordionSection>

      <TeacherAccordionSection
        title="Security"
        subtitle="Change the password for this account."
        icon="shield-lock-outline"
        expanded={expandedSection === "security"}
        onToggle={() =>
          setExpandedSection((current) => (current === "security" ? null : "security"))
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <PasswordChangeForm />
        </View>
      </TeacherAccordionSection>

      <View
        style={{
          marginHorizontal: 16,
          marginTop: 20,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>
          App information
        </Text>
        <AppVersionInfo color={theme.muted} style={{ marginTop: 7 }} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => void logout()}
        style={{
          marginHorizontal: 16,
          marginTop: 20,
          marginBottom: 24,
          minHeight: 50,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.red,
          backgroundColor: theme.surface,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <MaterialCommunityIcons name="logout" size={20} color={theme.red} />
        <Text style={{ fontSize: 14, fontWeight: "900", color: theme.red }}>
          Log out
        </Text>
      </Pressable>
    </TeacherScreen>
  );
}
