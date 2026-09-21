import { mobileBrand } from "../theme/mobileBrand";
export const CLASS_CARD_PRESETS = [
  { id: 'oceanic-blue', label: 'GABHS Navy', colors: [mobileBrand.navy, mobileBrand.navyRaised] },
  { id: 'emerald-wave', label: 'Navy and Red', colors: [mobileBrand.navy, mobileBrand.red] },
  { id: 'violet-burst', label: 'Academic Blue', colors: [mobileBrand.navyRaised, mobileBrand.info] },
  { id: 'sunset-orange', label: 'Signal Red', colors: [mobileBrand.red, mobileBrand.redPressed] },
  { id: 'rose-dusk', label: 'Clean Slate', colors: [mobileBrand.muted, mobileBrand.navy] },
  { id: 'slate-night', label: 'Night Navy', colors: [mobileBrand.navyRaised, mobileBrand.navy] },
] as const;

export function getPresetColors(presetId?: string | null): string[] {
  if (!presetId) return CLASS_CARD_PRESETS[0].colors as unknown as string[];
  const found = CLASS_CARD_PRESETS.find(p => p.id === presetId);
  return (found ? found.colors : CLASS_CARD_PRESETS[0].colors) as unknown as string[];
}
