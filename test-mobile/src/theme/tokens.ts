import type { ViewStyle } from "react-native";

export const modernAcademic = {
  surface: "#F7F9FB",
  surfaceDim: "#D8DADC",
  surfaceBright: "#F7F9FB",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F2F4F6",
  surfaceContainer: "#ECEEF0",
  surfaceContainerHigh: "#E6E8EA",
  surfaceContainerHighest: "#E0E3E5",
  onSurface: "#191C1E",
  onSurfaceVariant: "#444653",
  inverseSurface: "#2D3133",
  inverseOnSurface: "#EFF1F3",
  outline: "#757684",
  outlineVariant: "#C4C5D5",
  surfaceTint: "#3755C3",
  primary: "#00288E",
  onPrimary: "#FFFFFF",
  primaryContainer: "#1E40AF",
  onPrimaryContainer: "#A8B8FF",
  inversePrimary: "#B8C4FF",
  secondary: "#505F76",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#D0E1FB",
  onSecondaryContainer: "#54647A",
  tertiary: "#2D3449",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#434B60",
  onTertiaryContainer: "#B4BBD5",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#93000A",
  background: "#F7F9FB",
  onBackground: "#191C1E",
  surfaceVariant: "#E0E3E5",
  cardBorder: "#E2E8F0",
  success: "#166534",
  successContainer: "#DCFCE7",
  warning: "#B45309",
  warningContainer: "#FEF3C7",
} as const;

export const skillStream = {
  background: "#F7F9FB",
  elevated: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E2E8F0",
  coral: "#00288E",
  coralDeep: "#1E40AF",
  paleBlue: "#D0E1FB",
  text: "#191C1E",
  textSecondary: "#444653",
  muted: "#64748B",
  success: "#166534",
  warning: "#B45309",
} as const;

export const colors = {
  surface: modernAcademic.background,
  text: modernAcademic.onSurface,
  textSecondary: modernAcademic.onSurfaceVariant,
  muted: "#64748B",
  white: "#FFFFFF",
  amber: modernAcademic.warning,
  orange: "#C2410C",
  red: modernAcademic.error,
  blue: modernAcademic.surfaceTint,
  blueDeep: modernAcademic.primaryContainer,
  green: modernAcademic.success,
  greenDeep: "#14532D",
  purple: modernAcademic.tertiaryContainer,
  purpleDeep: modernAcademic.tertiary,
  indigo: modernAcademic.primary,
  violet: modernAcademic.primaryContainer,
  border: modernAcademic.cardBorder,
  paleRed: modernAcademic.errorContainer,
  paleOrange: "#FFEDD5",
  paleAmber: modernAcademic.warningContainer,
  paleBlue: modernAcademic.secondaryContainer,
  paleGreen: modernAcademic.successContainer,
  paleIndigo: "#DDE1FF",
  palePurple: "#DAE2FD",
  primary: modernAcademic.primary,
  primaryContainer: modernAcademic.primaryContainer,
  background: modernAcademic.background,
  card: modernAcademic.surfaceContainerLowest,
  containerLow: modernAcademic.surfaceContainerLow,
  container: modernAcademic.surfaceContainer,
  outline: modernAcademic.outline,
  outlineVariant: modernAcademic.outlineVariant,
};

export const gradients = {
  classes: [modernAcademic.primary, modernAcademic.primaryContainer],
  assessments: [modernAcademic.primaryContainer, modernAcademic.surfaceTint],
  ja: [modernAcademic.primary, modernAcademic.tertiaryContainer],
  announcements: [modernAcademic.secondary, modernAcademic.primaryContainer],
  profile: [modernAcademic.tertiary, modernAcademic.primary],
  // Compatibility aliases while migrating older screens.
  lessons: [colors.amber, colors.orange],
  lxp: [colors.indigo, colors.violet],
  progress: [colors.green, colors.greenDeep],
} as const;

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  } satisfies ViewStyle,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 12,
  xxl: 16,
  header: 16,
};

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => value + value)
          .join("")
      : normalized;
  const bigint = Number.parseInt(fullHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
