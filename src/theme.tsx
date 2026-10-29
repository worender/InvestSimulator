/**
 * Plik z definicją kontekstu motywu aplikacji, który przechowuje informacje o aktualnym trybie (ciemny/jasny), kolorach, akcentach, domyślnej walucie i innych ustawieniach wizualnych.
 * Zawiera również hook `useTheme`, który umożliwia komponentom dostęp do tych ustawień.
 */

import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect ,useMemo, useState } from 'react';
import {getUserProfile, updateUserProfile } from './database/database';

export type ThemeMode = 'dark' | 'light';
export type ThemeAccent = 'Niebieski' | 'Fioletowy' | 'Zielony' | 'Pomarańczowy';
export type Currency = 'PLN' | 'EUR' | 'USD';

const THEME_ACCENTS: ThemeAccent[] = ['Niebieski', 'Fioletowy', 'Zielony', 'Pomarańczowy'];

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
  toggleMode: () => Promise<void>;
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => Promise<void>;
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => Promise<void>;
  multiCurrency: boolean;
  setMultiCurrency: (enabled: boolean) => Promise<void>;
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
  const changeAccent = async (nextAccent: ThemeAccent) => {
    setAccent(nextAccent);
    await updateUserProfile({
      color_mode: nextAccent,
    });
  };
  const changeCurrency = async (nextCurrency: Currency) => {
    setDefaultCurrency(nextCurrency);
    await updateUserProfile({
      currency_default: nextCurrency,
    });
  }
  const changeMultiCurrency = async (enabled: boolean) => {
    setMultiCurrency(enabled);
    await updateUserProfile({
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
      toggleMode: async () => {
        
          const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
          setMode(nextMode);

          await updateUserProfile({
            dark_mode: nextMode === 'dark' ? 1 : 0,
          });
          
        
      },
      spacing: themeBase.spacing,
      fontSize: themeBase.fontSize,
      radius: themeBase.radius,
    }),
    [mode, accent, colors, defaultCurrency, multiCurrency],
  );

   useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile();
      

        if (!active || !profile) {
          return;
        }

        setMode(profile.dark_mode === 1 ? 'dark' : 'light');
        // Domyślna wartość w bazie to 'blue', która nie jest nazwą akcentu — zostawiamy wtedy 'Niebieski'.
        if (THEME_ACCENTS.includes(profile.color_mode as ThemeAccent)) {
          setAccent(profile.color_mode as ThemeAccent);
        }
        setDefaultCurrency(profile.currency_default as Currency);
        setMultiCurrency(profile.multi_currency === 1);
      } catch (error) {
        console.error('Nie udało się wczytać profilu z SQLite:', error);
      }
    };

    void loadProfile();

    return () => {
      active = false; 
    };
    }, []);

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
