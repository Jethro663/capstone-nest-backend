import { colors } from "./tokens";

export const studentDarkTheme = {
  bg: "#FBFAF8",
  pageBg: "#FBFAF8",
  header: "#FFFFFF",
  topbar: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#FFF5F2",
  active: "#FFF5F2",
  channel: "#FFF5F2",
  border: "#E7E3DF",
  border2: "#DFC8C3",
  text: "#0F172A",
  muted: "#64748B",
  dim: "#94A3B8",
  subtext: "#475569",
  red: "#C96B68",
  blue: "#416A8A",
  green: colors.green,
  purple: "#6F5A94",
  amber: colors.amber,
  redSoft: "#FFF5F2",
  redLine: "rgba(201,107,104,0.24)",
  redText: "#98484A",
  blueSoft: "#EDF4F8",
  blueLine: "rgba(65,106,138,0.22)",
  greenSoft: colors.paleGreen,
  greenLine: "rgba(22,101,52,0.22)",
  purpleSoft: "#F5F0F6",
  amberSoft: colors.paleAmber,
  deepBlue: "#98484A",
  deepNavy: "#0F172A",
} as const;

const entityMap: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

export function stripRichText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&([a-z]+);/gi, (_, entity: string) => entityMap[entity.toLowerCase()] ?? " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
