export const CLASS_CARD_PRESETS = [
  { id: 'oceanic-blue', label: 'Oceanic Blue', colors: ['#2c4fdd', '#3d63f1'] },
  { id: 'emerald-wave', label: 'Emerald Wave', colors: ['#069f77', '#11b68d'] },
  { id: 'violet-burst', label: 'Violet Burst', colors: ['#7f22f0', '#9944f5'] },
  { id: 'sunset-orange', label: 'Sunset Orange', colors: ['#d66a1e', '#f08d2d'] },
  { id: 'rose-dusk', label: 'Rose Dusk', colors: ['#d42756', '#ef5f87'] },
  { id: 'slate-night', label: 'Slate Night', colors: ['#1d304f', '#2e4a73'] },
] as const;

export function getPresetColors(presetId?: string | null): string[] {
  if (!presetId) return CLASS_CARD_PRESETS[0].colors as unknown as string[];
  const found = CLASS_CARD_PRESETS.find(p => p.id === presetId);
  return (found ? found.colors : CLASS_CARD_PRESETS[0].colors) as unknown as string[];
}
