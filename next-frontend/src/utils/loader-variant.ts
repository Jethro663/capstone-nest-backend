export type LoaderVariant = 'student' | 'calm';

export function resolveLoaderVariant(pathname?: string | null): LoaderVariant {
  if (!pathname) return 'calm';
  if (pathname.startsWith('/dashboard/student')) return 'student';
  return 'calm';
}

