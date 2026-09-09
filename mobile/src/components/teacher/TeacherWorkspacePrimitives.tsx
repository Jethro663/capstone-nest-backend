import { type PropsWithChildren, type ReactNode, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { teacherTheme as theme } from "../../theme/teacher";

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
      return { color: theme.red, surface: theme.redSoft };
  }
}

export function TeacherContextStrip({
  title,
  subtitle,
  status,
  icon = "google-classroom",
}: {
  title: string;
  subtitle?: string;
  status?: string;
  icon?: IconName;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.redText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "900", color: theme.text }}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>{subtitle}</Text> : null}
      </View>
      {status ? (
        <View style={{ borderRadius: 999, backgroundColor: theme.redSoft, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: theme.redText }}>{status}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TeacherWorkspaceSwitcher<Key extends string>({
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
        style={{ marginHorizontal: 16, marginTop: 12, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <MaterialCommunityIcons name={active?.icon ?? "view-grid-outline"} size={19} color={theme.redText} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>Class workspace</Text>
          <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "900", color: theme.text }}>{active?.label ?? "Choose workspace"}</Text>
        </View>
        {active?.count !== undefined ? <Text style={{ fontSize: 11, fontWeight: "800", color: theme.redText }}>{active.count}</Text> : null}
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.dim} />
      </Pressable>
      <TeacherActionSheet visible={visible} title="Class workspace" subtitle="Choose what you want to manage." onClose={() => setVisible(false)}>
        {items.map((item) => {
          const selected = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label} workspace`}
              accessibilityState={{ selected }}
              onPress={() => {
                onSelect(item.key);
                setVisible(false);
              }}
              style={{ minHeight: 52, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 2 }}
            >
              <MaterialCommunityIcons name={item.icon} size={19} color={selected ? theme.redText : theme.muted} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? "900" : "700", color: selected ? theme.redText : theme.text }}>{item.label}</Text>
              {item.count !== undefined ? <Text style={{ fontSize: 11, color: theme.muted }}>{item.count}</Text> : null}
              {selected ? <MaterialCommunityIcons name="check" size={19} color={theme.redText} /> : null}
            </Pressable>
          );
        })}
      </TeacherActionSheet>
    </>
  );
}

export function TeacherQuickActionRail({
  actions,
}: {
  actions: Array<{ label: string; icon: IconName; onPress: () => void; tone?: Tone; disabled?: boolean }>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
      {actions.map((action) => {
        const colors = toneColors(action.tone);
        return (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            disabled={action.disabled}
            onPress={action.onPress}
            style={{ minHeight: 44, opacity: action.disabled ? 0.45 : 1, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 }}
          >
            <MaterialCommunityIcons name={action.icon} size={17} color={colors.color} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.color }}>{action.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function TeacherFlatSection({
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.border, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
      <View style={{ minHeight: 58, paddingHorizontal: 16, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "900", color: theme.text }}>{title}</Text>
          {subtitle ? <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 16, color: theme.muted }}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export function TeacherActionSheet({
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

export function TeacherStepTabs<Key extends string>({
  steps,
  activeStep,
  onSelect,
}: {
  steps: Array<{ key: Key; label: string }>;
  activeStep: Key;
  onSelect: (step: Key) => void;
}) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: "row", borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 3 }}>
      {steps.map((step, index) => {
        const selected = step.key === activeStep;
        return (
          <Pressable key={step.key} accessibilityRole="button" accessibilityLabel={`${step.label} step`} accessibilityState={{ selected }} onPress={() => onSelect(step.key)} style={{ flex: 1, minHeight: 44, borderRadius: 9, backgroundColor: selected ? theme.redSoft : "transparent", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 }}>
            <Text style={{ fontSize: 10, fontWeight: "900", color: selected ? theme.redText : theme.muted }}>{index + 1}</Text>
            <Text style={{ fontSize: 11, fontWeight: selected ? "900" : "700", color: selected ? theme.redText : theme.muted }}>{step.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TeacherInlineNotice({
  title,
  description,
  icon = "information-outline",
  tone = "blue",
}: {
  title: string;
  description: string;
  icon?: IconName;
  tone?: Tone;
}) {
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

export function TeacherBottomActionBar({
  primaryLabel,
  onPrimary,
  primaryIcon = "arrow-right",
  disabled = false,
  secondary,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryIcon?: IconName;
  disabled?: boolean;
  secondary?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View testID="teacher-bottom-action-bar" style={{ borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), flexDirection: "row", alignItems: "center", gap: 8 }}>
      {secondary}
      <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} disabled={disabled} onPress={onPrimary} style={{ flex: 1, minHeight: 48, opacity: disabled ? 0.45 : 1, borderRadius: 12, backgroundColor: theme.redText, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF" }}>{primaryLabel}</Text>
        <MaterialCommunityIcons name={primaryIcon} size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
