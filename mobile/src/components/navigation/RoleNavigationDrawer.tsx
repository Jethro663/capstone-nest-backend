import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { AppAlert as Alert } from "../ui/AppAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileBrand } from "../../theme/mobileBrand";
import { MobileAction } from "../ui/MobileAction";
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

export function RoleMenuButton() {
  const drawer = useRoleDrawer();
  if (!drawer) return null;

  return (
    <MobileAction
      label="Open navigation menu"
      accessibilityLabel="Open navigation menu"
      icon="menu"
      variant="inverse"
      onPress={drawer.openDrawer}
    />
  );
}

export function RoleHeaderNavigationButton({
  onBackPress,
  preferBack = false,
}: {
  onBackPress?: () => void;
  preferBack?: boolean;
}) {
  const drawer = useRoleDrawer();

  if (drawer && !preferBack) return <RoleMenuButton />;
  if (!onBackPress) return null;

  return (
    <MobileAction
      label="Back"
      accessibilityLabel="Back"
      icon="arrow-left"
      variant="inverse"
      onPress={onBackPress}
    />
  );
}

export function RoleDrawerProvider({
  role,
  activeRouteName,
  onNavigate,
  onLogout,
  children,
}: PropsWithChildren<{
  role: RoleDrawerRole;
  activeRouteName: string;
  onNavigate: (destination: RoleDrawerDestination) => void;
  onLogout?: () => Promise<void> | void;
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
        onLogout={onLogout}
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
  onLogout,
}: {
  role: RoleDrawerRole;
  activeRouteName: string;
  visible: boolean;
  onClose: () => void;
  onNavigate: (destination: RoleDrawerDestination) => void;
  onLogout?: () => Promise<void> | void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const groups = ROLE_DRAWER_GROUPS[role];
  const drawerWidth = Math.min(windowWidth * 0.84, 380);

  const confirmLogout = () => {
    Alert.alert(
      "Log out?",
      role === "admin"
        ? "You will need to sign in again to continue administration."
        : role === "teacher"
          ? "You will need to sign in again to continue teaching."
          : "You will need to sign in again to continue learning.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            onClose();
            await onLogout?.();
          },
        },
      ],
    );
  };

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
          backgroundColor: active ? mobileBrand.navySoft : mobileBrand.transparent,
        }}
      >
        <MaterialCommunityIcons
          name={destination.icon}
          size={20}
          color={active ? mobileBrand.red : mobileBrand.muted}
        />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.35}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: active ? "800" : "600",
            color: active ? mobileBrand.navy : mobileBrand.text,
          }}
        >
          {destination.label}
        </Text>
        {active ? (
          <View
            style={{
              width: 4,
              height: 22,
              borderRadius: 999,
              backgroundColor: mobileBrand.red,
            }}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          backgroundColor: mobileBrand.scrim,
        }}
      >
        <View
          testID="role-navigation-drawer"
          accessibilityViewIsModal
          style={{
            width: drawerWidth,
            height: "100%",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            backgroundColor: mobileBrand.surface,
            borderRightWidth: 1,
            borderRightColor: mobileBrand.border,
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
              borderBottomColor: mobileBrand.navyRaised,
              backgroundColor: mobileBrand.navy,
            }}
          >
            <Image
              source={require("../../../assets/auth/gabhs-seal.png")}
              resizeMode="contain"
              style={{ width: 42, height: 42 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "900", color: mobileBrand.inverseForeground }}
              >
                GABHS Nexora
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  fontWeight: "600",
                  color: mobileBrand.inverseMuted,
                }}
              >
                {roleLabels[role]}
              </Text>
            </View>
            <MobileAction
              label="Close navigation menu"
              accessibilityLabel="Close navigation menu"
              icon="close"
              variant="inverse"
              onPress={onClose}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 14,
              gap: 14,
            }}
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
                    color: mobileBrand.dim,
                  }}
                >
                  {group.label}
                </Text>
                <View style={{ gap: 2 }}>
                  {group.items.map(renderDestination)}
                </View>
              </View>
            ))}
          </ScrollView>

          {onLogout ? (
            <View
              testID={`${role}-drawer-footer`}
              style={{
                padding: 12,
                borderTopWidth: 1,
                borderTopColor: mobileBrand.border,
                flexDirection: "row",
                alignItems: "stretch",
                gap: 8,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                {renderDestination(ROLE_DRAWER_PROFILE_DESTINATION)}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log out"
                onPress={confirmLogout}
                style={{
                  minWidth: 88,
                  minHeight: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: mobileBrand.dangerBorder,
                  backgroundColor: mobileBrand.dangerSoft,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={18}
                  color={mobileBrand.danger}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: mobileBrand.danger,
                    fontSize: 11,
                    fontWeight: "900",
                  }}
                >
                  Log out
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={{
                padding: 12,
                borderTopWidth: 1,
                borderTopColor: mobileBrand.border,
              }}
            >
              {renderDestination(ROLE_DRAWER_PROFILE_DESTINATION)}
            </View>
          )}
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
