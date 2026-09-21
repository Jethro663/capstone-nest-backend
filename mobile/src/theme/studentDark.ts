import { mobileBrand } from "./mobileBrand";

export const studentDarkTheme = {
  bg: mobileBrand.canvas,
  pageBg: mobileBrand.canvas,
  header: mobileBrand.navy,
  topbar: mobileBrand.navy,
  surface: "#FFFFFF",
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
  purple: "#6F5A94",
  amber: mobileBrand.warning,
  redSoft: mobileBrand.redSoft,
  redLine: "rgba(220,38,38,0.22)",
  redText: mobileBrand.red,
  blueSoft: "#E8EDF5",
  blueLine: "rgba(12,29,58,0.22)",
  greenSoft: mobileBrand.successSoft,
  greenLine: "rgba(21,128,61,0.22)",
  purpleSoft: "#F5F0F6",
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
