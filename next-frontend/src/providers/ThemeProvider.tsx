'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_THEME,
  getThemeDefinition,
  isThemeId,
  normalizeThemeId,
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
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_THEME;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return normalizeThemeId(storedTheme) ?? DEFAULT_THEME;
  });
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const isStudentRoute = pathname.startsWith('/dashboard/student');

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = normalizeThemeId(theme) ?? DEFAULT_THEME;
    root.dataset.studentRoute = String(isStudentRoute);

    if (isHydrated) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [isHydrated, isStudentRoute, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: getThemeDefinition(theme),
      themes: THEME_OPTIONS,
      isHydrated,
      setTheme,
    }),
    [isHydrated, theme],
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
