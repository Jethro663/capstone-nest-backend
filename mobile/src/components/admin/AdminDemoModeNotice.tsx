import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAdminDemoMode } from "../../hooks/useAdminDemoMode";
import { adminTheme as theme } from "../../theme/admin";

function formatTimeRemaining(expiresAt: string | null) {
  if (!expiresAt) return "expiry unavailable";
  const remainingSeconds = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - Date.now()) / 1_000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} remaining`;
}

export function AdminDemoModeNotice() {
  const navigation = useNavigation();
  const { status, isCachedOffline } = useAdminDemoMode();
  if (!status?.active) return null;

  const manage = () => {
    const target = navigation.getParent() ?? navigation;
    (target.navigate as (name: string) => void)("AdminSettingsDemoMode");
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        marginHorizontal: 16,
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderLeftWidth: 3,
        borderLeftColor: theme.red,
        backgroundColor: theme.redSoft,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
      }}
    >
      <MaterialCommunityIcons
        name="shield-alert-outline"
        size={18}
        color={theme.red}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: theme.text }}>
          Demo mode active
        </Text>
        <Text
          style={{ marginTop: 2, fontSize: 11, lineHeight: 16, color: theme.subtext }}
        >
          {formatTimeRemaining(status.expiresAt)}
          {isCachedOffline ? " · cached while offline" : " · actions are audited"}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Manage Demo mode"
        onPress={manage}
        style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 8 }}
      >
        <Text style={{ color: theme.red, fontSize: 11, fontWeight: "900" }}>
          Manage
        </Text>
      </Pressable>
    </View>
  );
}
