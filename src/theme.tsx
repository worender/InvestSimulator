import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

export type ThemeMode = 'dark' | 'light';

const darkColors = {
  background: '#0d1117',
  surface: '#161b22',
  surfaceMuted: '#21262d',
  border: '#30363d',
  text: '#f0f6fc',
  textMuted: '#8b949e',
  accent: '#58a6ff',
  positive: '#3fb950',
  negative: '#f85149',
  warning: '#d29922',
};

const lightColors = {
  background: '#ffffff',
  surface: '#f6f8fa',
  surfaceMuted: '#eaeef2',
  border: '#d0d7de',
  text: '#1f2328',
  textMuted: '#656d76',
  accent: '#0969da',
  positive: '#1a7f37',
  negative: '#cf222e',
  warning: '#9a6700',
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: typeof darkColors;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const colors = mode === 'dark' ? darkColors : lightColors;
  const value = useMemo(
    () => ({ mode, colors, toggleMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')) }),
    [mode, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return theme;
}
