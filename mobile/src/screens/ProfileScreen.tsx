import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { useProfile, useProfileAvatarMutation, useProfileUpdateMutation } from "../api/hooks";
import { API_BASE_URL } from "../api/config";
import { peekAppError, toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { buildProfileFullName } from "./screen-flow";
import { normalizePhilippinePhone } from "../utils/studentIdentity";
import { studentDarkTheme } from "../theme/studentDark";

type Props = BottomTabScreenProps<MainTabParamList, "Profile">;

type ProfileStatusItem = {
  label: string;
  value?: string | null;
};

const assetBaseUrl = API_BASE_URL.replace(/\/api$/, "");

const theme = studentDarkTheme;

function hasValue(value?: string | null) {
  return typeof value === "string" ? value.trim().length > 0 : false;
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function resolveAvatarInitials(fullName: string) {
  const initials = fullName
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "ST";
}

function resolveProfileImageUri(path?: string | null) {
  if (!path) {
    return undefined;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${assetBaseUrl}${path}`;
}

function formatIdentityValue(value?: string | null, fallback = "--") {
  return hasValue(value) ? value!.trim() : fallback;
}

function SectionHeader({
  title,
  badge,
}: {
  title: string;
  badge?: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 8,
        paddingHorizontal: 16,
        paddingTop: 16,
      }}
    >
      <Text
        style={{
          color: theme.muted,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      {badge ? (
        <View
          style={{
            backgroundColor: theme.redSoft,
            borderRadius: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: theme.red, fontSize: 10, fontWeight: "600" }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", marginBottom: 5 }}>
      {required ? (
        <View
          style={{
            backgroundColor: theme.red,
            borderRadius: 999,
            height: 5,
            marginRight: 5,
            width: 5,
          }}
        />
      ) : null}
      <Text
        style={{
          color: theme.muted,
          fontSize: 9,
          fontWeight: "600",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ReadOnlyField({
  label,
  value,
  required = false,
  compact = false,
}: {
  label: string;
  value?: string | null;
  required?: boolean;
  compact?: boolean;
}) {
  const filled = hasValue(value);

  return (
    <View style={{ flex: 1 }}>
      <FieldLabel label={label} required={required} />
      <Text
        numberOfLines={compact ? 1 : undefined}
        style={{
          color: filled ? theme.text : theme.dim,
          fontSize: compact ? 11 : 13,
          fontStyle: filled ? "normal" : "italic",
          minHeight: 18,
        }}
      >
        {formatIdentityValue(value)}
      </Text>
    </View>
  );
}

function EditableField({
  label,
  required = false,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "sentences",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <FieldLabel label={label} required={required} />
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.dim}
        selectionColor={theme.red}
        style={{
          color: theme.text,
          fontSize: 13,
          minHeight: 18,
          paddingVertical: 0,
        }}
        value={value}
      />
    </View>
  );
}

function FormRow({
  children,
  twoColumn = false,
}: {
  children: ReactNode;
  twoColumn?: boolean;
}) {
  return (
    <View
      style={{
        borderBottomColor: theme.border,
        borderBottomWidth: 1,
        flexDirection: twoColumn ? "row" : "column",
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      {children}
    </View>
  );
}

function QuickLink({
  icon,
  iconColor,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderRadius: 10,
        borderWidth: 1,
        flex: 1,
        flexDirection: "row",
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 11,
      }}
    >
      <MaterialCommunityIcons color={iconColor} name={icon} size={15} />
      <Text
        numberOfLines={2}
        style={{
          color: theme.text,
          flex: 1,
          fontSize: 12,
          fontWeight: "700",
          marginLeft: 8,
        }}
      >
        {label}
      </Text>
      <MaterialCommunityIcons color={theme.dim} name="chevron-right" size={16} />
    </Pressable>
  );
}

export function ProfileScreen(props: Props) {
  const { user, logout } = useAuth();
  const profileQuery = useProfile();
  const profile = profileQuery.data;
  const updateMutation = useProfileUpdateMutation(user?.userId || user?.id);
  const avatarMutation = useProfileAvatarMutation();
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [familyName, setFamilyName] = useState(profile?.familyName || "");
  const [familyRelationship, setFamilyRelationship] = useState(profile?.familyRelationship || "");
  const [familyContact, setFamilyContact] = useState(profile?.familyContact || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || profile?.dob || user?.dateOfBirth || user?.dob || "");
  const [gender, setGender] = useState(profile?.gender || user?.gender || "");
  const [error, setError] = useState("");

  const currentFirstName = user?.firstName || "";
  const currentMiddleName = user?.middleName || "";
  const currentLastName = user?.lastName || "";
  const currentEmail = user?.email || "";
  const currentLrn = profile?.lrn || user?.lrn || "";
  const currentGradeLevel = profile?.gradeLevel || user?.gradeLevel || "";
  const currentStatus = user?.status || "ACTIVE";
  const fullName = useMemo(
    () =>
      buildProfileFullName({
        firstName: currentFirstName,
        lastName: currentLastName,
        email: currentEmail,
      }),
    [currentEmail, currentFirstName, currentLastName],
  );
  const avatarUri = resolveProfileImageUri(profile?.profilePicture || user?.profilePicture);
  const avatarInitials = resolveAvatarInitials(fullName);

  useEffect(() => {
    setPhone(profile?.phone || "");
    setAddress(profile?.address || "");
    setFamilyName(profile?.familyName || "");
    setFamilyRelationship(profile?.familyRelationship || "");
    setFamilyContact(profile?.familyContact || "");
    setDateOfBirth(profile?.dateOfBirth || profile?.dob || user?.dateOfBirth || user?.dob || "");
    setGender(profile?.gender || user?.gender || "");
  }, [
    profile?.address,
    profile?.dateOfBirth,
    profile?.dob,
    profile?.familyContact,
    profile?.familyName,
    profile?.familyRelationship,
    profile?.gender,
    profile?.phone,
    user?.dateOfBirth,
    user?.dob,
    user?.gender,
  ]);

  const statusItems = useMemo<ProfileStatusItem[]>(
    () => [
      { label: "First Name", value: currentFirstName },
      { label: "Last Name", value: currentLastName },
      { label: "Grade Level", value: currentGradeLevel },
      { label: "Date of Birth", value: dateOfBirth },
      { label: "Gender", value: gender },
      { label: "Contact Number", value: phone },
      { label: "Home Address", value: address },
      { label: "Guardian Name", value: familyName },
      { label: "Relationship", value: familyRelationship },
      { label: "Guardian Contact", value: familyContact },
    ],
    [
      address,
      currentFirstName,
      currentGradeLevel,
      currentLastName,
      dateOfBirth,
      familyContact,
      familyName,
      familyRelationship,
      gender,
      phone,
    ],
  );

  const requiredCount = statusItems.filter((item) => !hasValue(item.value)).length;
  const refreshBusy = profileQuery.isRefetching || updateMutation.isPending || avatarMutation.isPending;
  const completionHeadline =
    requiredCount === 0
      ? "All required fields are complete."
      : `${requiredCount} required ${pluralize(requiredCount, "field still needs", "fields still need")} attention.`;
  const completionSubcopy =
    requiredCount === 0
      ? "Your student record is complete and ready for review."
      : "Complete and review all required details before saving. This will keep your profile aligned with school records.";

  const handleSave = async () => {
    try {
      setError("");

      const normPhone = phone ? normalizePhilippinePhone(phone) : phone;
      const normFamilyContact = familyContact ? normalizePhilippinePhone(familyContact) : familyContact;

      if (phone && !normPhone) {
        setError("Use 09XXXXXXXXX or +639XXXXXXXXX.");
        return;
      }
      if (familyContact && !normFamilyContact) {
        setError("Use 09XXXXXXXXX or +639XXXXXXXXX.");
        return;
      }

      const payload = {
        phone: normPhone,
        address,
        familyName,
        familyRelationship,
        familyContact: normFamilyContact,
        ...(hasValue(dateOfBirth) ? { dateOfBirth, dob: dateOfBirth } : {}),
        ...(hasValue(gender) ? { gender } : {}),
      };
      await updateMutation.mutateAsync(payload);
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
      backgroundColor={theme.pageBg}
      refreshControl={<Refreshable onRefresh={() => void profileQuery.refetch()} refreshing={refreshBusy} />}
    >
      <View style={{ backgroundColor: theme.pageBg, paddingBottom: 132 }}>
        <View
          style={{
            backgroundColor: theme.topbar,
            borderBottomColor: theme.border,
            borderBottomWidth: 1,
            paddingBottom: 16,
            paddingHorizontal: 20,
            paddingTop: 30,
          }}
        >
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ alignItems: "center", flexDirection: "row" }}>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: theme.red,
                  borderRadius: 8,
                  height: 28,
                  justifyContent: "center",
                  width: 28,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>N</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginLeft: 9 }}>My Profile</Text>
            </View>

            <View style={{ alignItems: "center", flexDirection: "row" }}>
              <Pressable
                onPress={() => props.navigation.navigate("Announcements")}
                style={{
                  alignItems: "center",
                  backgroundColor: theme.active,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 999,
                  height: 44,
                  justifyContent: "center",
                  width: 44,
                }}
              >
                <MaterialCommunityIcons color={theme.text} name="bell-outline" size={18} />
              </Pressable>
              <Pressable
                onPress={() => void profileQuery.refetch()}
                style={{
                  alignItems: "center",
                  backgroundColor: theme.active,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 999,
                  height: 44,
                  justifyContent: "center",
                  marginLeft: 9,
                  width: 44,
                }}
              >
                <MaterialCommunityIcons color={theme.text} name="cog-outline" size={18} />
              </Pressable>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.bg,
            borderBottomColor: theme.border,
            borderBottomWidth: 1,
            overflow: "hidden",
            paddingBottom: 22,
            paddingHorizontal: 20,
            paddingTop: 28,
            position: "relative",
          }}
        >
          <View
            style={{
              backgroundColor: theme.blueSoft,
              borderRadius: 999,
              height: 130,
              position: "absolute",
              right: -20,
              top: -20,
              width: 130,
            }}
          />
          <View style={{ alignItems: "flex-start", flexDirection: "row" }}>
            <View style={{ marginRight: 20, paddingBottom: 10, position: "relative" }}>
              <Pressable
                onPress={() => void handleAvatarPick()}
                style={{
                  alignItems: "center",
                  backgroundColor: theme.red,
                  borderColor: theme.border,
                  borderRadius: 999,
                  borderWidth: 2,
                  height: 72,
                  justifyContent: "center",
                  overflow: "hidden",
                  width: 72,
                }}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ height: "100%", width: "100%" }} />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "700" }}>{avatarInitials}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => void handleAvatarPick()}
                style={{
                  alignItems: "center",
                  backgroundColor: theme.active,
                  borderColor: theme.border,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  bottom: -4,
                  height: 44,
                  justifyContent: "center",
                  position: "absolute",
                  right: -8,
                  width: 44,
                }}
              >
                <MaterialCommunityIcons color={theme.text} name="pencil-outline" size={16} />
              </Pressable>
            </View>

            <View style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 3 }}>{fullName}</Text>
              <Text style={{ color: theme.muted, fontSize: 11, marginBottom: 8 }}>
                Student - {currentGradeLevel || "Assigned grade"} - {currentEmail}
              </Text>
              <View
                style={{
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: theme.greenSoft,
                  borderColor: theme.greenLine,
                  borderRadius: 20,
                  borderWidth: 1,
                  flexDirection: "row",
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.green,
                    borderRadius: 999,
                    height: 5,
                    marginRight: 5,
                    width: 5,
                  }}
                />
                <Text style={{ color: theme.green, fontSize: 10, fontWeight: "600", letterSpacing: 0.3 }}>
                  {currentStatus} - Student
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => void handleAvatarPick()}
              style={{
                alignItems: "center",
                backgroundColor: theme.active,
                borderColor: theme.border,
                borderRadius: 8,
                borderWidth: 1,
                flexDirection: "row",
                minHeight: 44,
                paddingHorizontal: 13,
                paddingVertical: 9,
              }}
            >
              <MaterialCommunityIcons color={theme.text} name="image-outline" size={14} />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 11,
                  fontWeight: "700",
                  marginLeft: 5,
                }}
              >
                Profile Photo
              </Text>
            </Pressable>
          </View>
        </View>

        {profileQuery.error ? (
          <View
            style={{
              alignItems: "flex-start",
              backgroundColor: theme.redSoft,
              borderColor: theme.redLine,
              borderRadius: 10,
              borderWidth: 1,
              flexDirection: "row",
              marginHorizontal: 16,
              marginTop: 12,
              paddingHorizontal: 13,
              paddingVertical: 10,
            }}
          >
            <MaterialCommunityIcons color={theme.red} name="alert-circle-outline" size={15} style={{ marginRight: 9, marginTop: 1 }} />
            <Text style={{ color: theme.redText, flex: 1, fontSize: 11, lineHeight: 16 }}>
              {peekAppError(profileQuery.error).message}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            alignItems: "flex-start",
            backgroundColor: requiredCount === 0 ? theme.greenSoft : theme.redSoft,
            borderColor: requiredCount === 0 ? theme.greenLine : theme.redLine,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: "row",
            marginHorizontal: 16,
            marginTop: 12,
            paddingHorizontal: 13,
            paddingVertical: 10,
          }}
        >
          <MaterialCommunityIcons
            color={requiredCount === 0 ? theme.green : theme.red}
            name={requiredCount === 0 ? "check-circle-outline" : "alert-circle-outline"}
            size={15}
            style={{ marginRight: 9, marginTop: 1 }}
          />
          <Text style={{ color: requiredCount === 0 ? theme.green : theme.redText, flex: 1, fontSize: 11, lineHeight: 16 }}>
            <Text style={{ fontWeight: "600" }}>{completionHeadline} </Text>
            {completionSubcopy}
          </Text>
        </View>

        {error ? (
          <View
            style={{
              alignItems: "flex-start",
              backgroundColor: theme.redSoft,
              borderColor: theme.redLine,
              borderRadius: 10,
              borderWidth: 1,
              flexDirection: "row",
              marginHorizontal: 16,
              marginTop: 12,
              paddingHorizontal: 13,
              paddingVertical: 10,
            }}
          >
            <MaterialCommunityIcons color={theme.red} name="close-circle-outline" size={15} style={{ marginRight: 9, marginTop: 1 }} />
            <Text style={{ color: theme.redText, flex: 1, fontSize: 11, lineHeight: 16 }}>{error}</Text>
          </View>
        ) : null}

        <SectionHeader badge={requiredCount === 0 ? "Complete" : `${requiredCount} required`} title="Student Identity" />

        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderRadius: 14,
            borderWidth: 1,
            marginHorizontal: 16,
            overflow: "hidden",
          }}
        >
          <FormRow twoColumn>
            <View style={{ borderRightColor: theme.border, borderRightWidth: 1, flex: 1, paddingRight: 12 }}>
              <ReadOnlyField label="First Name" required value={currentFirstName} />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <ReadOnlyField label="Middle Name" value={currentMiddleName} />
            </View>
          </FormRow>

          <FormRow twoColumn>
            <View style={{ borderRightColor: theme.border, borderRightWidth: 1, flex: 1, paddingRight: 12 }}>
              <ReadOnlyField label="Last Name" required value={currentLastName} />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <ReadOnlyField compact label="Email" value={currentEmail} />
            </View>
          </FormRow>

          <FormRow twoColumn>
            <View style={{ borderRightColor: theme.border, borderRightWidth: 1, flex: 1, paddingRight: 12 }}>
              <ReadOnlyField compact label="LRN" value={currentLrn} />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <ReadOnlyField label="Grade Level" required value={currentGradeLevel} />
            </View>
          </FormRow>

          <FormRow twoColumn>
            <View style={{ borderRightColor: theme.border, borderRightWidth: 1, flex: 1, paddingRight: 12 }}>
              <EditableField
                label="Date of Birth"
                onChangeText={setDateOfBirth}
                placeholder="mm/dd/yyyy"
                required
                value={dateOfBirth}
              />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <EditableField
                autoCapitalize="words"
                label="Gender"
                onChangeText={setGender}
                placeholder="Select"
                required
                value={gender}
              />
            </View>
          </FormRow>

          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View style={{ borderRightColor: theme.border, borderRightWidth: 1, flex: 1, paddingRight: 12 }}>
              <EditableField
                keyboardType="phone-pad"
                label="Contact Number"
                onChangeText={setPhone}
                placeholder="0917..."
                maxLength={13}
                required
                value={phone}
              />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <EditableField
                autoCapitalize="words"
                label="Home Address"
                onChangeText={setAddress}
                placeholder="Address..."
                required
                value={address}
              />
            </View>
          </View>
        </View>

        <SectionHeader title="Emergency Contact" />

        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderRadius: 14,
            borderWidth: 1,
            marginHorizontal: 16,
            overflow: "hidden",
          }}
        >
          <FormRow>
            <EditableField
              autoCapitalize="words"
              label="Guardian Name"
              onChangeText={setFamilyName}
              placeholder="Full name"
              required
              value={familyName}
            />
          </FormRow>

          <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12 }}>
            <View style={{ borderRightColor: theme.border, borderRightWidth: 1, flex: 1, paddingRight: 12 }}>
              <EditableField
                autoCapitalize="words"
                label="Relationship"
                onChangeText={setFamilyRelationship}
                placeholder="Select"
                required
                value={familyRelationship}
              />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <EditableField
                keyboardType="phone-pad"
                label="Guardian Contact"
                onChangeText={setFamilyContact}
                placeholder="0917..."
                maxLength={13}
                required
                value={familyContact}
              />
            </View>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Pressable
            onPress={() => void handleSave()}
            style={{
              alignItems: "center",
              backgroundColor: theme.red,
              borderRadius: 10,
              justifyContent: "center",
              opacity: updateMutation.isPending ? 0.7 : 1,
              paddingVertical: 12,
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row" }}>
              <MaterialCommunityIcons color="#FFFFFF" name="content-save-outline" size={14} />
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginLeft: 7 }}>
                {updateMutation.isPending ? "Saving Profile Changes..." : "Save Profile Changes"}
              </Text>
            </View>
          </Pressable>
        </View>

        <SectionHeader title="Profile Status" />

        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderRadius: 14,
            borderWidth: 1,
            marginHorizontal: 16,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              alignItems: "center",
              borderBottomColor: theme.border,
              borderBottomWidth: 1,
              flexDirection: "row",
              paddingBottom: 10,
              paddingHorizontal: 14,
              paddingTop: 12,
            }}
          >
            <MaterialCommunityIcons color={requiredCount === 0 ? theme.green : theme.amber} name="alert-circle-outline" size={14} />
            <Text style={{ color: theme.text, flex: 1, fontSize: 12, fontWeight: "600", marginLeft: 8 }}>{completionHeadline}</Text>
            <View
              style={{
                backgroundColor: requiredCount === 0 ? theme.greenSoft : theme.amberSoft,
                borderRadius: 5,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: requiredCount === 0 ? theme.green : theme.amber, fontSize: 10, fontWeight: "600" }}>
                {requiredCount === 0 ? "0 left" : `${requiredCount} left`}
              </Text>
            </View>
          </View>

          {statusItems.map((item, index) => {
            const complete = hasValue(item.value);
            return (
              <View
                key={item.label}
                style={{
                  alignItems: "center",
                  borderBottomColor: index === statusItems.length - 1 ? "transparent" : theme.border,
                  borderBottomWidth: index === statusItems.length - 1 ? 0 : 1,
                  flexDirection: "row",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: complete ? theme.greenSoft : theme.redSoft,
                    borderColor: complete ? theme.green : theme.red,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    height: 18,
                    justifyContent: "center",
                    width: 18,
                  }}
                >
                  <MaterialCommunityIcons color={complete ? theme.green : theme.red} name={complete ? "check" : "close"} size={11} />
                </View>
                <Text
                  style={{
                    color: complete ? theme.text : theme.redText,
                    flex: 1,
                    fontSize: 12,
                    fontWeight: "600",
                    marginLeft: 10,
                  }}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12 }}>
          <QuickLink
            icon="file-document-outline"
            iconColor={theme.blue}
            label="View Transcript"
            onPress={() => props.navigation.navigate("Transcript" as never)}
          />
          <View style={{ width: 9 }} />
          <QuickLink
            icon="clipboard-check-outline"
            iconColor={theme.purple}
            label="Evaluations"
            onPress={() => props.navigation.navigate("StudentEvaluations" as never)}
          />
        </View>

        <SectionHeader title="Security" />

        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderRadius: 14,
            borderWidth: 1,
            marginHorizontal: 16,
            overflow: "hidden",
          }}
        >
          {[
            {
              label: "Current Password",
              value: "********",
            },
            {
              label: "New Password",
              value: "Enter new password",
            },
            {
              label: "Confirm New Password",
              value: "Repeat new password",
            },
          ].map((row, index) => (
            <View
              key={row.label}
              style={{
                borderBottomColor: index === 2 ? "transparent" : theme.border,
                borderBottomWidth: index === 2 ? 0 : 1,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  color: theme.muted,
                  fontSize: 9,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                  marginBottom: 7,
                  textTransform: "uppercase",
                }}
              >
                {row.label}
              </Text>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: theme.active,
                  borderColor: theme.border,
                  borderRadius: 8,
                  borderWidth: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontSize: row.label === "Current Password" ? 10 : 12,
                    letterSpacing: row.label === "Current Password" ? 3 : 0,
                  }}
                >
                  {row.value}
                </Text>
                <MaterialCommunityIcons color={theme.text} name="eye-outline" size={13} />
              </View>

              {row.label === "New Password" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                  {["8+ chars", "Uppercase", "Lowercase", "Number", "Special"].map((rule, ruleIndex) => (
                    <View
                      key={rule}
                      style={{
                        alignItems: "center",
                        backgroundColor: theme.active,
                        borderColor: theme.border,
                        borderRadius: 4,
                        borderWidth: 1,
                        flexDirection: "row",
                        marginBottom: 6,
                        marginRight: ruleIndex === 4 ? 0 : 8,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ color: theme.muted, fontSize: 8, marginRight: 4 }}>o</Text>
                      <Text style={{ color: theme.muted, fontSize: 9 }}>{rule}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <View
            style={{
              alignItems: "center",
              borderColor: theme.blueLine,
              borderRadius: 10,
              borderWidth: 1,
              justifyContent: "center",
              opacity: 0.6,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: theme.blue, fontSize: 13, fontWeight: "500" }}>Update Password</Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: "center" }}>
            Password changes are not available in the mobile app yet.
          </Text>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Pressable
            onPress={() => void logout()}
            style={{
              alignItems: "center",
              backgroundColor: theme.redSoft,
              borderColor: theme.redLine,
              borderRadius: 10,
              borderWidth: 1,
              flexDirection: "row",
              justifyContent: "center",
              paddingVertical: 12,
            }}
          >
            <MaterialCommunityIcons color={theme.red} name="logout" size={16} />
            <Text style={{ color: theme.red, fontSize: 13, fontWeight: "600", marginLeft: 8 }}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </ScreenScroll>
  );
}
