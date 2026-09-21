import { colors } from "./tokens";
import { mobileBrand } from "./mobileBrand";

export const adminTheme = {
  bg: mobileBrand.canvas,
  topbar: mobileBrand.navy,
  surface: mobileBrand.surface,
  surfaceMuted: mobileBrand.surfaceMuted,
  selection: mobileBrand.redSoft,
  border: mobileBrand.border,
  borderStrong: mobileBrand.borderStrong,
  text: mobileBrand.text,
  subtext: mobileBrand.muted,
  muted: mobileBrand.muted,
  dim: mobileBrand.dim,
  primary: mobileBrand.red,
  primaryPressed: mobileBrand.redPressed,
  primarySoft: mobileBrand.redSoft,
  green: colors.green,
  greenSoft: colors.paleGreen,
  amber: colors.amber,
  amberSoft: colors.paleAmber,
  red: colors.red,
  redSoft: colors.paleRed,
  purple: colors.purple,
  purpleSoft: colors.palePurple,
} as const;
