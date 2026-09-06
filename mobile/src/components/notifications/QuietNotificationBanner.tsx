import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors, radii, shadow } from "../../theme/tokens";

type Props = {
  count: number;
  hasUnread: boolean;
  onDismiss: () => void;
  onView: () => void;
};

export function QuietNotificationBanner({ count, hasUnread, onDismiss, onView }: Props) {
  const safeCount = Math.max(1, Math.floor(count));
  const qualifier = hasUnread ? "unread" : "new";
  const summary = `You have ${safeCount} ${qualifier} notification${safeCount === 1 ? "" : "s"}`;

  return (
    <View
      style={[
        {
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          backgroundColor: colors.white,
          paddingLeft: 10,
          paddingRight: 4,
          paddingVertical: 6,
        },
        shadow.card,
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: colors.containerLow,
        }}
      >
        <MaterialCommunityIcons name="bell-outline" size={18} color={colors.textSecondary} />
      </View>

      <Text
        accessible
        accessibilityLabel={summary}
        accessibilityLiveRegion="polite"
        numberOfLines={2}
        style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: "700", lineHeight: 18 }}
      >
        {summary}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View notifications"
        onPress={onView}
        style={{
          minHeight: 44,
          justifyContent: "center",
          borderRadius: radii.md,
          paddingHorizontal: 8,
        }}
      >
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>View</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification summary"
        onPress={onDismiss}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
        }}
      >
        <MaterialCommunityIcons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}
