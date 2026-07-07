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
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherInlineField,
  TeacherPanel,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

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

  useEffect(() => {
    setPhone(profile?.phone || profile?.contactNumber || "");
    setAddress(profile?.address || "");
    setDepartment(profile?.department || "");
    setSpecialization(profile?.specialization || "");
    setEmployeeId(profile?.employeeId || "");
  }, [profile?.address, profile?.contactNumber, profile?.department, profile?.employeeId, profile?.phone, profile?.specialization]);

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Teacher",
    [user?.email, user?.firstName, user?.lastName],
  );
  const avatarUri = resolveImageUri(profile?.profilePicture || user?.profilePicture);

  const saveProfile = async () => {
    try {
      await updateMutation.mutateAsync({
        phone: phone.trim() || undefined,
        contactNumber: phone.trim() || undefined,
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
      <TeacherStats
        items={[
          { label: "Role", value: "Teacher", tone: "red" },
          { label: "Status", value: user?.status || "ACTIVE", tone: "green" },
          { label: "Department", value: profile?.department || "--", tone: "blue" },
        ]}
      />

      <TeacherPanel title="Account" subtitle={user?.email || "Teacher account"}>
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, alignItems: "center" }}>
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
            <TeacherActionButton label="Change photo" icon="image-edit-outline" tone="blue" onPress={() => void uploadAvatar()} disabled={avatarMutation.isPending} />
          </View>
        </View>
      </TeacherPanel>

      <TeacherPanel title="Teacher profile" subtitle="Stay inside the same flatter mobile form language used by the existing profile flow.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <TeacherInlineField label="Phone" value={phone} onChangeText={setPhone} placeholder="09XXXXXXXXX" />
          <TeacherInlineField label="Address" value={address} onChangeText={setAddress} placeholder="Home address" multiline />
          <TeacherInlineField label="Department" value={department} onChangeText={setDepartment} placeholder="Department" />
          <TeacherInlineField label="Specialization" value={specialization} onChangeText={setSpecialization} placeholder="Specialization" />
          <TeacherInlineField label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="Employee ID" />

          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton label="Save profile" icon="content-save-outline" tone="green" onPress={() => void saveProfile()} disabled={updateMutation.isPending} />
            <TeacherActionButton label="Log out" icon="logout" tone="amber" onPress={() => void logout()} />
          </View>
        </View>
      </TeacherPanel>
    </TeacherScreen>
  );
}
