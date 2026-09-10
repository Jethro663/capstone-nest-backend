import { useState, type PropsWithChildren, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoleHeaderNavigationButton } from "../navigation/RoleNavigationDrawer";
import { Refreshable, ScreenScroll } from "../ui/primitives";
import { studentDarkTheme as theme } from "../../theme/studentDark";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type Tone = "red" | "blue" | "green" | "amber" | "purple" | "neutral";

function toneColors(tone: Tone = "red") {
  switch (tone) {
    case "blue":
      return { color: theme.blue, surface: theme.blueSoft };
    case "green":
      return { color: theme.green, surface: theme.greenSoft };
    case "amber":
      return { color: theme.amber, surface: theme.amberSoft };
    case "purple":
      return { color: theme.purple, surface: theme.purpleSoft };
    case "neutral":
      return { color: theme.text, surface: theme.active };
    default:
      return { color: theme.redText, surface: theme.redSoft };
  }
}

export function StudentScreen({
  title,
  showBackButton = false,
  onBackPress,
  rightAction,
  refreshing,
  onRefresh,
  showRefreshAction = true,
  bottomAction,
  children,
}: PropsWithChildren<{
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  showRefreshAction?: boolean;
  bottomAction?: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const scrollContent = (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={onRefresh ? <Refreshable refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
    >
      <View
        testID="student-compact-header"
        style={{
          backgroundColor: theme.topbar,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingHorizontal: 16,
          paddingTop: insets.top + 6,
          paddingBottom: 8,
        }}
      >
        <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 }}>
          {showBackButton && onBackPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBackPress}
              style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={theme.redText} />
            </Pressable>
          ) : (
            <RoleHeaderNavigationButton onBackPress={onBackPress} color={theme.redText} />
          )}
          <Text numberOfLines={1} maxFontSizeMultiplier={1.35} style={{ flex: 1, fontSize: 20, fontWeight: "900", color: theme.text }}>
            {title}
          </Text>
          {rightAction}
          {onRefresh && showRefreshAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Refresh ${title}`}
              accessibilityState={{ disabled: Boolean(refreshing) }}
              disabled={Boolean(refreshing)}
              onPress={onRefresh}
              style={{ width: 44, height: 44, opacity: refreshing ? 0.5 : 1, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}
            >
              <MaterialCommunityIcons name="refresh" size={20} color={theme.redText} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {children}
    </ScreenScroll>
  );

  if (!bottomAction) return scrollContent;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {scrollContent}
      {bottomAction}
    </View>
  );
}

export function StudentContextStrip({
  title,
  subtitle,
  status,
  icon = "school-outline",
}: {
  title: string;
  subtitle?: string;
  status?: string;
  icon?: IconName;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.redText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "900", color: theme.text }}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>{subtitle}</Text> : null}
      </View>
      {status ? <Text style={{ fontSize: 10, fontWeight: "800", color: theme.redText }}>{status}</Text> : null}
    </View>
  );
}

export function StudentActionSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; title: string; subtitle?: string; onClose: () => void }>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.34)" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss ${title}`} onPress={onClose} style={{ flex: 1 }} />
        <View style={{ maxHeight: "82%", borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: theme.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 }}>
          <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: theme.border2, alignSelf: "center", marginBottom: 8 }} />
          <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "900", color: theme.text }}>{title}</Text>
              {subtitle ? <Text style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.active }}>
              <MaterialCommunityIcons name="close" size={20} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function StudentWorkspaceSwitcher<Key extends string>({
  activeKey,
  items,
  onSelect,
}: {
  activeKey: Key;
  items: Array<{ key: Key; label: string; icon: IconName; count?: string | number }>;
  onSelect: (key: Key) => void;
}) {
  const [visible, setVisible] = useState(false);
  const active = items.find((item) => item.key === activeKey) ?? items[0];
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open class workspace menu"
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible(true)}
        style={{ marginHorizontal: 16, marginVertical: 12, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <MaterialCommunityIcons name={active?.icon ?? "view-grid-outline"} size={19} color={theme.redText} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>Class workspace</Text>
          <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "900", color: theme.text }}>{active?.label ?? "Choose workspace"}</Text>
        </View>
        {active?.count !== undefined ? <Text style={{ fontSize: 11, fontWeight: "800", color: theme.redText }}>{active.count}</Text> : null}
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.dim} />
      </Pressable>
      <StudentActionSheet visible={visible} title="Class workspace" subtitle="Choose what you want to open." onClose={() => setVisible(false)}>
        {items.map((item) => {
          const selected = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label} workspace`}
              accessibilityState={{ selected }}
              onPress={() => { onSelect(item.key); setVisible(false); }}
              style={{ minHeight: 52, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 2 }}
            >
              <MaterialCommunityIcons name={item.icon} size={19} color={selected ? theme.redText : theme.muted} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? "900" : "700", color: selected ? theme.redText : theme.text }}>{item.label}</Text>
              {item.count !== undefined ? <Text style={{ fontSize: 11, color: theme.muted }}>{item.count}</Text> : null}
              {selected ? <MaterialCommunityIcons name="check" size={19} color={theme.redText} /> : null}
            </Pressable>
          );
        })}
      </StudentActionSheet>
    </>
  );
}

export function StudentSegmentedControl<Key extends string>({
  accessibilityLabel,
  activeKey,
  items,
  onSelect,
}: {
  accessibilityLabel: string;
  activeKey: Key;
  items: Array<{ key: Key; label: string }>;
  onSelect: (key: Key) => void;
}) {
  return (
    <ScrollView accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }} contentContainerStyle={{ paddingHorizontal: 16 }}>
      {items.map((item) => {
        const selected = item.key === activeKey;
        return (
          <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => onSelect(item.key)} style={{ minHeight: 44, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: selected ? theme.red : "transparent", paddingHorizontal: 13 }}>
            <Text style={{ fontSize: 12, fontWeight: selected ? "800" : "600", color: selected ? theme.redText : theme.muted }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function StudentSelectMenu({
  label,
  selectedValue,
  options,
  onSelect,
  icon = "google-classroom",
}: {
  label: string;
  selectedValue: string;
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
  icon?: IconName;
}) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label ?? label;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selectedLabel}`} accessibilityState={{ expanded: visible }} onPress={() => setVisible(true)} style={{ marginHorizontal: 16, marginTop: 12, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <MaterialCommunityIcons name={icon} size={19} color={theme.redText} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase" }}>{label}</Text>
          <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "800", color: theme.text }}>{selectedLabel}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.dim} />
      </Pressable>
      <StudentActionSheet visible={visible} title={label} onClose={() => setVisible(false)}>
        {options.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ selected }} onPress={() => { onSelect(option.value); setVisible(false); }} style={{ minHeight: 52, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 2 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? "800" : "600", color: selected ? theme.redText : theme.text }}>{option.label}</Text>
              {selected ? <MaterialCommunityIcons name="check" size={20} color={theme.redText} /> : null}
            </Pressable>
          );
        })}
      </StudentActionSheet>
    </>
  );
}

export function StudentFlatSection({ title, subtitle, action, children }: PropsWithChildren<{ title: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.border, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
      <View style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: theme.text }}>{title}</Text>
          {subtitle ? <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 16, color: theme.muted }}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export function StudentListRow({
  title,
  subtitle,
  icon,
  status,
  tone = "red",
  onPress,
  disabled = false,
  trailing,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  status?: string;
  tone?: Tone;
  onPress?: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  const colors = toneColors(tone);
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={onPress ? `Open ${title}` : undefined} accessibilityState={{ disabled }} disabled={disabled || !onPress} onPress={onPress} style={{ minHeight: 60, opacity: disabled ? 0.5 : 1, borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 16, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: theme.surface }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 17, fontWeight: "800", color: theme.text }}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={{ marginTop: 2, fontSize: 11, lineHeight: 15, color: theme.muted }}>{subtitle}</Text> : null}
      </View>
      {status ? <Text style={{ fontSize: 10, fontWeight: "800", color: colors.color }}>{status}</Text> : null}
      {trailing ?? (onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={theme.dim} /> : null)}
    </Pressable>
  );
}

export function StudentInlineNotice({ title, description, icon = "information-outline", tone = "amber" }: { title: string; description: string; icon?: IconName; tone?: Tone }) {
  const colors = toneColors(tone);
  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, borderLeftWidth: 3, borderLeftColor: colors.color, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.color} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: theme.text }}>{title}</Text>
        <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 16, color: theme.subtext }}>{description}</Text>
      </View>
    </View>
  );
}

export function StudentBottomActionBar({ primaryLabel, onPrimary, primaryIcon = "arrow-right", disabled = false, secondary }: { primaryLabel: string; onPrimary: () => void; primaryIcon?: IconName; disabled?: boolean; secondary?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID="student-bottom-action-bar" style={{ borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), flexDirection: "row", alignItems: "center", gap: 8 }}>
      {secondary}
      <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPrimary} style={{ flex: 1, minHeight: 48, opacity: disabled ? 0.5 : 1, borderRadius: 12, backgroundColor: theme.redText, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF" }}>{primaryLabel}</Text>
        <MaterialCommunityIcons name={primaryIcon} size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
