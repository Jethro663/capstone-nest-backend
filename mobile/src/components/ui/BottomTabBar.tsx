import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MainTabParamList } from "../../navigation/types";
import {
  colors,
  gradients,
  modernAcademic,
  skillStream,
} from "../../theme/tokens";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type TabRouteItem = { name: string; key: string };
export type BottomTabBarRole = "student" | "teacher" | "admin";
type Props = BottomTabBarProps & { role: BottomTabBarRole };

const studentTabOrder: Array<keyof MainTabParamList> = [
  "Dashboard",
  "Classes",
  "JA",
  "Assessments",
  "Profile",
];
const teacherTabOrder: Array<keyof MainTabParamList> = [
  "Home",
  "Assessments",
  "Classes",
  "Sections",
  "Profile",
];
const adminTabOrder: Array<keyof MainTabParamList> = [
  "Home",
  "Classes",
  "Assessments",
  "Academic",
  "Profile",
];

const roleTabOrder: Record<BottomTabBarRole, Array<keyof MainTabParamList>> = {
  student: studentTabOrder,
  teacher: teacherTabOrder,
  admin: adminTabOrder,
};

const routeConfig: Record<
  keyof MainTabParamList,
  { label: string; activeIcon: IconName; inactiveIcon: IconName }
> = {
  Academic: {
    label: "Academic",
    activeIcon: "school",
    inactiveIcon: "school-outline",
  },
  Home: {
    label: "Home",
    activeIcon: "view-dashboard",
    inactiveIcon: "view-dashboard-outline",
  },
  Dashboard: {
    label: "Home",
    activeIcon: "home-variant",
    inactiveIcon: "home-variant-outline",
  },
  Classes: {
    label: "Classes",
    activeIcon: "book-open-variant",
    inactiveIcon: "book-open-variant-outline",
  },
  Sections: {
    label: "Sections",
    activeIcon: "account-group",
    inactiveIcon: "account-group-outline",
  },
  Assessments: {
    label: "Assessments",
    activeIcon: "clipboard-text",
    inactiveIcon: "clipboard-text-outline",
  },
  JA: {
    label: "JA",
    activeIcon: "robot-happy",
    inactiveIcon: "robot-happy-outline",
  },
  Announcements: {
    label: "Announcements",
    activeIcon: "bullhorn",
    inactiveIcon: "bullhorn-outline",
  },
  Profile: {
    label: "Profile",
    activeIcon: "account-circle",
    inactiveIcon: "account-circle-outline",
  },
  More: {
    label: "More",
    activeIcon: "view-grid-plus",
    inactiveIcon: "view-grid-plus-outline",
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
  Lessons: {
    label: "Lessons",
    activeIcon: "book-open-variant",
    inactiveIcon: "book-open-variant-outline",
  },
};

function orderRouteByName(
  routes: TabRouteItem[],
  routeOrder: Array<keyof MainTabParamList>,
) {
  return [...routes].sort((a, b) => {
    const leftIndex = routeOrder.indexOf(a.name as keyof MainTabParamList);
    const rightIndex = routeOrder.indexOf(b.name as keyof MainTabParamList);
    return (
      (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
    );
  });
}

export function BottomTabBar({
  role,
  state,
  descriptors,
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();
  const activeRouteKey = state.routes[state.index]?.key;
  const tabOrder = roleTabOrder[role];

  const visibleRoutes = state.routes.filter((route) => {
    const routeName = route.name as keyof MainTabParamList;
    return Boolean(routeConfig[routeName] && tabOrder.includes(routeName));
  });

  const orderedRoutes = orderRouteByName(visibleRoutes as TabRouteItem[], tabOrder);

  return (
    <View
      style={{
        pointerEvents: "box-none",
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: skillStream.elevated,
      }}
    >
      <View
        style={{
          minHeight: 76,
          backgroundColor: skillStream.elevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 10,
          paddingTop: 8,
        }}
      >
        {orderedRoutes.map((route) => {
          const focused = activeRouteKey === route.key;
          const config = routeConfig[route.name as keyof MainTabParamList];
          const isStudentCenter = role === "student" && route.name === "JA";

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

          if (isStudentCenter) {
            return (
              <View key={route.key} style={{ flex: 1, alignItems: "center" }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel || config.label}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={{ alignItems: "center", width: "100%", minHeight: 56 }}
                >
                  <LinearGradient
                    colors={
                      focused
                        ? gradients.ja
                        : [
                            modernAcademic.primary,
                            modernAcademic.primaryContainer,
                          ]
                    }
                    style={{
                      width: 72,
                      height: 72,
                      marginTop: -28,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 4,
                      borderColor: skillStream.background,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={config.activeIcon}
                      size={30}
                      color={colors.white}
                    />
                  </LinearGradient>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                    style={{
                      marginTop: 4,
                      marginBottom: 10,
                      fontSize: 10,
                      fontWeight: focused ? "800" : "600",
                      color: focused ? colors.primary : colors.textSecondary,
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
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel || config.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                flex: 1,
                minHeight: 56,
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: 14,
                gap: 3,
              }}
            >
              <MaterialCommunityIcons
                name={focused ? config.activeIcon : config.inactiveIcon}
                size={20}
                color={focused ? colors.primary : colors.textSecondary}
              />
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={{
                  fontSize: 9,
                  fontWeight: focused ? "800" : "600",
                  color: focused ? colors.primary : colors.textSecondary,
                }}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
