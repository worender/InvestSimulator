/**
 * Kategorie powiadomień w ustawieniach.
 *
 * @module src/settings/notificationSettings
 */

/** Klucz kategorii powiadomień (odpowiada kolumnie w ustawieniach powiadomień w bazie). */
export type NotificationCategoryKey =
  | 'portfolio'
  | 'market'
  | 'news'
  | 'transactions'
  | 'reminders';

/** Włączenie (`true`) lub wyłączenie każdej kategorii powiadomień. */
export type NotificationCategories = Record<NotificationCategoryKey, boolean>;

/** Opcje kategorii wyświetlane na ekranie ustawień powiadomień. */
export const NOTIFICATION_CATEGORY_OPTIONS: {
  /** Klucz kategorii. */
  key: NotificationCategoryKey;
  /** Nazwa kategorii. */
  label: string;
  /** Krótki opis pod nazwą. */
  description: string;
  /** Nazwa ikony Ionicons. */
  icon:
    | 'wallet-outline'
    | 'trending-up-outline'
    | 'newspaper-outline'
    | 'swap-horizontal-outline'
    | 'alarm-outline';
}[] = [
  {
    key: 'portfolio',
    label: 'Portfel',
    description: 'Zmiany wartości i wyniki portfela',
    icon: 'wallet-outline',
  },
  {
    key: 'market',
    label: 'Rynek',
    description: 'Ważne ruchy indeksów i notowań',
    icon: 'trending-up-outline',
  },
  {
    key: 'news',
    label: 'Newsy',
    description: 'Nowe materiały i informacje rynkowe',
    icon: 'newspaper-outline',
  },
  {
    key: 'transactions',
    label: 'Transakcje',
    description: 'Realizacja zleceń kupna i sprzedaży',
    icon: 'swap-horizontal-outline',
  },
  {
    key: 'reminders',
    label: 'Przypomnienia',
    description: 'Cykliczne podsumowania i przypomnienia',
    icon: 'alarm-outline',
  },
];

/** Domyślnie wszystkie kategorie są włączone. */
export const DEFAULT_NOTIFICATION_CATEGORIES: NotificationCategories = {
  portfolio: true,
  market: true,
  news: true,
  transactions: true,
  reminders: true,
};

/**
 * Odczytuje kategorie powiadomień zapisane jako JSON.
 *
 * Brakujące klucze są włączone; pusty lub niepoprawny JSON daje wartości domyślne.
 * Obecnie nieużywana (ustawienia powiadomień są w osobnej tabeli) — zostawiona
 * dla starszego formatu zapisu.
 *
 * @param raw Tekst JSON albo `null`/`undefined`.
 * @returns Kompletny zestaw kategorii.
 */
export function parseNotificationCategories(
  raw: string | null | undefined,
): NotificationCategories {
  if (!raw) return { ...DEFAULT_NOTIFICATION_CATEGORIES };

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationCategories>;
    return {
      portfolio: parsed.portfolio ?? true,
      market: parsed.market ?? true,
      news: parsed.news ?? true,
      transactions: parsed.transactions ?? true,
      reminders: parsed.reminders ?? true,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_CATEGORIES };
  }
}

/**
 * Zapisuje kategorie powiadomień jako JSON (odwrotność {@link parseNotificationCategories}).
 *
 * @param categories Kategorie.
 * @returns Tekst JSON.
 */
export function serializeNotificationCategories(
  categories: NotificationCategories,
): string {
  return JSON.stringify(categories);
}
