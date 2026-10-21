import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {getUserProfile, updateUserProfile } from './database/database';

export type ThemeMode = 'dark' | 'light';
export type ThemeAccent = 'blue' | 'violet' | 'green' | 'orange';
export type Currency = 'PLN' | 'EUR' | 'USD';

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
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => void;
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;
  multiCurrency: boolean;
  setMultiCurrency: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [accent, setAccent] = useState<ThemeAccent>('blue');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('PLN');
  const [multiCurrency, setMultiCurrency] = useState(false);
  const colors = useMemo(() => {
    const baseColors = mode === 'dark' ? darkColors : lightColors;
    const accentColors: Record<ThemeAccent, string> = {
      blue: mode === 'dark' ? '#58a6ff' : '#0969da',
      violet: mode === 'dark' ? '#bc8cff' : '#8250df',
      green: mode === 'dark' ? '#3fb950' : '#1a7f37',
      orange: mode === 'dark' ? '#f0883e' : '#bc4c00',
    };
    return { ...baseColors, accent: accentColors[accent] };
  }, [mode, accent]);
  const changeAccent = (nextAccent: ThemeAccent) => {
    setAccent(nextAccent);
    updateUserProfile({
      color_mode: nextAccent,
    });
  };
  const changeCurrency = (nextCurrency: Currency) => {
    setDefaultCurrency(nextCurrency);
    updateUserProfile({
      currency_default: nextCurrency,
    });
  }
  const changeMultiCurrency = (enabled: boolean) => {
    setMultiCurrency(enabled);
    updateUserProfile({
      multi_currency: enabled ? 1 : 0,
    });
  }
  const value = useMemo(
    () => ({
      mode,
      colors,
      accent,
      setAccent: changeAccent,
      defaultCurrency,
      setDefaultCurrency: changeCurrency,
      multiCurrency,
      setMultiCurrency: changeMultiCurrency,
      toggleMode: () => {
        setMode((current) => {
          const nextMode: ThemeMode = current === 'dark' ? 'light' : 'dark';
          updateUserProfile({
            dark_mode: nextMode === 'dark' ? 1 : 0,
          });
          return nextMode;
        });
      },
    }),
    [mode, accent, colors, defaultCurrency, multiCurrency],
  );
  
  
    useEffect(() => {
      const profile = getUserProfile();

      if (!profile) {
        return;
      }

      setMode(profile.dark_mode === 1 ? 'dark' : 'light');
      setAccent(profile.color_mode as ThemeAccent);
      setDefaultCurrency(profile.currency_default as Currency);
      setMultiCurrency(profile.multi_currency === 1);
    }, []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return theme;
}
