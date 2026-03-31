'use client';

import type { CSSProperties } from 'react';

export type CardViewMode = 'card' | 'wide';
export type CardThemeKind = 'gradient' | 'image';
export type CardGradientId =
  | 'oceanic-blue'
  | 'emerald-wave'
  | 'violet-burst'
  | 'sunset-orange'
  | 'rose-dusk'
  | 'slate-night';

export interface ClassCardCustomization {
  themeKind: CardThemeKind;
  gradientId: CardGradientId;
  imageUrl: string | null;
  imagePositionX: number;
  imagePositionY: number;
  imageScale: number;
}

export interface GradientOption {
  id: CardGradientId;
  label: string;
  background: string;
  accent: string;
  buttonTint: string;
}

export const GRADIENT_OPTIONS: GradientOption[] = [
  {
    id: 'oceanic-blue',
    label: 'Oceanic Blue',
    background: 'linear-gradient(135deg, #2c4fdd 0%, #3d63f1 100%)',
    accent: '#3557e4',
    buttonTint: 'rgba(24, 46, 172, 0.92)',
  },
  {
    id: 'emerald-wave',
    label: 'Emerald Wave',
    background: 'linear-gradient(135deg, #069f77 0%, #11b68d 100%)',
    accent: '#0fa37f',
    buttonTint: 'rgba(6, 110, 86, 0.92)',
  },
  {
    id: 'violet-burst',
    label: 'Violet Burst',
    background: 'linear-gradient(135deg, #7f22f0 0%, #9944f5 100%)',
    accent: '#8f31f2',
    buttonTint: 'rgba(89, 24, 160, 0.92)',
  },
  {
    id: 'sunset-orange',
    label: 'Sunset Orange',
    background: 'linear-gradient(135deg, #d66a1e 0%, #f08d2d 100%)',
    accent: '#e07e26',
    buttonTint: 'rgba(130, 64, 18, 0.9)',
  },
  {
    id: 'rose-dusk',
    label: 'Rose Dusk',
    background: 'linear-gradient(135deg, #d42756 0%, #ef5f87 100%)',
    accent: '#df3f6b',
    buttonTint: 'rgba(123, 22, 56, 0.9)',
  },
  {
    id: 'slate-night',
    label: 'Slate Night',
    background: 'linear-gradient(135deg, #1d304f 0%, #2e4a73 100%)',
    accent: '#2a446a',
    buttonTint: 'rgba(10, 23, 44, 0.9)',
  },
];

export function getFallbackGradient(index: number): CardGradientId {
  const fallbackByIndex: CardGradientId[] = [
    'oceanic-blue',
    'emerald-wave',
    'violet-burst',
  ];
  return fallbackByIndex[index % fallbackByIndex.length];
}

export function createDefaultCustomization(
  gradientId: CardGradientId,
): ClassCardCustomization {
  return {
    themeKind: 'gradient',
    gradientId,
    imageUrl: null,
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 120,
  };
}

export function getGradientOption(gradientId: CardGradientId): GradientOption {
  return (
    GRADIENT_OPTIONS.find((option) => option.id === gradientId) ??
    GRADIENT_OPTIONS[0]
  );
}

function toCardGradientId(value: unknown, fallback: CardGradientId): CardGradientId {
  if (typeof value !== 'string') return fallback;
  return (
    (GRADIENT_OPTIONS.find((option) => option.id === value)?.id ??
      fallback) as CardGradientId
  );
}

function parseLegacyToneToGradient(
  value: unknown,
  fallback: CardGradientId,
): CardGradientId {
  if (value === 'blue') return 'oceanic-blue';
  if (value === 'green') return 'emerald-wave';
  if (value === 'violet') return 'violet-burst';
  return fallback;
}

export function normalizeCustomization(
  rawValue: unknown,
  fallbackGradient: CardGradientId,
): ClassCardCustomization {
  if (!rawValue || typeof rawValue !== 'object') {
    return createDefaultCustomization(fallbackGradient);
  }

  const value = rawValue as Partial<ClassCardCustomization> & { tone?: string };
  const gradientId =
    typeof value.gradientId === 'string'
      ? toCardGradientId(value.gradientId, fallbackGradient)
      : parseLegacyToneToGradient(value.tone, fallbackGradient);

  const normalizedImageUrl =
    typeof value.imageUrl === 'string' && !value.imageUrl.startsWith('data:')
      ? value.imageUrl
      : null;
  const themeKind: CardThemeKind =
    value.themeKind === 'image' &&
    typeof normalizedImageUrl === 'string' &&
    normalizedImageUrl.length > 0
      ? 'image'
      : 'gradient';

  const x =
    typeof value.imagePositionX === 'number'
      ? Math.min(Math.max(value.imagePositionX, 0), 100)
      : 50;
  const y =
    typeof value.imagePositionY === 'number'
      ? Math.min(Math.max(value.imagePositionY, 0), 100)
      : 50;
  const scale =
    typeof value.imageScale === 'number'
      ? Math.min(Math.max(value.imageScale, 100), 220)
      : 120;

  return {
    themeKind,
    gradientId,
    imageUrl: normalizedImageUrl,
    imagePositionX: x,
    imagePositionY: y,
    imageScale: scale,
  };
}

export function getHeroStyle(
  customization: ClassCardCustomization,
): CSSProperties {
  const gradient = getGradientOption(customization.gradientId).background;
  if (customization.themeKind === 'image' && customization.imageUrl) {
    return {
      backgroundImage: `linear-gradient(120deg, rgba(8, 23, 44, 0.34), rgba(8, 23, 44, 0.12)), url(${customization.imageUrl})`,
      backgroundSize: `${customization.imageScale}%`,
      backgroundPosition: `${customization.imagePositionX}% ${customization.imagePositionY}%`,
      backgroundRepeat: 'no-repeat',
    };
  }
  return { background: gradient };
}
