'use client';

import type { CSSProperties } from 'react';
import type { StudentClassPresentationMode } from '@/types/class';

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
    label: 'Navy Solid',
    background: '#0c1d3a',
    accent: '#172944',
    buttonTint: '#172944',
  },
  {
    mode: 'solid',
    token: 'solid-green',
    label: 'Campus Red',
    background: '#d90d1d',
    accent: '#ff0011',
    buttonTint: '#0c1d3a',
  },
  {
    mode: 'solid',
    token: 'solid-violet',
    label: 'Deep Navy',
    background: '#172944',
    accent: '#0c1d3a',
    buttonTint: '#0c1d3a',
  },
];

const GRADIENT_CHOICES: StudentCoursePresentationChoice[] = [
  {
    mode: 'gradient',
    token: 'gradient-blue',
    label: 'Navy Gradient',
    background: 'linear-gradient(135deg, #0c1d3a 0%, #172944 100%)',
    accent: '#172944',
    buttonTint: '#0c1d3a',
  },
  {
    mode: 'gradient',
    token: 'gradient-green',
    label: 'Red to Navy',
    background: 'linear-gradient(135deg, #d90d1d 0%, #0c1d3a 100%)',
    accent: '#ff0011',
    buttonTint: '#0c1d3a',
  },
  {
    mode: 'gradient',
    token: 'gradient-violet',
    label: 'Navy to Red',
    background: 'linear-gradient(135deg, #0c1d3a 0%, #d90d1d 100%)',
    accent: '#d90d1d',
    buttonTint: '#0c1d3a',
  },
];

const PRESET_CHOICES: StudentCoursePresentationChoice[] = [
  {
    mode: 'preset',
    token: 'preset-blue',
    label: 'Navy Stripe',
    background:
      'linear-gradient(135deg, #0c1d3a 0%, #0c1d3a 68%, #ff0011 68%, #ff0011 76%, #172944 76%, #172944 100%)',
    accent: '#ff0011',
    buttonTint: '#0c1d3a',
  },
  {
    mode: 'preset',
    token: 'preset-green',
    label: 'Red Band',
    background:
      'linear-gradient(180deg, #d90d1d 0%, #d90d1d 28%, #0c1d3a 28%, #0c1d3a 100%)',
    accent: '#ff0011',
    buttonTint: '#0c1d3a',
  },
  {
    mode: 'preset',
    token: 'preset-violet',
    label: 'Campus Split',
    background:
      'linear-gradient(110deg, #0c1d3a 0%, #0c1d3a 58%, #d90d1d 58%, #d90d1d 100%)',
    accent: '#d90d1d',
    buttonTint: '#0c1d3a',
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

export function resolveStudentCoursePresentation(
  mode: StudentClassPresentationMode | undefined,
  token: string | undefined,
  index = 0,
): StudentCoursePresentationChoice {
  void index;
  if (mode && token) {
    const options = STUDENT_COURSE_PRESENTATION_OPTIONS[mode];
    const matched = options.find((entry) => entry.token === token);
    if (matched) return matched;
  }

  return GRADIENT_CHOICES[0];
}

export function toStudentHeroStyle(
  choice: StudentCoursePresentationChoice,
): CSSProperties {
  return { background: choice.background };
}
