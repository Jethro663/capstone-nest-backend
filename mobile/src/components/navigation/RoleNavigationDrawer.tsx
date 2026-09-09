import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { teacherTheme as theme } from "../../theme/teacher";
import {
  ROLE_DRAWER_GROUPS,
  ROLE_DRAWER_PROFILE_DESTINATION,
  type RoleDrawerDestination,
  type RoleDrawerRole,
} from "../../navigation/role-drawer-model";

type RoleDrawerContextValue = {
  openDrawer: () => void;
};

const RoleDrawerContext = createContext<RoleDrawerContextValue | null>(null);

const roleLabels: Record<RoleDrawerRole, string> = {
  teacher: "Teacher workspace",
  student: "Student workspace",
  admin: "Admin workspace",
};

export function useRoleDrawer() {
  return useContext(RoleDrawerContext);
}

export function RoleMenuButton({ color = theme.redText }: { color?: string }) {
  const drawer = useRoleDrawer();
  if (!drawer) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
      onPress={drawer.openDrawer}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name="menu" size={23} color={color} />
    </Pressable>
  );
}

export function RoleHeaderNavigationButton({
  color = theme.redText,
  onBackPress,
}: {
  color?: string;
  onBackPress?: () => void;
}) {
  const drawer = useRoleDrawer();

  if (drawer) return <RoleMenuButton color={color} />;
  if (!onBackPress) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onBackPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name="arrow-left" size={23} color={color} />
    </Pressable>
  );
}

export function RoleDrawerProvider({
  role,
  activeRouteName,
  onNavigate,
  children,
}: PropsWithChildren<{
  role: RoleDrawerRole;
  activeRouteName: string;
  onNavigate: (destination: RoleDrawerDestination) => void;
}>) {
  const [visible, setVisible] = useState(false);
  const contextValue = useMemo(
    () => ({ openDrawer: () => setVisible(true) }),
    [],
  );

  const handleNavigate = (destination: RoleDrawerDestination) => {
    setVisible(false);
    onNavigate(destination);
  };

  return (
    <RoleDrawerContext.Provider value={contextValue}>
      <View style={{ flex: 1 }}>{children}</View>
      <RoleNavigationDrawer
        role={role}
        activeRouteName={activeRouteName}
        visible={visible}
        onClose={() => setVisible(false)}
        onNavigate={handleNavigate}
      />
    </RoleDrawerContext.Provider>
  );
}

function RoleNavigationDrawer({
  role,
  activeRouteName,
  visible,
  onClose,
  onNavigate,
}: {
  role: RoleDrawerRole;
  activeRouteName: string;
  visible: boolean;
  onClose: () => void;
  onNavigate: (destination: RoleDrawerDestination) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const groups = ROLE_DRAWER_GROUPS[role];
  const drawerWidth = Math.min(windowWidth * 0.84, 380);

  const renderDestination = (destination: RoleDrawerDestination) => {
    const active = activeRouteName === destination.route;
    return (
      <Pressable
        key={`${destination.kind}-${destination.route}`}
        accessibilityRole="button"
        accessibilityLabel={`Go to ${destination.label}`}
        accessibilityState={{ selected: active }}
        onPress={() => onNavigate(destination)}
        style={{
          minHeight: 48,
          borderRadius: 12,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: active ? theme.redSoft : "transparent",
        }}
      >
        <MaterialCommunityIcons
          name={destination.icon}
          size={20}
          color={active ? theme.redText : theme.muted}
        />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.35}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: active ? "800" : "600",
            color: active ? theme.redText : theme.text,
          }}
        >
          {destination.label}
        </Text>
        {active ? (
          <View style={{ width: 4, height: 22, borderRadius: 999, backgroundColor: theme.red }} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: "rgba(15,23,42,0.32)" }}>
        <View
          testID="role-navigation-drawer"
          accessibilityViewIsModal
          style={{
            width: drawerWidth,
            height: "100%",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            backgroundColor: theme.surface,
            borderRightWidth: 1,
            borderRightColor: theme.border,
          }}
        >
          <View
            style={{
              minHeight: 76,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Image
              source={require("../../../assets/auth/gabhs-seal.png")}
              resizeMode="contain"
              style={{ width: 42, height: 42 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: theme.text }}>GABHS Nexora</Text>
              <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "600", color: theme.muted }}>
                {roleLabels[role]}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close navigation menu"
              onPress={onClose}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 14, gap: 14 }}
          >
            {groups.map((group) => (
              <View key={group.label}>
                <Text
                  style={{
                    paddingHorizontal: 12,
                    paddingBottom: 6,
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: theme.dim,
                  }}
                >
                  {group.label}
                </Text>
                <View style={{ gap: 2 }}>{group.items.map(renderDestination)}</View>
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
            {renderDestination(ROLE_DRAWER_PROFILE_DESTINATION)}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss navigation menu"
          onPress={onClose}
          style={{ flex: 1 }}
        />
      </View>
    </Modal>
  );
}
