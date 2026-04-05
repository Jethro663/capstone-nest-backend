import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  Card,
  GradientHeader,
  Pill,
  ProgressBar,
  Refreshable,
  ScreenScroll,
  SectionTitle,
} from "../components/ui/primitives";
import { useProfile, useProfileAvatarMutation, useProfileUpdateMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import { API_BASE_URL } from "../api/config";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import { buildProfileFullName, computeProfileReadiness } from "./screen-flow";
import { colors, gradients } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Profile">;

const assetBaseUrl = API_BASE_URL.replace(/\/api$/, "");

export function ProfileScreen(_: Props) {
  const { user, logout } = useAuth();
  const profileQuery = useProfile();
  const profile = profileQuery.data;
  const updateMutation = useProfileUpdateMutation(user?.userId || user?.id);
  const avatarMutation = useProfileAvatarMutation();
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [familyName, setFamilyName] = useState(profile?.familyName || "");
  const [familyContact, setFamilyContact] = useState(profile?.familyContact || "");
  const [error, setError] = useState("");

  const fullName = useMemo(
    () =>
      buildProfileFullName({
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
      }),
    [user?.email, user?.firstName, user?.lastName],
  );

  useEffect(() => {
    setPhone(profile?.phone || "");
    setAddress(profile?.address || "");
    setFamilyName(profile?.familyName || "");
    setFamilyContact(profile?.familyContact || "");
  }, [profile?.address, profile?.familyContact, profile?.familyName, profile?.phone]);

  const overallProgress = useMemo(
    () =>
      computeProfileReadiness({
        phone: profile?.phone,
        address: profile?.address,
        familyName: profile?.familyName,
        familyContact: profile?.familyContact,
        profilePicture: profile?.profilePicture || user?.profilePicture || null,
      }),
    [
      profile?.address,
      profile?.familyContact,
      profile?.familyName,
      profile?.phone,
      profile?.profilePicture,
      user?.profilePicture,
    ],
  );

  const handleSave = async () => {
    try {
      setError("");
      await updateMutation.mutateAsync({
        phone,
        address,
        familyName,
        familyContact,
      });
    } catch (rawError) {
      setError(toAppError(rawError).message);
    }
  };

  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      setError("");
      const asset = result.assets[0];
      await avatarMutation.mutateAsync({
        uri: asset.uri,
        name: asset.fileName || `avatar-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      await profileQuery.refetch();
    } catch (rawError) {
      setError(toAppError(rawError).message);
    }
  };

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={profileQuery.isRefetching || updateMutation.isPending || avatarMutation.isPending}
          onRefresh={() => {
            void profileQuery.refetch();
          }}
        />
      }
    >
      <GradientHeader
        colors={gradients.profile}
        title=""
        rightContent={
          <Pressable
            onPress={() => void profileQuery.refetch()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={colors.white} />
          </Pressable>
        }
      >
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <View style={{ position: "relative" }}>
            <Pressable
              onPress={() => void handleAvatarPick()}
              style={{
                width: 92,
                height: 92,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.2)",
                borderWidth: 4,
                borderColor: "rgba(255,255,255,0.3)",
                overflow: "hidden",
              }}
            >
              {profile?.profilePicture || user?.profilePicture ? (
                <Image
                  source={{ uri: `${assetBaseUrl}${profile?.profilePicture || user?.profilePicture}` }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Text style={{ fontSize: 52 }}>🎓</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => void handleAvatarPick()}
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 30,
                height: 30,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.white,
              }}
            >
              <MaterialCommunityIcons name="pencil" size={13} color={colors.purpleDeep} />
            </Pressable>
          </View>

          <Text style={{ marginTop: 14, fontSize: 24, fontWeight: "900", color: colors.white }}>{fullName}</Text>
          <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.82)" }}>
            {profile?.gradeLevel || user?.gradeLevel || "Assigned grade"} • {user?.email}
          </Text>
          <View
            style={{
              marginTop: 12,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: "rgba(255,255,255,0.18)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MaterialCommunityIcons name="account-check-outline" size={14} color="#FFD700" />
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
              {user?.status || "ACTIVE"} • Student
            </Text>
          </View>
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Card style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionTitle title="Overall Profile Readiness" />
            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.purple }}>{overallProgress}%</Text>
          </View>
          <ProgressBar value={overallProgress} color={colors.purpleDeep} trackColor="#EEF2F7" height={12} />
          <Text style={{ marginTop: 10, fontSize: 12, color: colors.textSecondary }}>
            Visual completion score is derived from currently available backend profile fields.
          </Text>
        </Card>

        <Card style={{ marginBottom: 18 }}>
          <SectionTitle title="Profile Details" />
          {profileQuery.error ? (
            <View style={{ marginBottom: 12, borderRadius: 16, backgroundColor: colors.paleRed, padding: 12 }}>
              <Text style={{ color: colors.red, fontWeight: "700" }}>{toAppError(profileQuery.error).message}</Text>
            </View>
          ) : null}
          <View style={{ gap: 12 }}>
            {[
              { label: "Phone", value: phone, setter: setPhone, placeholder: "0917..." },
              { label: "Address", value: address, setter: setAddress, placeholder: "Student address" },
              { label: "Guardian Name", value: familyName, setter: setFamilyName, placeholder: "Guardian name" },
              { label: "Guardian Contact", value: familyContact, setter: setFamilyContact, placeholder: "Guardian contact" },
            ].map((field) => (
              <View key={field.label}>
                <Text style={{ marginBottom: 6, fontSize: 12, fontWeight: "800", color: colors.text }}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                />
              </View>
            ))}
          </View>

          {!!error && (
            <View style={{ marginTop: 14, borderRadius: 16, backgroundColor: colors.paleRed, padding: 12 }}>
              <Text style={{ color: colors.red, fontWeight: "700" }}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={() => void handleSave()}
            style={{
              marginTop: 16,
              borderRadius: 18,
              backgroundColor: colors.text,
              alignItems: "center",
              paddingVertical: 14,
              opacity: updateMutation.isPending ? 0.7 : 1,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: "800" }}>{updateMutation.isPending ? "Saving..." : "Save Profile"}</Text>
          </Pressable>
        </Card>

        <View style={{ marginBottom: 18 }}>
          <SectionTitle title="Quick Actions" right={<Pill label="Live API" backgroundColor={colors.paleGreen} color={colors.green} />} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {[
              { icon: "account-box-outline", label: "Student Record", color: colors.blue },
              { icon: "security", label: "Session Safe", color: colors.green },
              { icon: "camera-outline", label: "Avatar Upload", color: colors.amber },
            ].map((item) => (
              <Card key={item.label} style={{ width: 120, alignItems: "center" }}>
                <MaterialCommunityIcons name={item.icon as never} size={22} color={item.color} />
                <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "800", color: colors.text, textAlign: "center" }}>
                  {item.label}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>

        <Pressable
          onPress={() => void logout()}
          style={{
            marginBottom: 8,
            borderRadius: 20,
            backgroundColor: colors.paleRed,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <MaterialCommunityIcons name="logout" size={18} color={colors.red} />
          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.red }}>Sign Out</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
