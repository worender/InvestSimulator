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
    description: 'Ważne ruchy indeksów i notowań (wkrótce)',
    icon: 'trending-up-outline',
  },
  {
    key: 'news',
    label: 'Newsy',
    description: 'Nowe materiały i informacje rynkowe (wkrótce)',
    icon: 'newspaper-outline',
  },
  {
    key: 'transactions',
    label: 'Transakcje (alerty)',
    description: 'Alerty realizacji zleceń kupna i sprzedaży (wkrótce)',
    icon: 'swap-horizontal-outline',
  },
  {
    key: 'reminders',
    label: 'Podsumowania cykliczne',
    description: 'Cykliczne podsumowania i przypomnienia (wkrótce)',
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

export function mapNotificationCategoryToKey(
  category: string | undefined | null,
): NotificationCategoryKey | null {
  if (!category) return null;
  const normalized = category.toLowerCase().trim();

  if (normalized === 'portfolio') {
    return 'portfolio';
  }
  if (
    normalized === 'market' ||
    normalized.startsWith('market-') ||
    normalized.startsWith('market')
  ) {
    return 'market';
  }
  if (
    normalized === 'news' ||
    normalized === 'news-feed' ||
    normalized.startsWith('news')
  ) {
    return 'news';
  }
  if (
    normalized === 'transactions' ||
    normalized === 'transaction'
  ) {
    return 'transactions';
  }
  if (
    normalized === 'reminders' ||
    normalized === 'reminder' ||
    normalized.includes('podsumowani') ||
    normalized.includes('przypomn')
  ) {
    return 'reminders';
  }
  return null;
}

export function isNotificationAllowed(
  category: string | undefined | null,
  notificationsEnabled: boolean,
  categories: NotificationCategories,
): boolean {
  if (!notificationsEnabled) return false;

  const key = mapNotificationCategoryToKey(category);
  if (!key) {
    return true;
  }

  return categories[key] ?? true;
}
