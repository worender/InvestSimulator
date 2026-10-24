/**
 * Plik z definicją kontekstu motywu aplikacji, który przechowuje informacje o aktualnym trybie (ciemny/jasny), kolorach, akcentach, domyślnej walucie i innych ustawieniach wizualnych.
 * Zawiera również hook `useTheme`, który umożliwia komponentom dostęp do tych ustawień.
 */

import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light';
export type ThemeAccent = 'Niebieski' | 'Fioletowy' | 'Zielony' | 'Pomarańczowy';
export type Currency = 'PLN' | 'EUR' | 'USD';

const darkColors = {
  background: '#0d1117',
  surface: '#161b22',
  surfaceGlass: 'rgba(22, 27, 34, 0.82)',
  surfaceMuted: '#21262d',
  surfaceMutedGlass: 'rgba(33, 38, 45, 0.72)',
  border: '#30363d',
  borderGlass: 'rgba(48, 54, 61, 0.65)',
  backdrop: 'rgba(13, 17, 23, 0.72)',
  text: '#f0f6fc',
  textMuted: '#8b949e',
  accent: '#58a6ff',
  accentGlass: 'rgba(88, 166, 255, 0.16)',
  positive: '#3fb950',
  positiveGlass: 'rgba(63, 185, 80, 0.16)',
  negative: '#f85149',
  negativeGlass: 'rgba(248, 81, 73, 0.16)',
  warning: '#d29922',
};

const lightColors = {
  background: '#ffffff',
  surface: '#f6f8fa',
  surfaceGlass: 'rgba(246, 248, 250, 0.86)',
  surfaceMuted: '#eaeef2',
  surfaceMutedGlass: 'rgba(234, 238, 242, 0.80)',
  border: '#d0d7de',
  borderGlass: 'rgba(208, 215, 222, 0.70)',
  backdrop: 'rgba(0, 0, 0, 0.45)',
  text: '#1f2328',
  textMuted: '#656d76',
  accent: '#0969da',
  accentGlass: 'rgba(9, 105, 218, 0.12)',
  positive: '#1a7f37',
  positiveGlass: 'rgba(26, 127, 55, 0.12)',
  negative: '#cf222e',
  negativeGlass: 'rgba(207, 34, 46, 0.12)',
  warning: '#9a6700',
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: typeof darkColors;
  toggleMode: () => void;
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => void;
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;
  multiCurrency: boolean;
  setMultiCurrency: (enabled: boolean) => void;
  spacing: typeof themeBase.spacing;
  fontSize: typeof themeBase.fontSize;
  radius: typeof themeBase.radius;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [accent, setAccent] = useState<ThemeAccent>('Niebieski');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('PLN');
  const [multiCurrency, setMultiCurrency] = useState(true);
  const colors = useMemo(() => {
    const baseColors = mode === 'dark' ? darkColors : lightColors;
    const accentColors: Record<ThemeAccent, string> = {
      Niebieski: mode === 'dark' ? '#58a6ff' : '#0969da',
      Fioletowy : mode === 'dark' ? '#bc8cff' : '#8250df',
      Zielony: mode === 'dark' ? '#3fb950' : '#1a7f37',
      Pomarańczowy: mode === 'dark' ? '#f0883e' : '#bc4c00',
    };
    return { ...baseColors, accent: accentColors[accent] };
  }, [mode, accent]);
  const value = useMemo(
    () => ({
      mode,
      colors,
      accent,
      setAccent,
      defaultCurrency,
      setDefaultCurrency,
      multiCurrency,
      setMultiCurrency,
      toggleMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
      spacing: themeBase.spacing,
      fontSize: themeBase.fontSize,
      radius: themeBase.radius,
    }),
    [mode, accent, colors, defaultCurrency, multiCurrency],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const themeBase = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

export const theme = {
  ...themeBase,
  colors: {
    ...darkColors,
    ...lightColors,
  },
};


export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return theme;
}
