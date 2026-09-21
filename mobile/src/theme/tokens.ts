import type { ViewStyle } from "react-native";
import { mobileBrand } from "./mobileBrand";

export const modernAcademic = {
  surface: mobileBrand.canvas,
  surfaceDim: mobileBrand.borderStrong,
  surfaceBright: mobileBrand.surface,
  surfaceContainerLowest: mobileBrand.surface,
  surfaceContainerLow: mobileBrand.surface,
  surfaceContainer: mobileBrand.surfaceMuted,
  surfaceContainerHigh: mobileBrand.border,
  surfaceContainerHighest: mobileBrand.borderStrong,
  onSurface: mobileBrand.text,
  onSurfaceVariant: mobileBrand.muted,
  inverseSurface: mobileBrand.navy,
  inverseOnSurface: mobileBrand.inverseForeground,
  outline: mobileBrand.dim,
  outlineVariant: mobileBrand.borderStrong,
  surfaceTint: mobileBrand.red,
  primary: mobileBrand.navy,
  onPrimary: mobileBrand.inverseForeground,
  primaryContainer: mobileBrand.navyRaised,
  onPrimaryContainer: mobileBrand.inverseForeground,
  inversePrimary: mobileBrand.infoBorder,
  secondary: mobileBrand.navyRaised,
  onSecondary: mobileBrand.inverseForeground,
  secondaryContainer: mobileBrand.navySoft,
  onSecondaryContainer: mobileBrand.navy,
  tertiary: mobileBrand.navy,
  onTertiary: mobileBrand.inverseForeground,
  tertiaryContainer: mobileBrand.navyRaised,
  onTertiaryContainer: mobileBrand.inverseForeground,
  error: mobileBrand.danger,
  onError: mobileBrand.inverseForeground,
  errorContainer: mobileBrand.redSoft,
  onErrorContainer: mobileBrand.redPressed,
  background: mobileBrand.canvas,
  onBackground: mobileBrand.text,
  surfaceVariant: mobileBrand.surfaceMuted,
  cardBorder: mobileBrand.border,
  success: mobileBrand.success,
  successContainer: mobileBrand.successSoft,
  warning: mobileBrand.warning,
  warningContainer: mobileBrand.warningSoft,
} as const;

export const skillStream = {
  background: mobileBrand.canvas,
  elevated: mobileBrand.surface,
  card: mobileBrand.surface,
  border: mobileBrand.border,
  coral: mobileBrand.red,
  coralDeep: mobileBrand.redPressed,
  paleBlue: mobileBrand.navySoft,
  text: mobileBrand.text,
  textSecondary: mobileBrand.muted,
  muted: mobileBrand.dim,
  success: mobileBrand.success,
  warning: mobileBrand.warning,
} as const;

export const colors = {
  surface: modernAcademic.background,
  text: modernAcademic.onSurface,
  textSecondary: modernAcademic.onSurfaceVariant,
  muted: mobileBrand.dim,
  white: mobileBrand.inverseForeground,
  amber: modernAcademic.warning,
  orange: mobileBrand.warning,
  red: modernAcademic.error,
  blue: mobileBrand.info,
  blueDeep: modernAcademic.primaryContainer,
  green: modernAcademic.success,
  greenDeep: mobileBrand.success,
  purple: modernAcademic.tertiaryContainer,
  purpleDeep: modernAcademic.tertiary,
  indigo: modernAcademic.primary,
  violet: modernAcademic.primaryContainer,
  border: modernAcademic.cardBorder,
  paleRed: modernAcademic.errorContainer,
  paleOrange: mobileBrand.warningSoft,
  paleAmber: modernAcademic.warningContainer,
  paleBlue: modernAcademic.secondaryContainer,
  paleGreen: modernAcademic.successContainer,
  paleIndigo: mobileBrand.infoSoft,
  palePurple: mobileBrand.infoSoft,
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
    shadowColor: mobileBrand.navy,
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
