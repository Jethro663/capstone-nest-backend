'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_THEME,
  getThemeDefinition,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  type ThemeDefinition,
  type ThemeId,
} from '@/lib/themes';

interface ThemeContextValue {
  theme: ThemeId;
  resolvedTheme: ThemeDefinition;
  themes: ThemeDefinition[];
  isHydrated: boolean;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const isStudentRoute = pathname.startsWith('/dashboard/student');

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = DEFAULT_THEME;
    root.dataset.studentRoute = String(isStudentRoute);

    if (isHydrated) {
      window.localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
    }
  }, [isHydrated, isStudentRoute]);

  const setTheme = (_nextTheme: ThemeId) => undefined;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: DEFAULT_THEME,
      resolvedTheme: getThemeDefinition(DEFAULT_THEME),
      themes: THEME_OPTIONS.filter((themeOption) => themeOption.id === DEFAULT_THEME),
      isHydrated,
      setTheme,
    }),
    [isHydrated],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
