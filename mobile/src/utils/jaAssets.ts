export type JaVisualState = "idle" | "thinking" | "success" | "warning" | "blocked";

const assets = {
  idle: { assetName: "ja_wave.png", getSource: () => require("../../assets/ja/ja_wave.png") },
  thinking: { assetName: "ja_thinking.png", getSource: () => require("../../assets/ja/ja_thinking.png") },
  success: { assetName: "ja_cheer.png", getSource: () => require("../../assets/ja/ja_cheer.png") },
  warning: { assetName: "ja_shock.png", getSource: () => require("../../assets/ja/ja_shock.png") },
  blocked: { assetName: "ja_sad.png", getSource: () => require("../../assets/ja/ja_sad.png") },
} as const;

export function resolveJaAvatar(state: JaVisualState) {
  return assets[state] ?? assets.idle;
}

export function resolveJaStateFromMessage(message?: {
  blocked?: boolean;
  insufficientEvidence?: boolean;
  content?: string;
} | null): JaVisualState {
  if (!message) return "idle";
  if (message.blocked || message.insufficientEvidence) return "blocked";
  const content = message.content?.toLowerCase() ?? "";
  if (content.includes("cannot") || content.includes("not enough") || content.includes("need more")) return "warning";
  return "success";
}
