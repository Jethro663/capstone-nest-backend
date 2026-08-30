import {
  resolveStudentCoursePresentation,
  STUDENT_COURSE_PRESENTATION_OPTIONS,
} from './student-course-presentation';

const EXPECTED_LABELS = new Map([
  ['solid-blue', 'Navy Solid'],
  ['solid-green', 'Campus Red'],
  ['solid-violet', 'Deep Navy'],
  ['gradient-blue', 'Navy Gradient'],
  ['gradient-green', 'Red to Navy'],
  ['gradient-violet', 'Navy to Red'],
  ['preset-blue', 'Navy Stripe'],
  ['preset-green', 'Red Band'],
  ['preset-violet', 'Campus Split'],
]);

const APPROVED_COLORS = new Set([
  '#0c1d3a',
  '#172944',
  '#ff0011',
  '#d90d1d',
  '#ffffff',
]);

describe('student course presentation compatibility', () => {
  it('keeps every persisted token while relabeling it for the canonical palette', () => {
    const choices = Object.values(STUDENT_COURSE_PRESENTATION_OPTIONS).flat();

    expect(choices).toHaveLength(EXPECTED_LABELS.size);
    for (const choice of choices) {
      expect(choice.label).toBe(EXPECTED_LABELS.get(choice.token));
    }
  });

  it('uses only approved canonical colors in every presentation treatment', () => {
    const choices = Object.values(STUDENT_COURSE_PRESENTATION_OPTIONS).flat();

    for (const choice of choices) {
      const renderedValues = [choice.background, choice.accent, choice.buttonTint];
      const colors = renderedValues.flatMap(
        (value) => value.match(/#[0-9a-f]{6}/gi) ?? [],
      );

      expect(colors.length).toBeGreaterThan(0);
      for (const color of colors) {
        expect(APPROVED_COLORS).toContain(color.toLowerCase());
      }
    }
  });

  it('always uses the canonical navy fallback instead of index-based rotation', () => {
    expect(resolveStudentCoursePresentation(undefined, undefined, 0).token).toBe(
      'gradient-blue',
    );
    expect(resolveStudentCoursePresentation(undefined, undefined, 8).token).toBe(
      'gradient-blue',
    );
  });
});
