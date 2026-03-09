'use client';

export type ThemeId = 'nexora-red' | 'dark' | 'soft-ocean';

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
];

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId) {
  return THEME_OPTIONS.find((theme) => theme.id === themeId) ?? THEME_OPTIONS[0];
}
