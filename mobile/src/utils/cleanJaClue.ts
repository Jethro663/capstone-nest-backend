export function cleanJaClueText(value: string | null | undefined): string {
  if (!value) return "";
  let text = String(value);
  if (text.includes("\\u")) {
    text = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    });
  }
  text = text.replace(/\s*\|\s*(?:block|lesson|question|chunk):[^\s\|)]+/gi, "");
  text = text.replace(/\(([^)]+)\)\s*\(\1\)/g, "($1)");
  text = text.replace(/\(\s*\|\s*\)/g, "");
  text = text.replace(/\(\s*\)/g, "");
  text = text.replace(/\s*\|\s*/g, " ");
  return text.replace(/\s+/g, " ").trim();
}
