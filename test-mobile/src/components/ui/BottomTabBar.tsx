import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MainTabParamList } from "../../navigation/types";
import { colors, gradients, shadow } from "../../theme/tokens";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const routeConfig: Record<
  keyof MainTabParamList,
  { label: string; activeIcon: IconName; inactiveIcon: IconName }
> = {
  Lessons: {
    label: "Lessons",
    activeIcon: "book-open-variant",
    inactiveIcon: "book-open-variant-outline",
  },
  Assessments: {
    label: "Assessments",
    activeIcon: "clipboard-text",
    inactiveIcon: "clipboard-text-outline",
  },
  LXP: {
    label: "LXP",
    activeIcon: "rocket-launch",
    inactiveIcon: "rocket-launch-outline",
  },
  Progress: {
    label: "Progress",
    activeIcon: "chart-box",
    inactiveIcon: "chart-box-outline",
  },
  Profile: {
    label: "Profile",
    activeIcon: "account-circle",
    inactiveIcon: "account-circle-outline",
  },
};

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        style={[
          {
            minHeight: 74,
            borderRadius: 28,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: "#F3F4F6",
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 6,
            paddingTop: 10,
          },
          shadow.card,
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = routeConfig[route.name as keyof MainTabParamList];
          const isCenter = route.name === "LXP";
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          if (isCenter) {
            return (
              <View key={route.key} style={{ flex: 1, alignItems: "center" }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={{ alignItems: "center", width: "100%" }}
                >
                  <LinearGradient
                    colors={focused ? gradients.lxp : gradients.lessons}
                    style={{
                      width: 62,
                      height: 62,
                      marginTop: -24,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name={config.activeIcon} size={26} color={colors.white} />
                  </LinearGradient>
                  <Text
                    style={{
                      marginTop: 6,
                      marginBottom: 10,
                      fontSize: 10,
                      fontWeight: focused ? "800" : "600",
                      color: focused ? colors.orange : colors.muted,
                    }}
                  >
                    {config.label}
                  </Text>
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 10 }}
            >
              <MaterialCommunityIcons
                name={focused ? config.activeIcon : config.inactiveIcon}
                size={22}
                color={focused ? colors.amber : colors.muted}
              />
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: focused ? "800" : "600",
                  color: focused ? colors.amber : colors.muted,
                }}
              >
                {config.label}
              </Text>
              <View
                style={{
                  marginTop: 6,
                  width: 30,
                  height: 3,
                  borderTopLeftRadius: 999,
                  borderTopRightRadius: 999,
                  backgroundColor: focused ? colors.amber : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
