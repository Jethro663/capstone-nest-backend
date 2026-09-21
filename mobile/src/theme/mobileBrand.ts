import type { ViewStyle } from "react-native";

export const mobileBrand = {
  navy: "#0C1D3A",
  navyRaised: "#14294B",
  red: "#DC2626",
  redPressed: "#B91C1C",
  redSoft: "#FEE2E2",
  canvas: "#F6F7F9",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F4F7",
  text: "#101828",
  muted: "#667085",
  dim: "#98A2B3",
  border: "#E4E7EC",
  borderStrong: "#D0D5DD",
  success: "#15803D",
  successSoft: "#DCFCE7",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
  white: "#FFFFFF",
  minTarget: 44,
} as const;

export const mobileRadii = {
  control: 12,
  card: 16,
  hero: 20,
  sheet: 24,
  pill: 999,
} as const;

export const mobileSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export const mobileShadows = {
  card: {
    shadowColor: mobileBrand.navy,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  } satisfies ViewStyle,
} as const;

