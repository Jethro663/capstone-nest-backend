import { mobileBrand } from "../../theme/mobileBrand";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export function OfflineWorkspaceNotice({
  lastSyncedAt,
}: {
  lastSyncedAt: string;
}) {
  const parsed = new Date(lastSyncedAt);
  const lastSync = Number.isNaN(parsed.getTime())
    ? "an earlier session"
    : parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  return (
    <View
      accessibilityRole="alert"
      style={{
        minHeight: 62,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: mobileBrand.dangerBorder,
        backgroundColor: mobileBrand.redSoft,
        paddingHorizontal: 13,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <MaterialCommunityIcons
        name="cloud-off-outline"
        size={20}
        color={mobileBrand.danger}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: mobileBrand.redPressed, fontSize: 12, fontWeight: "900" }}>
          Offline snapshot
        </Text>
        <Text
          style={{
            marginTop: 3,
            color: mobileBrand.muted,
            fontSize: 11,
            lineHeight: 16,
          }}
        >
          Last synced {lastSync}. Reconnect to open classes or make changes.
        </Text>
      </View>
    </View>
  );
}
