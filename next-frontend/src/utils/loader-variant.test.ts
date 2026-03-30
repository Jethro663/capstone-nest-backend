import { resolveLoaderVariant } from './loader-variant';

describe('resolveLoaderVariant', () => {
  it('returns student for student dashboard routes', () => {
    expect(resolveLoaderVariant('/dashboard/student/courses')).toBe('student');
  });

  it('returns calm for non-student routes', () => {
    expect(resolveLoaderVariant('/dashboard/teacher/classes')).toBe('calm');
    expect(resolveLoaderVariant('/dashboard/admin')).toBe('calm');
    expect(resolveLoaderVariant('/login')).toBe('calm');
  });

  it('returns calm when pathname is missing', () => {
    expect(resolveLoaderVariant(undefined)).toBe('calm');
    expect(resolveLoaderVariant(null)).toBe('calm');
  });
});

