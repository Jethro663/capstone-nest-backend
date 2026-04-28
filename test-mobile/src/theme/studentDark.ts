export const studentDarkTheme = {
  bg: "#141414",
  header: "#1A1A1A",
  surface: "#1E1E1E",
  active: "#252525",
  border: "rgba(255,255,255,0.07)",
  text: "#E8E8E8",
  muted: "#777777",
  dim: "#444444",
  red: "#E8294E",
  blue: "#4A8CF7",
  green: "#22C97A",
  purple: "#A78BFA",
  amber: "#FBBF24",
  redSoft: "rgba(232,41,78,0.14)",
  blueSoft: "rgba(74,140,247,0.14)",
  greenSoft: "rgba(34,201,122,0.14)",
  purpleSoft: "rgba(167,139,250,0.14)",
  amberSoft: "rgba(251,191,36,0.14)",
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

