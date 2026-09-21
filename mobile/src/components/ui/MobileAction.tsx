import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { mobileBrand, mobileRadii } from "../../theme/mobileBrand";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export type MobileActionVariant = "primary" | "secondary" | "tertiary" | "icon" | "inverse";
export type MobileActionTone = "red" | "navy" | "success" | "warning" | "danger" | "neutral";

function toneColors(tone: MobileActionTone) {
  if (tone === "navy") return { strong: mobileBrand.navy, soft: mobileBrand.navySoft };
  if (tone === "success") return { strong: mobileBrand.success, soft: mobileBrand.successSoft };
  if (tone === "warning") return { strong: mobileBrand.warning, soft: mobileBrand.warningSoft };
  if (tone === "danger") return { strong: mobileBrand.danger, soft: mobileBrand.dangerSoft };
  if (tone === "neutral") return { strong: mobileBrand.text, soft: mobileBrand.surfaceMuted };
  return { strong: mobileBrand.red, soft: mobileBrand.redSoft };
}

export function MobileAction({
  label,
  accessibilityLabel = label,
  icon,
  variant = "primary",
  tone = variant === "secondary" ? "navy" : variant === "tertiary" || variant === "icon" ? "neutral" : "red",
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  accessibilityLabel?: string;
  icon?: IconName;
  variant?: MobileActionVariant;
  tone?: MobileActionTone;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const colors = toneColors(tone);
  const filled = variant === "primary";
  const inverse = variant === "inverse";
  const iconOnly = variant === "icon" || inverse;
  const color = inverse
    ? mobileBrand.inverseForeground
    : filled
      ? mobileBrand.white
      : colors.strong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        minHeight: mobileBrand.minTarget,
        minWidth: iconOnly ? mobileBrand.minTarget : undefined,
        opacity: disabled ? 0.45 : 1,
        borderRadius: mobileRadii.control,
        borderWidth: variant === "tertiary" ? 0 : 1,
        borderColor: inverse
          ? mobileBrand.inverseBorder
          : filled
            ? colors.strong
            : variant === "tertiary"
              ? mobileBrand.transparent
              : mobileBrand.borderStrong,
        backgroundColor: inverse
          ? mobileBrand.inverseSurface
          : filled
            ? colors.strong
            : variant === "tertiary"
              ? mobileBrand.transparent
              : colors.soft,
        paddingHorizontal: iconOnly ? 10 : 14,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {icon ? <MaterialCommunityIcons name={loading ? "loading" : icon} size={18} color={color} /> : null}
      {iconOnly ? null : <Text style={{ fontSize: 13, fontWeight: "800", color }}>{loading ? "Please wait…" : label}</Text>}
    </Pressable>
  );
}
