import { colors, modernAcademic } from "./tokens";

export const studentDarkTheme = {
  bg: modernAcademic.background,
  pageBg: modernAcademic.background,
  header: modernAcademic.surfaceContainerLowest,
  topbar: modernAcademic.surfaceContainerLowest,
  surface: modernAcademic.surfaceContainerLowest,
  surface2: modernAcademic.surfaceContainerLow,
  active: modernAcademic.surfaceContainerLow,
  channel: modernAcademic.surfaceContainerLow,
  border: colors.border,
  border2: modernAcademic.outlineVariant,
  text: modernAcademic.onSurface,
  muted: "#64748B",
  dim: modernAcademic.outline,
  subtext: modernAcademic.onSurfaceVariant,
  red: modernAcademic.primary,
  blue: modernAcademic.primaryContainer,
  green: colors.green,
  purple: modernAcademic.tertiaryContainer,
  amber: colors.amber,
  redSoft: "#DDE1FF",
  redLine: "rgba(0,40,142,0.22)",
  redText: modernAcademic.primary,
  blueSoft: modernAcademic.secondaryContainer,
  blueLine: "rgba(30,64,175,0.22)",
  greenSoft: colors.paleGreen,
  greenLine: "rgba(22,101,52,0.22)",
  purpleSoft: colors.palePurple,
  amberSoft: colors.paleAmber,
  deepBlue: modernAcademic.primary,
  deepNavy: modernAcademic.onSurface,
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
