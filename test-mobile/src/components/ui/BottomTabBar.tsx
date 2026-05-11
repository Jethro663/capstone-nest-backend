import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MainTabParamList } from "../../navigation/types";
import { colors, gradients } from "../../theme/tokens";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type TabRouteItem = { name: string; key: string };

const studentTabOrder: Array<keyof MainTabParamList> = ["Dashboard", "Classes", "JA", "Assessments", "Profile"];
const teacherTabOrder: Array<keyof MainTabParamList> = [
  "Home",
  "Assessments",
  "Classes",
  "Sections",
  "Profile",
];

const routeConfig: Record<
  keyof MainTabParamList,
  { label: string; activeIcon: IconName; inactiveIcon: IconName }
> = {
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
    label: "Assessment",
    activeIcon: "clipboard-text",
    inactiveIcon: "clipboard-text-outline",
  },
  JA: {
    label: "JA",
    activeIcon: "robot-happy",
    inactiveIcon: "robot-happy-outline",
  },
  Announcements: {
    label: "Updates",
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

function orderRouteByName(routes: TabRouteItem[], routeOrder: Array<keyof MainTabParamList>) {
  return [...routes].sort((a, b) => {
    const leftIndex = routeOrder.indexOf(a.name as keyof MainTabParamList);
    const rightIndex = routeOrder.indexOf(b.name as keyof MainTabParamList);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
}

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteKey = state.routes[state.index]?.key;
  const isStudentTabSet = state.routes.some((route) => route.name === "JA");
  const isTeacherTabSet =
    !isStudentTabSet &&
    state.routes.some((route) => route.name === "Home") &&
    state.routes.some((route) => route.name === "Classes") &&
    state.routes.some((route) => route.name === "Sections") &&
    state.routes.some((route) => route.name === "Assessments") &&
    state.routes.some((route) => route.name === "Profile");

  const visibleRoutes = state.routes.filter((route) => {
    if (isStudentTabSet && route.name === "Announcements") {
      return false;
    }
    return Boolean(routeConfig[route.name as keyof MainTabParamList]);
  });

  const orderedRoutes = isStudentTabSet
    ? orderRouteByName(visibleRoutes as TabRouteItem[], studentTabOrder)
    : isTeacherTabSet
      ? orderRouteByName(visibleRoutes as TabRouteItem[], teacherTabOrder)
      : visibleRoutes;

  return (
    <View
      style={{
        pointerEvents: "box-none",
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 14),
      }}
    >
      <View
        style={{
          minHeight: 72,
          backgroundColor: "#0B1833",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 8,
          paddingTop: 8,
        }}
      >
        {orderedRoutes.map((route) => {
          const focused = activeRouteKey === route.key;
          const config = routeConfig[route.name as keyof MainTabParamList];
          const isStudentCenter = isStudentTabSet && route.name === "JA";
          const isTeacherCenter = isTeacherTabSet && route.name === "Classes";
          const isCenter = isStudentCenter || isTeacherCenter;

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
                    colors={
                      focused
                        ? isTeacherCenter
                          ? gradients.classes
                          : gradients.ja
                        : [darkRed(), "#C81E43"]
                    }
                    style={{
                      width: 72,
                      height: 72,
                      marginTop: -28,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 4,
                      borderColor: "#0B1833",
                    }}
                  >
                    <MaterialCommunityIcons name={config.activeIcon} size={30} color={colors.white} />
                  </LinearGradient>
                  <Text
                    style={{
                      marginTop: 4,
                      marginBottom: 10,
                      fontSize: 10,
                      fontWeight: focused ? "800" : "600",
                      color: focused ? darkRed() : "#8EA0BC",
                    }}
                  >
                    {isTeacherCenter ? "My Classes" : config.label}
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
              style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 14, gap: 3 }}
            >
              <MaterialCommunityIcons
                name={focused ? config.activeIcon : config.inactiveIcon}
                size={20}
                color={focused ? darkRed() : "#7890B3"}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: focused ? "800" : "600",
                  color: focused ? darkRed() : "#8EA0BC",
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

function darkRed() {
  return "#E8294E";
}



