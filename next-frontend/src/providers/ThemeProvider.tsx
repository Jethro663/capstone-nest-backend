'use client';

import {
  useCallback,
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
const THEME_STORE_EVENT = 'nexora-theme-change';

function subscribeToThemeStore(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(THEME_STORE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(THEME_STORE_EVENT, onStoreChange);
  };
}

function getThemeSnapshot(): ThemeId {
  return normalizeThemeId(window.localStorage.getItem(THEME_STORAGE_KEY)) ?? DEFAULT_THEME;
}

function getServerThemeSnapshot(): ThemeId {
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const theme = useSyncExternalStore(
    subscribeToThemeStore,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.studentRoute = String(isStudentRoute);

    if (isHydrated) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [isHydrated, isStudentRoute, theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_STORE_EVENT));
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
