import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileBrand, mobileRadii } from "../../theme/mobileBrand";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export function MobileAppBar({
  title,
  navigationLabel = "Open navigation menu",
  navigationIcon = "menu",
  onNavigationPress,
  navigationAction,
  rightAction,
  onRefresh,
  refreshing = false,
  testID = "mobile-app-bar",
}: {
  title: string;
  navigationLabel?: string;
  navigationIcon?: IconName;
  onNavigationPress?: () => void;
  navigationAction?: ReactNode;
  rightAction?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: mobileBrand.navy,
          borderBottomWidth: 1,
          borderBottomColor: mobileBrand.navyRaised,
          paddingHorizontal: 16,
          paddingTop: insets.top + 6,
          paddingBottom: 8,
        },
      ]}
    >
      <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 }}>
        {navigationAction ?? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={navigationLabel}
            onPress={onNavigationPress}
            style={{
              width: mobileBrand.minTarget,
              height: mobileBrand.minTarget,
              minHeight: mobileBrand.minTarget,
              borderRadius: mobileRadii.control,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          >
            <MaterialCommunityIcons name={navigationIcon} size={21} color={mobileBrand.white} />
          </Pressable>
        )}
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.35}
          style={{ flex: 1, fontSize: 20, fontWeight: "900", color: mobileBrand.white }}
        >
          {title}
        </Text>
        {rightAction}
        {onRefresh ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Refresh ${title}`}
            accessibilityState={{ disabled: refreshing }}
            disabled={refreshing}
            onPress={onRefresh}
            style={{
              width: mobileBrand.minTarget,
              height: mobileBrand.minTarget,
              minHeight: mobileBrand.minTarget,
              opacity: refreshing ? 0.5 : 1,
              borderRadius: mobileRadii.control,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          >
            <MaterialCommunityIcons name={refreshing ? "refresh-circle" : "refresh"} size={21} color={mobileBrand.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
