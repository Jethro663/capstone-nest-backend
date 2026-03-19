import type { ViewStyle } from "react-native";

export const colors = {
  surface: "#F8F9FF",
  text: "#1F2937",
  textSecondary: "#6B7280",
  muted: "#9CA3AF",
  white: "#FFFFFF",
  amber: "#FFB830",
  orange: "#FF8C42",
  red: "#FF6B6B",
  blue: "#60C3F5",
  blueDeep: "#4A8CF5",
  green: "#4CAF50",
  greenDeep: "#2E7D32",
  purple: "#A855F7",
  purpleDeep: "#7C3AED",
  indigo: "#667EEA",
  violet: "#764BA2",
  border: "#E5E7EB",
  paleRed: "#FFF0F0",
  paleOrange: "#FFF5F0",
  paleAmber: "#FFF8E7",
  paleBlue: "#EFF9FF",
  paleGreen: "#F0FFF0",
  paleIndigo: "#F0F4FF",
  palePurple: "#F8F0FF",
};

export const gradients = {
  lessons: [colors.amber, colors.orange],
  assessments: [colors.blue, colors.blueDeep],
  lxp: [colors.indigo, colors.violet],
  progress: [colors.green, colors.greenDeep],
  profile: [colors.purple, colors.purpleDeep],
} as const;

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  } satisfies ViewStyle,
};

export const radii = {
  xl: 20,
  xxl: 24,
  header: 32,
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
