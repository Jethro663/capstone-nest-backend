import { useState, type PropsWithChildren, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Refreshable, ScreenScroll } from "../ui/primitives";
import { stripRichText } from "../../theme/studentDark";
import { teacherTheme as theme } from "../../theme/teacher";
import { shadow } from "../../theme/tokens";
import { RoleHeaderNavigationButton } from "../navigation/RoleNavigationDrawer";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export { theme as teacherTheme, stripRichText };

export function TeacherScreen({
  title,
  showBackButton = false,
  onBackPress,
  backLabel = "Back",
  rightAction,
  refreshing,
  onRefresh,
  bottomAction,
  children,
}: PropsWithChildren<{
  workspaceLabel?: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  showBackButton?: boolean;
  onBackPress?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomAction?: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const canGoBack = showBackButton && typeof onBackPress === "function";

  const scrollContent = (
    <ScreenScroll
        backgroundColor={theme.bg}
        refreshControl={
          onRefresh ? <Refreshable refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined
        }
      >
        <View
          testID="teacher-compact-header"
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
            {canGoBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={backLabel}
                onPress={onBackPress}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.redSoft,
                }}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color={theme.red} />
              </Pressable>
            ) : (
              <RoleHeaderNavigationButton onBackPress={onBackPress} />
            )}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.35}
              style={{ flex: 1, fontSize: 20, fontWeight: "900", color: theme.text }}
            >
              {title}
            </Text>
            {rightAction}
            {onRefresh ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Refresh ${title}`}
                onPress={onRefresh}
                disabled={Boolean(refreshing)}
                style={{
                  opacity: refreshing ? 0.55 : 1,
                  width: 44,
                  minHeight: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name={refreshing ? "refresh-circle" : "refresh"}
                  size={20}
                  color={theme.red}
                />
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

export function TeacherAccordionSection({
  title,
  subtitle,
  icon,
  count,
  expanded,
  onToggle,
  action,
  accent = "red",
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon: IconName;
  count?: number | string;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
  accent?: "red" | "amber";
}>) {
  const accentColor = accent === "amber" ? theme.amber : theme.red;
  const accentSurface = accent === "amber" ? theme.amberSoft : theme.redSoft;

  return (
    <View
      style={{
        marginHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: expanded ? theme.surface : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${title}`}
          accessibilityState={{ expanded }}
          onPress={onToggle}
          style={{
            flex: 1,
            minHeight: 60,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 9,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: accentSurface,
            }}
          >
            <MaterialCommunityIcons name={icon} size={19} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text }}>{title}</Text>
            {subtitle ? (
              <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {count !== undefined ? (
            <View style={{ minWidth: 28, borderRadius: 999, backgroundColor: accentSurface, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ textAlign: "center", fontSize: 11, fontWeight: "800", color: accentColor }}>{count}</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.dim}
          />
        </Pressable>
        {action ? <View style={{ marginLeft: 8 }}>{action}</View> : null}
      </View>
      {expanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingBottom: 4 }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export function TeacherSelectMenu({
  label,
  selectedValue,
  options,
  onSelect,
}: {
  label: string;
  selectedValue: string;
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label ?? label;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible(true)}
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <MaterialCommunityIcons name="google-classroom" size={19} color={theme.red} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase" }}>{label}</Text>
          <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "800", color: theme.text }}>{selectedLabel}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.dim} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${label}`}
          onPress={() => setVisible(false)}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.38)" }}
        >
          <View
            style={{
              maxHeight: "70%",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: theme.surface,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "900", color: theme.text }}>{label}</Text>
            <ScrollView style={{ marginTop: 10 }}>
              {options.map((option) => {
                const selected = option.value === selectedValue;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(option.value);
                      setVisible(false);
                    }}
                    style={{
                      minHeight: 48,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? "800" : "600", color: selected ? theme.red : theme.text }}>
                      {option.label}
                    </Text>
                    {selected ? <MaterialCommunityIcons name="check" size={20} color={theme.red} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function TeacherPanel({
  title,
  subtitle,
  children,
  action,
}: PropsWithChildren<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}>) {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        overflow: "hidden",
        ...shadow.card,
      }}
    >
      {title || subtitle || action ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: children ? 10 : 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              {title ? <Text style={{ fontSize: 15, fontWeight: "800", color: theme.text }}>{title}</Text> : null}
              {subtitle ? (
                <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: theme.subtext }}>{subtitle}</Text>
              ) : null}
            </View>
            {action}
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function TeacherStats({
  items,
}: {
  items: Array<{ label: string; value: string | number; tone?: "red" | "blue" | "green" | "amber" | "purple" }>;
}) {
  const toneColor = (tone?: "red" | "blue" | "green" | "amber" | "purple") => {
    switch (tone) {
      case "blue":
        return theme.blue;
      case "green":
        return theme.green;
      case "amber":
        return theme.amber;
      case "purple":
        return theme.purple;
      case "red":
      default:
        return theme.red;
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 12 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            minWidth: 128,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 12,
            paddingVertical: 11,
            ...shadow.card,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
            {item.label}
          </Text>
          <Text style={{ marginTop: 5, fontSize: 18, fontWeight: "800", color: toneColor(item.tone) }}>
            {item.value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function TeacherChip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        minHeight: 44,
        borderWidth: 1,
        borderColor: active ? theme.redLine : theme.border,
        backgroundColor: active ? theme.redSoft : theme.surface,
        paddingHorizontal: 11,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: active ? theme.red : theme.muted }}>{label}</Text>
    </Pressable>
  );
}

export function TeacherActionButton({
  label,
  icon,
  tone = "red",
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: IconName;
  tone?: "red" | "blue" | "green" | "amber" | "purple" | "neutral";
  onPress?: () => void;
  disabled?: boolean;
}) {
  const background =
    tone === "neutral"
      ? theme.active
      : tone === "blue"
        ? theme.blueSoft
        : tone === "green"
          ? theme.greenSoft
          : tone === "amber"
            ? theme.amberSoft
            : tone === "purple"
              ? theme.purpleSoft
              : theme.redSoft;
  const color =
    tone === "neutral"
      ? theme.text
      : tone === "blue"
        ? theme.blue
        : tone === "green"
          ? theme.green
          : tone === "amber"
            ? theme.amber
            : tone === "purple"
              ? theme.purple
              : theme.red;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        opacity: disabled ? 0.45 : 1,
        minHeight: 44,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: background,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={15} color={color} /> : null}
      <Text style={{ fontSize: 12, fontWeight: "700", color }}>{label}</Text>
    </Pressable>
  );
}

export function TeacherEmpty({
  title,
  subtitle,
  icon = "inbox-outline",
}: {
  title: string;
  subtitle: string;
  icon?: IconName;
}) {
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 18, paddingVertical: 24 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.redSoft,
        }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={theme.red} />
      </View>
      <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "800", color: theme.text }}>{title}</Text>
      <Text style={{ marginTop: 4, textAlign: "center", fontSize: 12, lineHeight: 18, color: theme.subtext }}>
        {subtitle}
      </Text>
    </View>
  );
}

export function TeacherRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  containerStyle,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  containerStyle?: any;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        {
          paddingHorizontal: 14,
          minHeight: 64,
          paddingVertical: 14,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        containerStyle,
      ]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: containerStyle?.backgroundColor ? '#fff' : theme.text }}>{title}</Text>
        {subtitle ? <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 17, color: containerStyle?.backgroundColor ? 'rgba(255,255,255,0.8)' : theme.subtext }}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={16} color={containerStyle?.backgroundColor ? '#fff' : theme.dim} /> : null}
    </Pressable>
  );
}

export function TeacherSearch({
  value,
  onChangeText,
  placeholder = "Search",
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 12,
        minHeight: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <MaterialCommunityIcons name="magnify" size={16} color={theme.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.dim}
        value={value}
        onChangeText={onChangeText}
        style={{ flex: 1, color: theme.text, fontSize: 13, paddingVertical: 12 }}
      />
    </View>
  );
}

export function TeacherInlineField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
        {label}
      </Text>
      <TextInput
        multiline={multiline}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.dim}
        style={{
          marginTop: 6,
          minHeight: multiline ? 88 : 44,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.active,
          color: theme.text,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 12 : 10,
          textAlignVertical: multiline ? "top" : "center",
          fontSize: 13,
        }}
        value={value}
      />
    </View>
  );
}
