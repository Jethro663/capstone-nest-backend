'use client';

import {
  useCallback,
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
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    if (!isHydrated) return;
    setThemeState(
      normalizeThemeId(window.localStorage.getItem(THEME_STORAGE_KEY)) ?? DEFAULT_THEME,
    );
  }, [isHydrated]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.studentRoute = String(isStudentRoute);

    if (isHydrated) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [isHydrated, isStudentRoute, theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    setThemeState(nextTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: getThemeDefinition(theme),
      themes: THEME_OPTIONS,
      isHydrated,
      setTheme,
    }),
    [isHydrated, setTheme, theme],
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
