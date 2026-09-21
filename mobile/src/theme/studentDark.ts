import { mobileBrand } from "./mobileBrand";

export const studentDarkTheme = {
  bg: mobileBrand.canvas,
  pageBg: mobileBrand.canvas,
  header: mobileBrand.navy,
  topbar: mobileBrand.navy,
  surface: mobileBrand.surface,
  surface2: mobileBrand.surfaceMuted,
  active: mobileBrand.surfaceMuted,
  channel: mobileBrand.surfaceMuted,
  border: mobileBrand.border,
  border2: mobileBrand.borderStrong,
  text: mobileBrand.text,
  muted: mobileBrand.muted,
  dim: mobileBrand.dim,
  subtext: mobileBrand.muted,
  red: mobileBrand.red,
  blue: mobileBrand.navy,
  green: mobileBrand.success,
  purple: mobileBrand.info,
  amber: mobileBrand.warning,
  redSoft: mobileBrand.redSoft,
  redLine: mobileBrand.dangerBorder,
  redText: mobileBrand.red,
  blueSoft: mobileBrand.navySoft,
  blueLine: mobileBrand.infoBorder,
  greenSoft: mobileBrand.successSoft,
  greenLine: mobileBrand.successBorder,
  purpleSoft: mobileBrand.navySoft,
  amberSoft: mobileBrand.warningSoft,
  deepBlue: mobileBrand.navy,
  deepNavy: mobileBrand.navy,
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
