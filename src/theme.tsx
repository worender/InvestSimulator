/**
 * Kontekst motywu aplikacji. Poza wyglądem przechowuje również aktywne konto,
 * preferencje powiadomień oraz ustawienia walut.
 *
 * `ThemeProvider` przy starcie wczytuje z SQLite konta, aktywne konto, jego
 * ustawienia, ustawienia powiadomień i własne kolory akcentu, a także pobiera
 * kursy walut. Każda zmiana ustawienia jest od razu widoczna w interfejsie
 * i zapisywana w bazie dla aktywnego konta.
 *
 * Dodatkowo synchronizuje dwa globalne moduły: skalę czcionek (`fontScale`)
 * i ustawienia wyświetlania kwot (`displayCurrency`).
 *
 * @module src/theme
 */

import type { PropsWithChildren } from "react";
import {
  createContext,
  startTransition,
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
  addCustomAccentColor,
  createUserProfile,
  getCustomAccentColors,
  getNotificationSettings,
  getSettings,
  getUserProfile,
  getUserProfiles,
  updateCustomAccentColor,
  updateNotificationSettings,
  updateSettings,
  updateUserProfile,
  type CustomAccentColor,
  type NotificationSettings,
  type Settings,
  type UserProfile,
} from "./database/database";
import { MAX_CUSTOM_ACCENTS, normalizeHexColor } from "./settings/color";
import {
  FALLBACK_RATES,
  setDisplayCurrencyState,
  type ExchangeRates,
} from "./displayCurrency";
import { setGlobalFontScale } from "./fontScale";
import { NOTIFICATION_GROUPS, notify } from "./notificationBus";
import {
  DEFAULT_NOTIFICATION_CATEGORIES,
  type NotificationCategories,
  type NotificationCategoryKey,
} from "./settings/notificationSettings";

/** Tryb kolorystyczny: ciemny lub jasny. */
export type ThemeMode = "dark" | "light";
/** Kolor akcentu: klucz predefiniowanego koloru (np. `"Niebieski"`) albo własny kolor `#rrggbb`. */
export type ThemeAccent = string;
/** Waluta rozliczeniowa dostępna w ustawieniach. */
export type Currency = "PLN" | "EUR" | "USD";
/** Preferowany rozmiar czcionki. */
export type FontSizePreference = "small" | "medium" | "large";

/** Predefiniowany kolor akcentu w wersji dla obu trybów. */
export type AccentPreset = {
  /** Klucz zapisywany w ustawieniach (polska nazwa koloru). */
  key: string;
  /** Etykieta wyświetlana w interfejsie. */
  label: string;
  /** Kolor w trybie ciemnym. */
  dark: string;
  /** Kolor w trybie jasnym. */
  light: string;
};

/** Predefiniowane kolory akcentu (paleta w stylu GitHub). */
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
];

/** Domyślny kolor akcentu. */
const DEFAULT_ACCENT: ThemeAccent = "Niebieski";
/** Mnożniki czcionek dla preferencji rozmiaru. */
const FONT_SCALES: Record<FontSizePreference, number> = {
  small: 0.88,
  medium: 1,
  large: 1.14,
};

/** Starsze wersje bazy zapisywały nazwy akcentów po angielsku (np. `"blue"`) — mapowanie na obecne klucze. */
const LEGACY_ACCENTS: Record<string, ThemeAccent> = {
  blue: "Niebieski",
  purple: "Fioletowy",
  green: "Zielony",
  orange: "Pomarańczowy",
  red: "Czerwony",
  pink: "Różowy",
  teal: "Turkusowy",
  yellow: "Żółty",
};

/**
 * Zamienia wartość zapisaną w bazie na poprawny kolor akcentu.
 *
 * Kolejność: poprawny kolor hex (znormalizowany przez `normalizeHexColor`),
 * klucz predefiniowanego koloru, dawna angielska nazwa (dowolna wielkość liter),
 * a w pozostałych przypadkach kolor domyślny `"Niebieski"`.
 *
 * @param value Wartość z bazy (dowolnego typu).
 * @returns Klucz koloru z {@link ACCENT_PRESETS} albo kolor hex.
 *
 * @example
 * resolveThemeAccent("Zielony"); // "Zielony"
 * resolveThemeAccent("BLUE");    // "Niebieski"
 * resolveThemeAccent(42);        // "Niebieski"
 */
export function resolveThemeAccent(value: unknown): ThemeAccent {
  if (typeof value !== "string") return DEFAULT_ACCENT;
  const trimmed = value.trim();

  const custom = normalizeHexColor(trimmed);
  if (custom) return custom;
  if (ACCENT_PRESETS.some((preset) => preset.key === trimmed)) return trimmed;
  return LEGACY_ACCENTS[trimmed.toLowerCase()] ?? DEFAULT_ACCENT;
}

/**
 * Zwraca kolor CSS akcentu dla danego trybu.
 *
 * @param accent Klucz predefiniowanego koloru albo kolor hex.
 * @param mode Tryb kolorystyczny.
 * @returns Kolor predefiniowany w wersji dla trybu albo (dla koloru własnego) sam `accent`.
 */
export function resolveAccentColor(
  accent: ThemeAccent,
  mode: ThemeMode,
): string {
  const preset = ACCENT_PRESETS.find((item) => item.key === accent);
  if (preset) return mode === "dark" ? preset.dark : preset.light;
  return accent;
}

/**
 * Zwraca kolor próbki predefiniowanego akcentu dla danego trybu (np. w wyborze koloru).
 *
 * @param preset Predefiniowany kolor.
 * @param mode Tryb kolorystyczny.
 * @returns Kolor `dark` lub `light` z presetu.
 */
export function accentSwatchColor(
  preset: AccentPreset,
  mode: ThemeMode,
): string {
  return mode === "dark" ? preset.dark : preset.light;
}

/**
 * Zamienia wartość z bazy na preferencję rozmiaru czcionki.
 *
 * @param value Wartość z bazy.
 * @returns `"small"`, `"medium"` lub `"large"`; dla niepoprawnej wartości `"medium"`.
 */
function resolveFontSize(value: unknown): FontSizePreference {
  if (value === "small" || value === "large" || value === "medium")
    return value;
  return "medium";
}

/** Paleta kolorów trybu ciemnego. */
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

/** Paleta kolorów trybu jasnego (te same klucze co `darkColors`). */
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

/**
 * Wartość kontekstu motywu zwracana przez {@link useTheme}.
 *
 * Funkcje `set*` zmieniające ustawienia najpierw aktualizują interfejs, a potem
 * zapisują wartość w bazie. Bez aktywnego konta zapis kończy się odrzuconą
 * obietnicą z błędem „Brak aktywnego konta” (interfejs jest już zmieniony).
 */
type ThemeContextValue = {
  /** Bieżący tryb kolorystyczny (domyślnie ciemny). */
  mode: ThemeMode;
  /** Paleta kolorów bieżącego trybu z podmienionym kolorem akcentu. */
  colors: typeof darkColors;
  /** Ustawia tryb kolorystyczny i zapisuje go w ustawieniach konta. */
  setMode: (mode: ThemeMode) => Promise<void>;
  /** Przełącza tryb ciemny ↔ jasny. */
  toggleMode: () => Promise<void>;
  /** Wybrany kolor akcentu (klucz presetu lub kolor hex). */
  accent: ThemeAccent;
  /** Ustawia kolor akcentu (po normalizacji przez {@link resolveThemeAccent}) i zapisuje go. */
  setAccent: (accent: ThemeAccent) => Promise<void>;
  /** Własne kolory akcentu aktywnego konta. */
  customAccents: CustomAccentColor[];
  /** Dodaje własny kolor; `false` przy błędzie (z powiadomieniem) lub braku konta. */
  addCustomAccent: (color: string) => Promise<boolean>;
  /** Zmienia własny kolor o danym id; `false` przy błędzie (z powiadomieniem) lub braku konta. */
  updateCustomAccent: (id: number, color: string) => Promise<boolean>;
  /** Waluta rozliczeniowa. */
  defaultCurrency: Currency;
  /** Ustawia walutę rozliczeniową (aktualizacja interfejsu z niskim priorytetem) i zapisuje ją. */
  setDefaultCurrency: (currency: Currency) => Promise<void>;
  /** Tryb „Wiele walut” — kwoty w walutach źródłowych. */
  multiCurrency: boolean;
  /** Włącza lub wyłącza tryb „Wiele walut”; wyłączenie ustawia też walutę rozliczeniową na PLN. */
  setMultiCurrency: (enabled: boolean) => Promise<void>;
  /** Preferowany rozmiar czcionki. */
  fontSizePreference: FontSizePreference;
  /** Mnożnik czcionek wynikający z preferencji (0.88 / 1 / 1.14). */
  fontSizeScale: number;
  /** Ustawia rozmiar czcionki (aktualizacja interfejsu z niskim priorytetem) i zapisuje go. */
  setFontSizePreference: (size: FontSizePreference) => Promise<void>;
  /** Wszystkie konta zapisane na urządzeniu. */
  accounts: UserProfile[];
  /** Aktywne konto (`null` przed wczytaniem danych). */
  activeAccount: UserProfile | null;
  /**
   * Przełącza aktywne konto: zapamiętuje jego id, ustawia profil i wczytuje jego
   * własne kolory. Ustawienia wyglądu, walut i powiadomień nie są przy tym
   * wczytywane ponownie. Nieistniejące konto — nic się nie dzieje.
   */
  switchAccount: (userId: number) => Promise<void>;
  /** Tworzy konto i od razu je aktywuje; przy błędzie pokazuje powiadomienie i zwraca `null`. */
  addAccount: (input: {
    username: string;
    avatarUri?: string | null;
  }) => Promise<UserProfile | null>;
  /**
   * Aktualizuje profil aktywnego konta. Zwraca `true` po sukcesie, `false` przy
   * błędzie (z powiadomieniem) i `undefined`, gdy nie ma aktywnego konta.
   */
  updateAccount: (
    changes: Parameters<typeof updateUserProfile>[0],
  ) => Promise<boolean | undefined>;
  /** Wczytuje ponownie listę kont z bazy. */
  reloadAccounts: () => Promise<void>;
  /** Główny przełącznik powiadomień. */
  notificationsEnabled: boolean;
  /** Włącza lub wyłącza powiadomienia i zapisuje ustawienie. */
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  /** Włączone kategorie powiadomień. */
  notificationCategories: NotificationCategories;
  /** Włącza lub wyłącza jedną kategorię powiadomień i zapisuje ustawienie. */
  setNotificationCategory: (
    key: NotificationCategoryKey,
    enabled: boolean,
  ) => Promise<void>;
  /** Czy włączono logowanie biometryczne. */
  biometricEnabled: boolean;
  /** Włącza lub wyłącza logowanie biometryczne i zapisuje ustawienie. */
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  /** Czy użytkownik jest zalogowany (do czasu wczytania stanu — `true`). */
  loggedIn: boolean;
  /** Oznacza użytkownika jako zalogowanego (zapamiętywane między uruchomieniami). */
  login: () => Promise<void>;
  /** Wylogowuje użytkownika (zapamiętywane między uruchomieniami). */
  logout: () => Promise<void>;
  /** Kursy walut względem PLN (zapasowe do czasu pobrania). */
  rates: ExchangeRates;
  /** Czas ostatniego udanego pobrania kursów (ms od epoki) lub `null`. */
  ratesUpdatedAt: number | null;
  /** Czy trwa pobieranie kursów. */
  ratesLoading: boolean;
  /**
   * Pobiera aktualne kursy EUR i USD z api.frankfurter.dev. Przy błędzie
   * ustawia kursy zapasowe. Gdy wywołania się nakładają, liczy się tylko ostatnie.
   */
  refreshRates: () => Promise<void>;
  /** Odstępy (px). */
  spacing: typeof themeBase.spacing;
  /** Bazowe rozmiary czcionek (px, przed skalowaniem). */
  fontSize: typeof themeBase.fontSize;
  /** Promienie zaokrągleń (px). */
  radius: typeof themeBase.radius;
};

/** Kontekst motywu; `null` poza {@link ThemeProvider}. */
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Dostawca motywu, ustawień i kont użytkownika.
 *
 * Przy montowaniu wczytuje z bazy konta, aktywne konto (zapamiętane albo
 * pierwsze z listy), stan zalogowania, ustawienia, ustawienia powiadomień
 * i własne kolory akcentu, a równolegle pobiera kursy walut. Aktywny kolor
 * własny wybrany przed wprowadzeniem listy własnych kolorów jest do niej
 * dopisywany, aby nie zniknął. Błąd wczytywania jest tylko logowany —
 * aplikacja działa wtedy na wartościach domyślnych.
 *
 * @param props Właściwości komponentu; `children` — drzewo aplikacji, które ma dostęp do motywu.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<ThemeAccent>(DEFAULT_ACCENT);
  const [customAccents, setCustomAccents] = useState<CustomAccentColor[]>([]);
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
    // setModeState(profile.dark_mode === 1 ? "dark" : "light");
    // setAccentState(resolveThemeAccent(profile.color_mode));
    // setDefaultCurrencyState(profile.currency_default as Currency);
    // setMultiCurrencyState(profile.multi_currency === 1);
    // setFontSizePreferenceState(resolveFontSize(profile.font_size));
    // setNotificationsEnabledState(profile.notifications_enabled === 1);
    // setNotificationCategories(
    //   parseNotificationCategories(profile.notification_categories),
    // );
    // setBiometricEnabledState(profile.biometric_enabled === 1);
  }, []);

  const applySettings = useCallback((settings: Settings) => {
    setModeState(settings.dark_mode === 1 ? "dark" : "light");
    setAccentState(resolveThemeAccent(settings.color_mode));

    const currency = isCurrency(settings.currency) ? settings.currency : "PLN";

    setDefaultCurrencyState(currency);
    setMultiCurrencyState(settings.multi_currency === 1);
    setFontSizePreferenceState(resolveFontSize(settings.font_size));
    setBiometricEnabledState(settings.biometric_enabled === 1);
  }, []);

  const applyNotificationSettings = useCallback(
    (settings: NotificationSettings) => {
      setNotificationsEnabledState(settings.notifications_enabled === 1);
      setNotificationCategories({
        portfolio: settings.portfolio === 1,
        market: settings.market === 1,
        news: settings.news === 1,
        transactions: settings.transactions === 1,
        reminders: settings.reminders === 1,
      });
    },
    [],
  );

  const refreshRates = useCallback(async () => {
    const requestId = rateRequest.current + 1;
    rateRequest.current = requestId;
    setRatesLoading(true);

    try {
      // Stary adres api.frankfurter.app przekierowuje tutaj (301) bez nagłówków CORS, przez co na webie fetch był blokowany
      const response = await fetch(
        "https://api.frankfurter.dev/v1/latest?from=PLN&to=EUR,USD",
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
        if (profile) {
          applyProfile(profile);

          const settings = await getSettings(profile.id);
          const notificationSettings = await getNotificationSettings(
            profile.id,
          );
          let savedCustomAccents = await getCustomAccentColors(profile.id);

          // Kolory wybrane przed wprowadzeniem listy własnych kolorów nie
          // miały wpisu w tabeli — dopisujemy aktywny kolor, aby nie zniknął.
          const activeAccent = settings
            ? normalizeHexColor(settings.color_mode)
            : null;
          if (
            activeAccent &&
            savedCustomAccents.length < MAX_CUSTOM_ACCENTS &&
            !savedCustomAccents.some((item) => item.color === activeAccent)
          ) {
            savedCustomAccents = [
              ...savedCustomAccents,
              await addCustomAccentColor(profile.id, activeAccent),
            ];
          }

          if (!active) return;
          if (settings) applySettings(settings);
          if (notificationSettings)
            applyNotificationSettings(notificationSettings);
          setCustomAccents(savedCustomAccents);
        }
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
  }, [applyNotificationSettings, applyProfile, applySettings, refreshRates]);

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
      setCustomAccents(await getCustomAccentColors(userId));
    },
    [applyProfile],
  );

  const addAccount = useCallback(
    async (input: { username: string; avatarUri?: string | null }) => {
      try {
        const profile = await createUserProfile({
          username: input.username,
          avatar_uri: input.avatarUri ?? null,
        });
        const profiles = await getUserProfiles();
        setAccounts(profiles);
        setActiveAccountId(profile.id);
        applyProfile(profile);
        setCustomAccents([]);
        return profile;
      } catch (error) {
        notify({
          variant: "error",
          title: "Nie udało się utworzyć konta",
          category: NOTIFICATION_GROUPS.account,
          message:
            error instanceof Error
              ? error.message
              : "Spróbuj ponownie za chwilę.",
        });

        return null;
      }
    },
    [applyProfile],
  );

  const updateAccount = useCallback(
    async (changes: Parameters<typeof updateUserProfile>[0]) => {
      try {
        if (!activeAccount) return;
        const updated = await updateUserProfile(changes, activeAccount.id);
        setAccounts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        applyProfile(updated);
        return true;
      } catch (error) {
        notify({
          variant: "error",
          title: "Nie udało się zaktualizować konta",
          category: NOTIFICATION_GROUPS.account,
          message:
            error instanceof Error
              ? error.message
              : "Spróbuj ponownie za chwilę.",
        });
        return false;
      }
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
      await updateSettings({
        user_id: requireAccount(),
        dark_mode: nextMode === "dark" ? 1 : 0,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeAccent = useCallback(
    async (nextAccent: ThemeAccent) => {
      const resolved = resolveThemeAccent(nextAccent);
      setAccentState(resolved);
      await updateSettings({ color_mode: resolved, user_id: requireAccount() });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const addCustomAccent = useCallback(
    async (color: string) => {
      if (!activeAccount) return false;

      try {
        const created = await addCustomAccentColor(activeAccount.id, color);
        setCustomAccents((current) => [...current, created]);
        return true;
      } catch (error) {
        notify({
          variant: "error",
          title: "Nie udało się dodać koloru",
          category: NOTIFICATION_GROUPS.appearance,
          message:
            error instanceof Error
              ? error.message
              : "Spróbuj ponownie za chwilę.",
        });
        return false;
      }
    },
    [activeAccount],
  );

  const updateCustomAccent = useCallback(
    async (id: number, color: string) => {
      if (!activeAccount) return false;

      try {
        const updated = await updateCustomAccentColor(
          activeAccount.id,
          id,
          color,
        );
        setCustomAccents((current) =>
          current.map((item) => (item.id === id ? updated : item)),
        );
        return true;
      } catch (error) {
        notify({
          variant: "error",
          title: "Nie udało się zapisać koloru",
          category: NOTIFICATION_GROUPS.appearance,
          message:
            error instanceof Error
              ? error.message
              : "Spróbuj ponownie za chwilę.",
        });
        return false;
      }
    },
    [activeAccount],
  );

  const changeCurrency = useCallback(
    async (nextCurrency: Currency) => {
      // Zmiana waluty przelicza ceny w całej aplikacji — wykonujemy ją jako
      // zadanie o niższym priorytecie, aby nie blokować animacji dotyku.
      startTransition(() => {
        setDefaultCurrencyState(nextCurrency);
      });
      await updateSettings({
        currency: nextCurrency,
        user_id: requireAccount(),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeMultiCurrency = useCallback(
    async (enabled: boolean) => {
      startTransition(() => {
        setMultiCurrencyState(enabled);
        if (!enabled) setDefaultCurrencyState("PLN");
      });
      await updateSettings({
        multi_currency: enabled ? 1 : 0,
        ...(enabled ? {} : { currency: "PLN" }),
        user_id: requireAccount(),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeFontSize = useCallback(
    async (size: FontSizePreference) => {
      // Skalowanie czcionek wymusza ponowny layout całego drzewa, więc
      // odkładamy je na niski priorytet (concurrent rendering).
      startTransition(() => {
        setFontSizePreferenceState(size);
      });
      await updateSettings({ font_size: size, user_id: requireAccount() });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      setNotificationsEnabledState(enabled);
      await updateNotificationSettings({
        notifications_enabled: enabled ? 1 : 0,
        user_id: requireAccount(),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount],
  );

  const changeNotificationCategory = useCallback(
    async (key: NotificationCategoryKey, enabled: boolean) => {
      setNotificationCategories((prev) => ({ ...prev, [key]: enabled }));
      await updateNotificationSettings({
        [key]: enabled ? 1 : 0,
        user_id: requireAccount(),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount, notificationCategories],
  );

  const changeBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      setBiometricEnabledState(enabled);
      await updateSettings({
        biometric_enabled: enabled ? 1 : 0,
        user_id: requireAccount(),
      });
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

  // Aktualizacja stanu podczas renderowania powiadamiałaby subskrybentów w trakcie renderu i mogła
  // zostawić część komponentów ze starymi wartościami
  useEffect(() => {
    setDisplayCurrencyState({
      multiCurrency,
      currency: defaultCurrency,
      rates,
    });
  }, [defaultCurrency, multiCurrency, rates]);

  const value = useMemo(
    () => ({
      mode,
      colors,
      setMode: changeMode,
      toggleMode: () => changeMode(mode === "dark" ? "light" : "dark"),
      accent,
      setAccent: changeAccent,
      customAccents,
      addCustomAccent,
      updateCustomAccent,
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
      addAccount,
      addCustomAccent,
      accounts,
      activeAccount,
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
      customAccents,
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
      updateCustomAccent,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Stałe wymiary motywu: odstępy, rozmiary czcionek i promienie zaokrągleń. */
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

/**
 * Statyczny zestaw stałych motywu, dostępny bez kontekstu.
 *
 * **Uwaga:** `colors` łączy obie palety, a jasna nadpisuje ciemną, więc
 * w praktyce zawiera kolory trybu jasnego i nie reaguje na ustawienia
 * użytkownika. W komponentach używaj {@link useTheme}.
 */
export const theme = {
  ...themeBase,
  colors: {
    ...darkColors,
    ...lightColors,
  },
};

/**
 * Zwraca motyw, ustawienia i dane kont z kontekstu.
 *
 * @returns Wartość kontekstu motywu (patrz `ThemeContextValue`).
 * @throws {Error} Gdy hook użyto poza {@link ThemeProvider}.
 *
 * @example
 * const { colors, spacing } = useTheme();
 * return <View style={{ backgroundColor: colors.surface, padding: spacing.md }} />;
 */
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return theme;
}

/**
 * Sprawdza, czy tekst jest obsługiwaną walutą rozliczeniową (strażnik typu).
 *
 * @param value Sprawdzany tekst.
 * @returns `true` dla `PLN`, `EUR` i `USD`.
 */
function isCurrency(value: string): value is Currency {
  return value === "PLN" || value === "EUR" || value === "USD";
}
