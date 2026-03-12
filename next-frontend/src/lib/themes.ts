'use client';

export type ThemeId =
  | 'nexora-red'
  | 'dark'
  | 'soft-ocean'
  | 'dark-void'
  | 'candy-land'
  | 'fairy-land'
  | 'sunset'
  | 'aurora-borealis'
  | 'stone-mountain';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  preview: [string, string, string];
}

export const THEME_STORAGE_KEY = 'nexora-student-theme';
export const DEFAULT_THEME: ThemeId = 'nexora-red';

export const THEME_OPTIONS: ThemeDefinition[] = [
  {
    id: 'nexora-red',
    label: 'Nexora Red',
    description: 'The current warm campus palette with vivid red accents.',
    preview: ['#fff7f7', '#ef4444', '#0f172a'],
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'A cinematic dark mode with cool slate contrast.',
    preview: ['#111827', '#38bdf8', '#f8fafc'],
  },
  {
    id: 'soft-ocean',
    label: 'Soft Ocean',
    description: 'A calm blue-green palette with airy surfaces.',
    preview: ['#effbff', '#0f766e', '#164e63'],
  },
  {
    id: 'dark-void',
    label: 'Dark Void',
    description: 'A deep space theme with cosmic purple accents and neon highlights.',
    preview: ['#0a0a0a', '#a855f7', '#f1f5f9'],
  },
  {
    id: 'candy-land',
    label: 'Candy Land',
    description: 'A vibrant, playful theme with pastel colors and sweet pastel accents.',
    preview: ['#fff8f0', '#ff6b6b', '#2d3748'],
  },
  {
    id: 'fairy-land',
    label: 'Fairy Land',
    description: 'A magical theme with ethereal pastels and sparkling gold accents.',
    preview: ['#fdf6ff', '#f59e0b', '#4f46e5'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'A warm theme with gradient oranges, pinks, and deep purples.',
    preview: ['#fff7ed', '#f97316', '#1f2937'],
  },
  {
    id: 'aurora-borealis',
    label: 'Aurora Borealis',
    description: 'Mesmerizing northern lights with dancing greens and blues.',
    preview: ['#0a1628', '#00d9ff', '#00ff88'],
  },
  {
    id: 'stone-mountain',
    label: 'Stone Mountain',
    description: 'Earthy grays and browns inspired by mountain landscapes.',
    preview: ['#f5ede0', '#8b7355', '#3d3d3d'],
  },
];

const THEME_ALIASES: Record<string, ThemeId> = {
  'stony-mountain': 'stone-mountain',
  'stone mountain': 'stone-mountain',
  'aurora borealis': 'aurora-borealis',
  'aurora_borealis': 'aurora-borealis',
};

export function normalizeThemeId(value: string | null | undefined): ThemeId | null {
  if (!value) return null;
  if (isThemeId(value)) return value;
  return THEME_ALIASES[value] ?? null;
}

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId) {
  return THEME_OPTIONS.find((theme) => theme.id === themeId) ?? THEME_OPTIONS[0];
}
