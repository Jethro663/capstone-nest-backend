import { type PropsWithChildren, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Refreshable, ScreenScroll } from "../ui/primitives";
import { RoleHeaderNavigationButton } from "../navigation/RoleNavigationDrawer";
import { adminTheme as theme } from "../../theme/admin";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type Tone = "primary" | "green" | "amber" | "red" | "purple" | "neutral";

export { theme as adminTheme };

function toneColors(tone: Tone = "primary") {
  switch (tone) {
    case "green":
      return { color: theme.green, surface: theme.greenSoft };
    case "amber":
      return { color: theme.amber, surface: theme.amberSoft };
    case "red":
      return { color: theme.red, surface: theme.redSoft };
    case "purple":
      return { color: theme.purple, surface: theme.purpleSoft };
    case "neutral":
      return { color: theme.text, surface: theme.surfaceMuted };
    default:
      return { color: theme.primary, surface: theme.primarySoft };
  }
}

export function AdminScreen({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  backLabel = "Back",
  rightAction,
  refreshing,
  onRefresh,
  showRefreshAction = false,
  bottomAction,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  showRefreshAction?: boolean;
  bottomAction?: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const canGoBack = showBackButton && typeof onBackPress === "function";
  const content = (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={onRefresh ? <Refreshable refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
    >
      <View
        testID="admin-compact-header"
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: subtitle ? 12 : 8,
          paddingHorizontal: 16,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 }}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={onBackPress}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
            </Pressable>
          ) : (
            <RoleHeaderNavigationButton color={theme.primary} onBackPress={onBackPress} />
          )}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.35}
            style={{ flex: 1, fontSize: 20, fontWeight: "900", color: theme.text }}
          >
            {title}
          </Text>
          {rightAction}
          {showRefreshAction && onRefresh ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Refresh ${title}`}
              onPress={onRefresh}
              disabled={Boolean(refreshing)}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: refreshing ? 0.5 : 1 }}
            >
              <MaterialCommunityIcons name="refresh" size={21} color={theme.primary} />
            </Pressable>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={{ marginLeft: canGoBack ? 54 : 54, marginTop: 2, fontSize: 12, lineHeight: 17, color: theme.subtext }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </ScreenScroll>
  );

  if (!bottomAction) return content;
  return <View style={{ flex: 1, backgroundColor: theme.bg }}>{content}{bottomAction}</View>;
}

export function AdminMetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number; tone?: Tone }>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ minWidth: "100%" }}
      style={{ marginTop: 10 }}
    >
      <View
        testID="admin-metric-strip"
        style={{
          minWidth: "100%",
          flexDirection: "row",
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        {items.map((item, index) => {
          const colors = toneColors(item.tone);
          return (
            <View
              key={item.label}
              testID="admin-metric-item"
              style={{
                minWidth: 104,
                flexGrow: 1,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderLeftWidth: index === 0 ? 0 : 1,
                borderLeftColor: theme.border,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: "800", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {item.label}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 19, fontWeight: "900", color: colors.color }}>{item.value}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function AdminSection({
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<{ title?: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <View
      testID="admin-flat-section"
      style={{
        marginTop: 10,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.border,
      }}
    >
      {title || subtitle || action ? (
        <View style={{ minHeight: 58, paddingHorizontal: 16, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            {title ? <Text style={{ fontSize: 15, fontWeight: "900", color: theme.text }}>{title}</Text> : null}
            {subtitle ? <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 16, color: theme.subtext }}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function AdminDataRow({
  title,
  subtitle,
  meta,
  status,
  statusTone = "neutral",
  left,
  right,
  onPress,
  containerStyle,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  statusTone?: Tone;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  containerStyle?: ViewStyle;
}) {
  const colors = toneColors(statusTone);
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Open ${title}` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 66,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          backgroundColor: pressed ? theme.selection : theme.surface,
        },
        containerStyle,
      ]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "800", color: theme.text }}>{title}</Text>
          {status ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: colors.color }} />
              <Text style={{ fontSize: 10, fontWeight: "800", color: colors.color }}>{status}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text numberOfLines={1} style={{ marginTop: 3, fontSize: 11, color: theme.subtext }}>{subtitle}</Text> : null}
        {meta ? <Text numberOfLines={1} style={{ marginTop: 3, fontSize: 10, color: theme.muted }}>{meta}</Text> : null}
      </View>
      {right}
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={18} color={theme.dim} /> : null}
    </Pressable>
  );
}

export function AdminButton({
  label,
  icon,
  tone = "primary",
  variant = "soft",
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: IconName;
  tone?: Tone;
  variant?: "soft" | "solid" | "text";
  onPress?: () => void;
  disabled?: boolean;
}) {
  const colors = toneColors(tone);
  const solid = variant === "solid";
  const textOnly = variant === "text";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        opacity: disabled ? 0.45 : 1,
        borderRadius: 8,
        borderWidth: textOnly ? 0 : 1,
        borderColor: solid ? colors.color : theme.borderStrong,
        backgroundColor: textOnly ? "transparent" : solid ? colors.color : colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={solid ? "#FFFFFF" : colors.color} /> : null}
      <Text style={{ fontSize: 12, fontWeight: "800", color: solid ? "#FFFFFF" : colors.color }}>{label}</Text>
    </Pressable>
  );
}

export function AdminChip({
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        minHeight: 44,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme.borderStrong,
        backgroundColor: active ? theme.primarySoft : theme.surface,
        paddingHorizontal: 11,
        paddingVertical: 10,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "800", color: active ? theme.primary : theme.subtext }}>{label}</Text>
    </Pressable>
  );
}

export function AdminFilterBar<Key extends string>({
  search,
  onSearchChange,
  placeholder = "Search records",
  segments,
  activeSegment,
  onSegmentChange,
  resultCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  segments: Array<{ key: Key; label: string }>;
  activeSegment: Key;
  onSegmentChange: (key: Key) => void;
  resultCount: number;
}) {
  return (
    <View style={{ marginTop: 10, backgroundColor: theme.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border }}>
      <View style={{ minHeight: 48, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 8, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.muted} />
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={theme.dim}
          value={search}
          onChangeText={onSearchChange}
          style={{ flex: 1, color: theme.text, fontSize: 13, paddingVertical: 11 }}
        />
        {search ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onSearchChange("")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
        {segments.map((segment) => {
          const selected = segment.key === activeSegment;
          return (
            <Pressable
              key={segment.key}
              accessibilityRole="button"
              accessibilityLabel={`Show ${segment.label}`}
              accessibilityState={{ selected }}
              onPress={() => onSegmentChange(segment.key)}
              style={{ minHeight: 44, minWidth: 62, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: selected ? theme.primary : theme.subtext }}>{segment.label}</Text>
            </Pressable>
          );
        })}
        <View style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: "center" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted }}>{resultCount} {resultCount === 1 ? "result" : "results"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export function AdminField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "multiline" | "maxLength">) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.subtext }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.dim}
        multiline={multiline}
        maxLength={maxLength}
        {...props}
        style={{ minHeight: multiline ? 104 : 46, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 8, backgroundColor: theme.surface, color: theme.text, paddingHorizontal: 11, paddingVertical: 10, textAlignVertical: multiline ? "top" : "center" }}
      />
    </View>
  );
}

export function AdminEmpty({
  title,
  subtitle,
  icon = "database-search-outline",
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 20, paddingVertical: 28, borderTopWidth: 1, borderTopColor: theme.border }}>
      <MaterialCommunityIcons name={icon} size={24} color={theme.muted} />
      <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "900", color: theme.text }}>{title}</Text>
      <Text style={{ marginTop: 4, maxWidth: 300, textAlign: "center", fontSize: 12, lineHeight: 18, color: theme.subtext }}>{subtitle}</Text>
      {actionLabel && onAction ? <View style={{ marginTop: 12 }}><AdminButton label={actionLabel} onPress={onAction} /></View> : null}
    </View>
  );
}

export function AdminNotice({
  title,
  description,
  tone = "primary",
  icon = "information-outline",
}: {
  title: string;
  description: string;
  tone?: Tone;
  icon?: IconName;
}) {
  const colors = toneColors(tone);
  return (
    <View style={{ marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 11, borderLeftWidth: 3, borderLeftColor: colors.color, backgroundColor: colors.surface, flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.color} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: theme.text }}>{title}</Text>
        <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 16, color: theme.subtext }}>{description}</Text>
      </View>
    </View>
  );
}
