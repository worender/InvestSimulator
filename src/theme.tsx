/**
 * Kontekst motywu aplikacji. Poza wyglądem przechowuje również aktywne konto,
 * preferencje powiadomień oraz ustawienia walut.
 */

import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getActiveAccountId,
  getLoggedIn,
  setActiveAccountId,
  setLoggedIn,
} from "./database/activeAccount";
import {
  createUserProfile,
  getUserProfile,
  getUserProfiles,
  updateUserProfile,
  type UserProfile,
} from "./database/database";
import {
  FALLBACK_RATES,
  setDisplayCurrencyState,
  type ExchangeRates,
} from "./displayCurrency";
import { setGlobalFontScale } from "./fontScale";
import {
  DEFAULT_NOTIFICATION_CATEGORIES,
  parseNotificationCategories,
  serializeNotificationCategories,
  type NotificationCategories,
  type NotificationCategoryKey,
} from "./settings/notificationSettings";

export type ThemeMode = "dark" | "light";
export type ThemeAccent = string;
export type Currency = "PLN" | "EUR" | "USD";
export type FontSizePreference = "small" | "medium" | "large";

export type AccentPreset = {
  key: string;
  label: string;
  dark: string;
  light: string;
  rainbow?: boolean;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { key: "Niebieski", label: "Niebieski", dark: "#58a6ff", light: "#0969da" },
  { key: "Fioletowy", label: "Fioletowy", dark: "#bc8cff", light: "#8250df" },
  { key: "Zielony", label: "Zielony", dark: "#3fb950", light: "#1a7f37" },
  {
    key: "Pomarańczowy",
    label: "Pomarańczowy",
    dark: "#f0883e",
    light: "#bc4c00",
  },
  { key: "Czerwony", label: "Czerwony", dark: "#ff7b72", light: "#cf222e" },
  { key: "Różowy", label: "Różowy", dark: "#f778ba", light: "#bf3989" },
  { key: "Turkusowy", label: "Turkusowy", dark: "#39c5cf", light: "#1b7c83" },
  { key: "Żółty", label: "Żółty", dark: "#e3b341", light: "#9a6700" },
  {
    key: "Tęczowy",
    label: "Tęczowy",
    dark: "#d946ef",
    light: "#a21caf",
    rainbow: true,
  },
];

const DEFAULT_ACCENT: ThemeAccent = "Niebieski";
const FONT_SCALES: Record<FontSizePreference, number> = {
  small: 0.88,
  medium: 1,
  large: 1.14,
};

// Starsze wersje bazy zapisywały nazwy akcentów po angielsku (np. "blue").
const LEGACY_ACCENTS: Record<string, ThemeAccent> = {
  blue: "Niebieski",
  purple: "Fioletowy",
  green: "Zielony",
  orange: "Pomarańczowy",
  red: "Czerwony",
  pink: "Różowy",
  teal: "Turkusowy",
  yellow: "Żółty",
  rainbow: "Tęczowy",
};

export function resolveThemeAccent(value: unknown): ThemeAccent {
  if (typeof value !== "string") return DEFAULT_ACCENT;
  const trimmed = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (ACCENT_PRESETS.some((preset) => preset.key === trimmed)) return trimmed;
  return LEGACY_ACCENTS[trimmed.toLowerCase()] ?? DEFAULT_ACCENT;
}

export function resolveAccentColor(
  accent: ThemeAccent,
  mode: ThemeMode,
): string {
  const preset = ACCENT_PRESETS.find((item) => item.key === accent);
  if (preset) return mode === "dark" ? preset.dark : preset.light;
  return accent;
}

export function accentSwatchColor(
  preset: AccentPreset,
  mode: ThemeMode,
): string {
  return mode === "dark" ? preset.dark : preset.light;
}

function resolveFontSize(value: unknown): FontSizePreference {
  if (value === "small" || value === "large" || value === "medium")
    return value;
  return "medium";
}

const darkColors = {
  background: "#0d1117",
  surface: "#161b22",
  surfaceGlass: "rgba(22, 27, 34, 0.82)",
  surfaceMuted: "#21262d",
  surfaceMutedGlass: "rgba(33, 38, 45, 0.72)",
  border: "#30363d",
  borderGlass: "rgba(48, 54, 61, 0.65)",
  backdrop: "rgba(13, 17, 23, 0.72)",
  text: "#f0f6fc",
  textMuted: "#8b949e",
  accent: "#58a6ff",
  accentGlass: "rgba(88, 166, 255, 0.16)",
  positive: "#3fb950",
  positiveGlass: "rgba(63, 185, 80, 0.16)",
  negative: "#f85149",
  negativeGlass: "rgba(248, 81, 73, 0.16)",
  warning: "#d29922",
};

const lightColors = {
  background: "#ffffff",
  surface: "#f6f8fa",
  surfaceGlass: "rgba(246, 248, 250, 0.86)",
  surfaceMuted: "#eaeef2",
  surfaceMutedGlass: "rgba(234, 238, 242, 0.80)",
  border: "#d0d7de",
  borderGlass: "rgba(208, 215, 222, 0.70)",
  backdrop: "rgba(0, 0, 0, 0.45)",
  text: "#1f2328",
  textMuted: "#656d76",
  accent: "#0969da",
  accentGlass: "rgba(9, 105, 218, 0.12)",
  positive: "#1a7f37",
  positiveGlass: "rgba(26, 127, 55, 0.12)",
  negative: "#cf222e",
  negativeGlass: "rgba(207, 34, 46, 0.12)",
  warning: "#9a6700",
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: typeof darkColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => Promise<void>;
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => Promise<void>;
  multiCurrency: boolean;
  setMultiCurrency: (enabled: boolean) => Promise<void>;
  fontSizePreference: FontSizePreference;
  fontSizeScale: number;
  setFontSizePreference: (size: FontSizePreference) => Promise<void>;
  accounts: UserProfile[];
  activeAccount: UserProfile | null;
  switchAccount: (userId: number) => Promise<void>;
  addAccount: (input: {
    username: string;
    avatarUri?: string | null;
  }) => Promise<UserProfile>;
  updateAccount: (
    changes: Parameters<typeof updateUserProfile>[0],
  ) => Promise<void>;
  reloadAccounts: () => Promise<void>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  notificationCategories: NotificationCategories;
  setNotificationCategory: (
    key: NotificationCategoryKey,
    enabled: boolean,
  ) => Promise<void>;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  loggedIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  rates: ExchangeRates;
  ratesUpdatedAt: number | null;
  ratesLoading: boolean;
  refreshRates: () => Promise<void>;
  spacing: typeof themeBase.spacing;
  fontSize: typeof themeBase.fontSize;
  radius: typeof themeBase.radius;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<ThemeAccent>(DEFAULT_ACCENT);
  const [defaultCurrency, setDefaultCurrencyState] = useState<Currency>("PLN");
  const [multiCurrency, setMultiCurrencyState] = useState(true);
  const [fontSizePreference, setFontSizePreferenceState] =
    useState<FontSizePreference>("medium");
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [activeAccount, setActiveAccount] = useState<UserProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [notificationCategories, setNotificationCategories] =
    useState<NotificationCategories>({ ...DEFAULT_NOTIFICATION_CATEGORIES });
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [loggedIn, setLoggedInState] = useState(true);
  const [rates, setRates] = useState<ExchangeRates>({ ...FALLBACK_RATES });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<number | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const rateRequest = useRef(0);

  const applyProfile = useCallback((profile: UserProfile) => {
    setActiveAccount(profile);
    setModeState(profile.dark_mode === 1 ? "dark" : "light");
    setAccentState(resolveThemeAccent(profile.color_mode));
    setDefaultCurrencyState(profile.currency_default as Currency);
    setMultiCurrencyState(profile.multi_currency === 1);
    setFontSizePreferenceState(resolveFontSize(profile.font_size));
    setNotificationsEnabledState(profile.notifications_enabled === 1);
    setNotificationCategories(
      parseNotificationCategories(profile.notification_categories),
    );
    setBiometricEnabledState(profile.biometric_enabled === 1);
  }, []);

  const refreshRates = useCallback(async () => {
    const requestId = rateRequest.current + 1;
    rateRequest.current = requestId;
    setRatesLoading(true);

    try {
      const response = await fetch(
        "https://api.frankfurter.app/latest?from=PLN&to=EUR,USD",
      );
      if (!response.ok) throw new Error("Nie udało się pobrać kursów");

      const payload = (await response.json()) as {
        rates?: { EUR?: number; USD?: number };
      };
      const eur = payload.rates?.EUR;
      const usd = payload.rates?.USD;

      if (!eur || !usd) throw new Error("Niepoprawna odpowiedź z serwera");

      if (rateRequest.current !== requestId) return;
      setRates({ PLN: 1, EUR: 1 / eur, USD: 1 / usd });
      setRatesUpdatedAt(Date.now());
    } catch {
      if (rateRequest.current !== requestId) return;
      setRates({ ...FALLBACK_RATES });
    } finally {
      if (rateRequest.current === requestId) setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const profiles = await getUserProfiles();
        const activeId = await getActiveAccountId();
        const logged = await getLoggedIn();
        const profile =
          profiles.find((item) => item.id === activeId) ?? profiles[0] ?? null;

        if (!active) return;
        setAccounts(profiles);
        setLoggedInState(logged);
        if (profile) applyProfile(profile);
      } catch (error) {
        console.error("Nie udało się wczytać profilu z SQLite:", error);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshRates();

    return () => {
      active = false;
    };
  }, [applyProfile, refreshRates]);

  const reloadAccounts = useCallback(async () => {
    const profiles = await getUserProfiles();
    setAccounts(profiles);
    return;
  }, []);

  const switchAccount = useCallback(
    async (userId: number) => {
      const profile = await getUserProfile(userId);
      if (!profile) return;
      setActiveAccountId(userId);
      applyProfile(profile);
    },
    [applyProfile],
  );

  const addAccount = useCallback(
    async (input: { username: string; avatarUri?: string | null }) => {
      const profile = await createUserProfile({
        username: input.username,
        avatar_uri: input.avatarUri ?? null,
      });
      const profiles = await getUserProfiles();
      setAccounts(profiles);
      setActiveAccountId(profile.id);
      applyProfile(profile);
      return profile;
    },
    [applyProfile],
  );

  const updateAccount = useCallback(
    async (changes: Parameters<typeof updateUserProfile>[0]) => {
      if (!activeAccount) return;
      const updated = await updateUserProfile(changes, activeAccount.id);
      setAccounts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      applyProfile(updated);
    },
    [activeAccount, applyProfile],
  );

  const requireAccount = () => {
    if (!activeAccount) throw new Error("Brak aktywnego konta");
    return activeAccount.id;
  };

  const changeMode = useCallback(
    async (nextMode: ThemeMode) => {
      setModeState(nextMode);
      await updateUserProfile(
        { dark_mode: nextMode === "dark" ? 1 : 0 },
        requireAccount(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeAccent = useCallback(
    async (nextAccent: ThemeAccent) => {
      const resolved = resolveThemeAccent(nextAccent);
      setAccentState(resolved);
      await updateUserProfile({ color_mode: resolved }, requireAccount());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeCurrency = useCallback(
    async (nextCurrency: Currency) => {
      setDefaultCurrencyState(nextCurrency);
      await updateUserProfile(
        { currency_default: nextCurrency },
        requireAccount(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeMultiCurrency = useCallback(
    async (enabled: boolean) => {
      setMultiCurrencyState(enabled);
      if (!enabled) setDefaultCurrencyState("PLN");
      await updateUserProfile(
        {
          multi_currency: enabled ? 1 : 0,
          ...(enabled ? {} : { currency_default: "PLN" }),
        },
        requireAccount(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeFontSize = useCallback(
    async (size: FontSizePreference) => {
      setFontSizePreferenceState(size);
      await updateUserProfile({ font_size: size }, requireAccount());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      setNotificationsEnabledState(enabled);
      await updateUserProfile(
        { notifications_enabled: enabled ? 1 : 0 },
        requireAccount(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeNotificationCategory = useCallback(
    async (key: NotificationCategoryKey, enabled: boolean) => {
      const next = { ...notificationCategories, [key]: enabled };
      setNotificationCategories(next);
      await updateUserProfile(
        { notification_categories: serializeNotificationCategories(next) },
        requireAccount(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount, notificationCategories],
  );

  const changeBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      setBiometricEnabledState(enabled);
      await updateUserProfile(
        { biometric_enabled: enabled ? 1 : 0 },
        requireAccount(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const login = useCallback(async () => {
    setLoggedInState(true);
    await setLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    setLoggedInState(false);
    await setLoggedIn(false);
  }, []);

  const accentColor = resolveAccentColor(accent, mode);
  const colors = useMemo(() => {
    const baseColors = mode === "dark" ? darkColors : lightColors;
    return { ...baseColors, accent: accentColor };
  }, [accentColor, mode]);

  const fontSizeScale = FONT_SCALES[fontSizePreference];
  setGlobalFontScale(fontSizeScale);
  setDisplayCurrencyState({
    multiCurrency,
    currency: defaultCurrency,
    rates,
  });

  const value = useMemo(
    () => ({
      mode,
      colors,
      setMode: changeMode,
      toggleMode: () => changeMode(mode === "dark" ? "light" : "dark"),
      accent,
      setAccent: changeAccent,
      defaultCurrency,
      setDefaultCurrency: changeCurrency,
      multiCurrency,
      setMultiCurrency: changeMultiCurrency,
      fontSizePreference,
      fontSizeScale,
      setFontSizePreference: changeFontSize,
      accounts,
      activeAccount,
      switchAccount,
      addAccount,
      updateAccount,
      reloadAccounts,
      notificationsEnabled,
      setNotificationsEnabled: changeNotificationsEnabled,
      notificationCategories,
      setNotificationCategory: changeNotificationCategory,
      biometricEnabled,
      setBiometricEnabled: changeBiometricEnabled,
      loggedIn,
      login,
      logout,
      rates,
      ratesUpdatedAt,
      ratesLoading,
      refreshRates,
      spacing: themeBase.spacing,
      fontSize: themeBase.fontSize,
      radius: themeBase.radius,
    }),
    [
      accent,
      accounts,
      activeAccount,
      addAccount,
      biometricEnabled,
      changeAccent,
      changeBiometricEnabled,
      changeCurrency,
      changeFontSize,
      changeMode,
      changeMultiCurrency,
      changeNotificationCategory,
      changeNotificationsEnabled,
      colors,
      defaultCurrency,
      fontSizePreference,
      fontSizeScale,
      loggedIn,
      login,
      logout,
      mode,
      multiCurrency,
      notificationCategories,
      notificationsEnabled,
      rates,
      ratesLoading,
      ratesUpdatedAt,
      refreshRates,
      reloadAccounts,
      switchAccount,
      updateAccount,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
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
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return theme;
}
