import type { PropsWithChildren, ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Refreshable, ScreenScroll } from "../ui/primitives";
import { studentDarkTheme as theme, stripRichText } from "../../theme/studentDark";
import { shadow } from "../../theme/tokens";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export { theme as teacherTheme, stripRichText };

export function TeacherScreen({
  title,
  subtitle,
  icon,
  showBackButton = false,
  onBackPress,
  backLabel = "Back",
  rightAction,
  refreshing,
  onRefresh,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon?: IconName;
  showBackButton?: boolean;
  onBackPress?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}>) {
  const canGoBack = showBackButton && typeof onBackPress === "function";

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={
        onRefresh ? <Refreshable refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined
      }
    >
      <View style={{ backgroundColor: theme.topbar, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 44, paddingBottom: 18 }}>
          {canGoBack ? (
            <Pressable
              onPress={onBackPress}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                minHeight: 44,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                paddingHorizontal: 10,
                paddingVertical: 9,
                marginBottom: 10,
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={14} color={theme.red} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.red }}>{backLabel}</Text>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {icon ? (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.redSoft,
                }}
              >
                <MaterialCommunityIcons name={icon} size={18} color={theme.red} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
                Teacher workspace
              </Text>
              <Text style={{ marginTop: 4, fontSize: 24, fontWeight: "900", color: theme.text }}>{title}</Text>
            </View>
            {rightAction || onRefresh ? (
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                {rightAction}
                {onRefresh ? (
                  <Pressable
                    onPress={onRefresh}
                    disabled={Boolean(refreshing)}
                    style={{
                      opacity: refreshing ? 0.6 : 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      minHeight: 44,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 10,
                      paddingVertical: 9,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={refreshing ? "refresh-circle" : "refresh"}
                      size={14}
                      color={theme.red}
                    />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.red }}>
                      {refreshing ? "Refreshing..." : "Refresh"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 20, color: theme.subtext }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {children}
    </ScreenScroll>
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
