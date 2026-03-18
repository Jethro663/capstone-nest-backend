export type ClassCardPresetId =
  | 'aurora'
  | 'sunset'
  | 'ember'
  | 'ocean'
  | 'forest'
  | 'midnight';

export const CLASS_CARD_PRESETS: Array<{
  id: ClassCardPresetId;
  label: string;
  accent: string;
  surfaceClass: string;
  bannerClass: string;
}> = [
  {
    id: 'aurora',
    label: 'Aurora',
    accent: '#0f766e',
    surfaceClass: 'bg-white border-slate-200',
    bannerClass: 'bg-[linear-gradient(135deg,#0f766e_0%,#34d399_45%,#d1fae5_100%)]',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    accent: '#c2410c',
    surfaceClass: 'bg-white border-orange-200',
    bannerClass: 'bg-[linear-gradient(135deg,#7c2d12_0%,#ea580c_45%,#fdba74_100%)]',
  },
  {
    id: 'ember',
    label: 'Ember',
    accent: '#b91c1c',
    surfaceClass: 'bg-white border-rose-200',
    bannerClass: 'bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_48%,#fecaca_100%)]',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    accent: '#0369a1',
    surfaceClass: 'bg-white border-sky-200',
    bannerClass: 'bg-[linear-gradient(135deg,#0c4a6e_0%,#0284c7_45%,#bae6fd_100%)]',
  },
  {
    id: 'forest',
    label: 'Forest',
    accent: '#166534',
    surfaceClass: 'bg-white border-emerald-200',
    bannerClass: 'bg-[linear-gradient(135deg,#14532d_0%,#16a34a_48%,#bbf7d0_100%)]',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    accent: '#4338ca',
    surfaceClass: 'bg-white border-indigo-200',
    bannerClass: 'bg-[linear-gradient(135deg,#111827_0%,#312e81_50%,#818cf8_100%)]',
  },
];

export function getClassCardPreset(preset?: string | null) {
  return (
    CLASS_CARD_PRESETS.find((entry) => entry.id === preset) ??
    CLASS_CARD_PRESETS[0]
  );
}
