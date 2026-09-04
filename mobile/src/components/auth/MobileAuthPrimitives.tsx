import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, modernAcademic, radii, shadow, skillStream } from "../../theme/tokens";

export const authTheme = {
  background: skillStream.background,
  backgroundAlt: modernAcademic.surfaceContainerLow,
  card: skillStream.card,
  cardInner: skillStream.elevated,
  textDark: modernAcademic.onSurface,
  textMid: modernAcademic.onSurfaceVariant,
  textLight: skillStream.muted,
  border: colors.border,
  badgeBorder: colors.border,
  badgeFill: skillStream.elevated,
  badgeIconFill: "#DDE1FF",
  badgeIconBorder: modernAcademic.outlineVariant,
  errorFill: modernAcademic.errorContainer,
  errorBorder: "rgba(255,180,171,0.28)",
  successFill: "rgba(159,214,184,0.12)",
  successBorder: "rgba(159,214,184,0.28)",
  white: modernAcademic.onPrimary,
  red: modernAcademic.error,
  orange: colors.amber,
  blue: modernAcademic.primary,
  green: colors.green,
} as const;

type BackgroundBlob = {
  color: string;
  width: number;
  height: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

const backgroundBlobs: BackgroundBlob[] = [];

const titleFontFamily = Platform.select({ default: undefined });

const cardGradient = [modernAcademic.primary, modernAcademic.primaryContainer] as const;
const loadingGradient = [modernAcademic.primaryContainer, modernAcademic.primary] as const;

export function AuthScreenFrame({ children }: PropsWithChildren) {
  return (
    <LinearGradient colors={[authTheme.background, authTheme.backgroundAlt, authTheme.background]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
      <View style={{ pointerEvents: "none", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}>
        {backgroundBlobs.map((blob, index) => (
          <View
            key={`blob-${index}`}
            style={{
              backgroundColor: blob.color,
              borderRadius: 999,
              bottom: blob.bottom,
              height: blob.height,
              left: blob.left,
              opacity: 0.95,
              position: "absolute",
              right: blob.right,
              top: blob.top,
              width: blob.width,
            }}
          />
        ))}
        <View
          style={{
            backgroundColor: "rgba(30,64,175,0.03)",
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 12}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 34,
          }}
        >
          <View style={{ alignItems: "center" }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function AuthBrandBadge() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: authTheme.badgeFill,
        borderColor: authTheme.badgeBorder,
        borderRadius: 14,
        borderWidth: 1,
        ...shadow.card,
        flexDirection: "row",
        gap: 10,
        marginBottom: 24,
        paddingBottom: 8,
        paddingLeft: 8,
        paddingRight: 14,
        paddingTop: 8,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: authTheme.badgeIconFill,
          borderColor: authTheme.badgeIconBorder,
          borderRadius: 10,
          borderWidth: 1,
          height: 38,
          justifyContent: "center",
          width: 38,
        }}
      >
        <MaterialCommunityIcons color={authTheme.blue} name="school-outline" size={18} />
      </View>
      <View>
        <Text
          style={{
            color: authTheme.textLight,
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          GABHS Digital Campus
        </Text>
        <Text style={{ color: authTheme.textDark, fontSize: 14, fontWeight: "700", marginTop: 2 }}>
          Nexora Portal
        </Text>
      </View>
    </View>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>) {
  return (
    <View
      style={{
        backgroundColor: authTheme.card,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        width: "100%",
        ...shadow.card,
      }}
    >
      <LinearGradient colors={cardGradient} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={{ height: 4 }} />

      <View style={{ paddingBottom: 20, paddingHorizontal: 24, paddingTop: 24 }}>
        <Text
          style={{
            color: authTheme.textDark,
            fontFamily: titleFontFamily,
            fontSize: 28,
            fontWeight: "700",
            lineHeight: 34,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: authTheme.textMid,
            fontSize: 12,
            lineHeight: 18,
            marginBottom: 22,
            marginTop: 5,
          }}
        >
          {subtitle}
        </Text>
        {children}
      </View>

      {footer ? (
        <View
          style={{
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: 18,
            paddingHorizontal: 24,
            paddingTop: 12,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function AuthScreenShell({
  title,
  subtitle,
  children,
  footer,
}: PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>) {
  return (
    <AuthScreenFrame>
      <AuthBrandBadge />
      <AuthCard title={title} subtitle={subtitle} footer={footer}>
        {children}
      </AuthCard>
      <Text
        style={{
          color: authTheme.textLight,
          fontSize: 10,
          letterSpacing: 0.3,
          marginTop: 20,
          textAlign: "center",
        }}
      >
        Copyright 2026 Nexora. All rights reserved.
      </Text>
    </AuthScreenFrame>
  );
}

export function AuthFieldLabel({ children }: PropsWithChildren) {
  return (
    <Text
      style={{
        color: authTheme.textDark,
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 7,
      }}
    >
      {children}
    </Text>
  );
}

export function AuthInputField({
  icon,
  iconColor,
  rightAccessory,
  containerStyle,
  inputStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: string;
  iconColor?: string;
  rightAccessory?: ReactNode;
  containerStyle?: React.ComponentProps<typeof View>["style"];
  inputStyle?: React.ComponentProps<typeof TextInput>["style"];
}) {
  return (
    <View
      style={[
        {
          alignItems: "center",
          backgroundColor: authTheme.cardInner,
          borderColor: authTheme.border,
          borderRadius: radii.md,
          borderWidth: 1.5,
          flexDirection: "row",
          paddingLeft: 12,
        },
        containerStyle,
      ]}
    >
      <MaterialCommunityIcons color={iconColor ?? authTheme.textLight} name={icon as never} size={16} />
      <TextInput
        keyboardAppearance="light"
        placeholderTextColor={authTheme.textLight}
        style={[
          {
            color: authTheme.textDark,
            flex: 1,
            fontSize: 14,
            minHeight: 44,
            paddingHorizontal: 10,
            paddingVertical: 12,
          },
          inputStyle,
        ]}
        {...props}
      />
      {rightAccessory}
    </View>
  );
}

export function AuthStatusBanner({ tone, message }: { tone: "error" | "success"; message: string }) {
  const isError = tone === "error";
  return (
    <View
      style={{
        backgroundColor: isError ? authTheme.errorFill : authTheme.successFill,
        borderColor: isError ? authTheme.errorBorder : authTheme.successBorder,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 14,
        paddingHorizontal: 12,
        paddingVertical: 11,
      }}
    >
      <Text style={{ color: isError ? authTheme.red : authTheme.green, fontSize: 12, fontWeight: "700" }}>{message}</Text>
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  loadingLabel,
  loading,
  onPress,
  disabled,
  gradientColors,
}: {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
}) {
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={{ marginTop: 18, minHeight: 48 }}>
      <LinearGradient
        colors={loading ? loadingGradient : gradientColors ?? cardGradient}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0 }}
        style={{
          alignItems: "center",
          borderRadius: radii.md,
          flexDirection: "row",
          justifyContent: "center",
          opacity: disabled && !loading ? 0.65 : 1,
          minHeight: 48,
          paddingVertical: 13,
        }}
      >
        {loading ? <MaterialCommunityIcons color={authTheme.white} name="loading" size={16} style={{ marginRight: 8 }} /> : null}
        <Text style={{ color: authTheme.white, fontSize: 14, fontWeight: "700", letterSpacing: 0.3 }}>
          {loading ? loadingLabel || label : label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function AuthSecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        borderColor: authTheme.border,
        borderRadius: radii.md,
        borderWidth: 1.5,
        justifyContent: "center",
        marginTop: 10,
        opacity: disabled ? 0.6 : 1,
        minHeight: 48,
        paddingVertical: 13,
      }}
    >
      <Text style={{ color: authTheme.textDark, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function AuthFooterLink({
  color,
  label,
  onPress,
}: {
  color?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: color ?? authTheme.textMid, fontSize: 11, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

export function AuthRulePills({ rules }: { rules: Array<{ label: string; passed: boolean }> }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
      {rules.map((rule, index) => (
        <View
          key={rule.label}
          style={{
            alignItems: "center",
            backgroundColor: rule.passed ? "rgba(34,197,94,0.09)" : authTheme.cardInner,
            borderColor: rule.passed ? "rgba(34,197,94,0.28)" : authTheme.border,
            borderRadius: 4,
            borderWidth: 1,
            flexDirection: "row",
            marginBottom: 6,
            marginRight: index === rules.length - 1 ? 0 : 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: rule.passed ? authTheme.green : authTheme.textMid, fontSize: 8, marginRight: 4 }}>
            {rule.passed ? "o" : "o"}
          </Text>
          <Text style={{ color: rule.passed ? authTheme.green : authTheme.textMid, fontSize: 9 }}>{rule.label}</Text>
        </View>
      ))}
    </View>
  );
}
