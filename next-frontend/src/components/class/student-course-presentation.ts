'use client';

import type { CSSProperties } from 'react';
import type { StudentClassPresentationMode } from '@/types/class';
import {
  getFallbackGradient,
  getGradientOption,
  type CardGradientId,
} from './class-card-theme';

export interface StudentCoursePresentationChoice {
  mode: StudentClassPresentationMode;
  token: string;
  label: string;
  background: string;
  accent: string;
  buttonTint: string;
}

const SOLID_CHOICES: StudentCoursePresentationChoice[] = [
  {
    mode: 'solid',
    token: 'solid-blue',
    label: 'Blue Solid',
    background: '#3159eb',
    accent: '#2d50df',
    buttonTint: 'rgba(24, 46, 172, 0.92)',
  },
  {
    mode: 'solid',
    token: 'solid-green',
    label: 'Green Solid',
    background: '#0aa781',
    accent: '#0f9d7c',
    buttonTint: 'rgba(6, 110, 86, 0.92)',
  },
  {
    mode: 'solid',
    token: 'solid-violet',
    label: 'Violet Solid',
    background: '#8a2bef',
    accent: '#8a20ed',
    buttonTint: 'rgba(89, 24, 160, 0.92)',
  },
];

const GRADIENT_CHOICES: StudentCoursePresentationChoice[] = [
  {
    mode: 'gradient',
    token: 'gradient-blue',
    label: 'Blue Gradient',
    background: getGradientOption('oceanic-blue').background,
    accent: getGradientOption('oceanic-blue').accent,
    buttonTint: getGradientOption('oceanic-blue').buttonTint,
  },
  {
    mode: 'gradient',
    token: 'gradient-green',
    label: 'Green Gradient',
    background: getGradientOption('emerald-wave').background,
    accent: getGradientOption('emerald-wave').accent,
    buttonTint: getGradientOption('emerald-wave').buttonTint,
  },
  {
    mode: 'gradient',
    token: 'gradient-violet',
    label: 'Violet Gradient',
    background: getGradientOption('violet-burst').background,
    accent: getGradientOption('violet-burst').accent,
    buttonTint: getGradientOption('violet-burst').buttonTint,
  },
];

const PRESET_CHOICES: StudentCoursePresentationChoice[] = [
  {
    mode: 'preset',
    token: 'preset-blue',
    label: 'Blueprint',
    background:
      'linear-gradient(140deg, rgba(36,84,229,1) 0%, rgba(61,99,241,1) 42%, rgba(31,67,196,1) 100%)',
    accent: '#2d50df',
    buttonTint: 'rgba(24, 46, 172, 0.92)',
  },
  {
    mode: 'preset',
    token: 'preset-green',
    label: 'Lab Grid',
    background:
      'linear-gradient(140deg, rgba(10,163,126,1) 0%, rgba(17,182,141,1) 44%, rgba(6,129,102,1) 100%)',
    accent: '#0f9d7c',
    buttonTint: 'rgba(6, 110, 86, 0.92)',
  },
  {
    mode: 'preset',
    token: 'preset-violet',
    label: 'Study Glow',
    background:
      'linear-gradient(140deg, rgba(133,35,241,1) 0%, rgba(153,68,245,1) 44%, rgba(100,33,190,1) 100%)',
    accent: '#8a20ed',
    buttonTint: 'rgba(89, 24, 160, 0.92)',
  },
];

export const STUDENT_COURSE_PRESENTATION_OPTIONS: Record<
  StudentClassPresentationMode,
  StudentCoursePresentationChoice[]
> = {
  solid: SOLID_CHOICES,
  gradient: GRADIENT_CHOICES,
  preset: PRESET_CHOICES,
};

const FALLBACK_TOKEN_BY_GRADIENT: Record<CardGradientId, string> = {
  'oceanic-blue': 'gradient-blue',
  'emerald-wave': 'gradient-green',
  'violet-burst': 'gradient-violet',
  'sunset-orange': 'gradient-blue',
  'rose-dusk': 'gradient-violet',
  'slate-night': 'gradient-blue',
};

export function resolveStudentCoursePresentation(
  mode: StudentClassPresentationMode | undefined,
  token: string | undefined,
  index = 0,
): StudentCoursePresentationChoice {
  if (mode && token) {
    const options = STUDENT_COURSE_PRESENTATION_OPTIONS[mode];
    const matched = options.find((entry) => entry.token === token);
    if (matched) return matched;
  }

  const fallbackGradient = getFallbackGradient(index);
  const fallbackToken = FALLBACK_TOKEN_BY_GRADIENT[fallbackGradient];
  return (
    GRADIENT_CHOICES.find((entry) => entry.token === fallbackToken) ??
    GRADIENT_CHOICES[0]
  );
}

export function toStudentHeroStyle(
  choice: StudentCoursePresentationChoice,
): CSSProperties {
  return { background: choice.background };
}
