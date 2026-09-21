import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileBrand } from "../../theme/mobileBrand";
import { MobileAction } from "./MobileAction";

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
          <MobileAction
            label={navigationLabel}
            accessibilityLabel={navigationLabel}
            icon={navigationIcon}
            variant="inverse"
            onPress={onNavigationPress}
          />
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
          <MobileAction
            label={`Refresh ${title}`}
            accessibilityLabel={`Refresh ${title}`}
            icon={refreshing ? "refresh-circle" : "refresh"}
            variant="inverse"
            disabled={refreshing}
            loading={refreshing}
            onPress={onRefresh}
          />
        ) : null}
      </View>
    </View>
  );
}
