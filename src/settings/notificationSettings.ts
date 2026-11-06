export type NotificationCategoryKey =
  | 'portfolio'
  | 'market'
  | 'news'
  | 'transactions'
  | 'reminders';

export type NotificationCategories = Record<NotificationCategoryKey, boolean>;

export const NOTIFICATION_CATEGORY_OPTIONS: {
  key: NotificationCategoryKey;
  label: string;
  description: string;
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

export const DEFAULT_NOTIFICATION_CATEGORIES: NotificationCategories = {
  portfolio: true,
  market: true,
  news: true,
  transactions: true,
  reminders: true,
};

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

export function serializeNotificationCategories(
  categories: NotificationCategories,
): string {
  return JSON.stringify(categories);
}
