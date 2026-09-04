export type CampusLoginLayout = {
  mode: "stacked" | "split";
  compact: boolean;
  heroHeight: number;
};

export function resolveCampusLoginLayout({
  width,
  height,
  keyboardVisible,
}: {
  width: number;
  height: number;
  keyboardVisible: boolean;
}): CampusLoginLayout {
  if (width >= 768) {
    return { mode: "split", compact: false, heroHeight: height };
  }
  if (keyboardVisible) {
    return { mode: "stacked", compact: true, heroHeight: 118 };
  }
  if (height < 700) {
    return { mode: "stacked", compact: true, heroHeight: 190 };
  }
  return {
    mode: "stacked",
    compact: false,
    heroHeight: Math.min(340, Math.max(280, Math.floor(height * 0.38))),
  };
}
