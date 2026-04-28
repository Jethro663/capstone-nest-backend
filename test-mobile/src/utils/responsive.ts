export function resolveResponsiveLayout(width: number) {
  const isTablet = width >= 768;
  return {
    isTablet,
    horizontalPadding: isTablet ? 28 : 16,
    contentMaxWidth: isTablet ? 760 : Math.max(320, Math.round(width)),
    cardGap: isTablet ? 16 : 12,
    compactTextWidth: isTablet ? 620 : Math.max(280, Math.round(width - 40)),
  };
}
