import { Pressable, Text, View } from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/tokens";

type RoleWorkspaceScreenProps = {
  role: "teacher" | "admin";
  section: "overview" | "classes" | "assessments" | "announcements" | "profile";
};

function roleLabel(role: "teacher" | "admin") {
  return role === "admin" ? "Admin" : "Teacher";
}

function sectionMessage(section: RoleWorkspaceScreenProps["section"]) {
  switch (section) {
    case "overview":
      return "Mobile role support is now enabled. This section is the launch point for role-specific workflows.";
    case "classes":
      return "Class and section operations will be available here for quick mobile review and updates.";
    case "assessments":
      return "Assessment lifecycle actions will be surfaced here for role-based mobile execution.";
    case "announcements":
      return "School and class announcement management will be exposed here.";
    case "profile":
      return "Role profile and account controls are available on this mobile surface.";
    default:
      return "Role workspace section";
  }
}

export function RoleWorkspaceScreen({ role, section }: RoleWorkspaceScreenProps) {
  const { logout, user } = useAuth();
  const label = roleLabel(role);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        paddingHorizontal: 24,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          borderRadius: 26,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.white,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900", color: colors.indigo }}>
          {label} mobile workspace
        </Text>
        <Text style={{ marginTop: 10, fontSize: 22, fontWeight: "900", color: colors.text }}>
          {label} {section.charAt(0).toUpperCase() + section.slice(1)}
        </Text>
        <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
          Signed in as {user?.email ?? `${role}@lms.local`}.
          {"\n"}
          {sectionMessage(section)}
        </Text>
        <Pressable
          onPress={() => void logout()}
          style={{
            marginTop: 18,
            borderRadius: 16,
            backgroundColor: colors.text,
            alignItems: "center",
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.white }}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}
