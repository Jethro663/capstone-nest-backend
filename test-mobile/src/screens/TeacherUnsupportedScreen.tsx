import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/tokens";

export function TeacherUnsupportedScreen() {
  const { logout, user } = useAuth();

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
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.paleAmber,
          }}
        >
          <MaterialCommunityIcons name="school" size={26} color={colors.amber} />
        </View>
        <Text style={{ marginTop: 14, fontSize: 22, fontWeight: "900", color: colors.text }}>
          Teacher mobile is coming soon
        </Text>
        <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
          Signed in as {user?.email ?? "teacher"}.
          {"\n"}
          The current test-mobile build is student-focused while we finish the teacher workspace.
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
