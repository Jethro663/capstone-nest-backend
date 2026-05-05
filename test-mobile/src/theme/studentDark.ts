export const studentDarkTheme = {
  bg: "#0A1630",
  header: "#0B1833",
  surface: "#0F2438",
  active: "#132D45",
  border: "rgba(0,217,255,0.18)",
  text: "#E0F7FF",
  muted: "#7AA3B8",
  dim: "#426478",
  red: "#E8294E",
  blue: "#00D9FF",
  green: "#22C97A",
  purple: "#A78BFA",
  amber: "#FBBF24",
  redSoft: "rgba(232,41,78,0.14)",
  blueSoft: "rgba(0,217,255,0.14)",
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
