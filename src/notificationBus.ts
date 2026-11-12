/**
 * Szyna powiadomień. Dzięki niej komunikaty mogą wysyłać także
 * moduły niezależne od Reacta (np. warstwa API), a `NotificationProvider`
 * tylko je odbiera i kolejkuje do wyświetlenia.
 */

const NOTIFICATION_DURATION = 7000; // ms
const MAX_QUEUE_SIZE = 5;

export type NotificationVariant = "error" | "success" | "info" | "warning";

/**
 * Nazwane grupy powiadomień. Powiadomienia z tej samej grupy nie tworzą
 * długiej kolejki
 */
export const NOTIFICATION_GROUPS = {
  account: "account",
  marketChart: "market-chart",
  marketSearch: "market-search",
  marketTrends: "market-trends",
  marketFinancials: "market-financials",
  marketEarnings: "market-earnings",
  marketQuotes: "market-quotes",
  newsFeed: "news-feed",
  portfolio: "portfolio",
  transactions: "transactions",
} as const;

export type AppNotification = {
  id: string;
  title: string;
  message?: string;
  variant: NotificationVariant;
  duration: number;
  // Grupa powiązanych powiadomień
  category: string;
};

export type NotificationInput = {
  title: string;
  message?: string;
  variant?: NotificationVariant;
  duration?: number;
  // Opcjonalna grupa deduplikacji. Domyślnie jest nią tytuł powiadomienia
  category?: string;
};

type NotificationListener = (notification: AppNotification) => void;

const listeners = new Set<NotificationListener>();
let pending: AppNotification[] = [];
let sequence = 0;

export function resolveNotificationCategory(
  title: string,
  category?: string,
): string {
  const explicit = category?.trim();
  if (explicit) return explicit;

  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function notificationSignature(notification: AppNotification): string {
  return [
    notification.category,
    notification.title,
    notification.message ?? "",
  ].join("|");
}

// Dodaje powiadomienie do kolejki, pilnując aby nie zawierała duplikatów.
export function mergeNotificationQueue(
  queue: AppNotification[],
  notification: AppNotification,
): AppNotification[] {
  if (
    queue.some(
      (item) =>
        notificationSignature(item) === notificationSignature(notification),
    )
  ) {
    return queue;
  }

  // Aktualnie widoczne powiadomienie zostaje na miejscu. Jeśli w kolejce
  // czeka już inny komunikat z tej samej kategorii, zastępujemy go nowszym
  const pendingIndex = queue.findIndex(
    (item, index) => index > 0 && item.category === notification.category,
  );

  if (pendingIndex !== -1) {
    const next = [...queue];
    next[pendingIndex] = notification;
    return next;
  }

  if (queue.length >= MAX_QUEUE_SIZE) {
    const next = [...queue];
    next.splice(1, 1);
    next.push(notification);
    return next;
  }

  return [...queue, notification];
}

// kolejkuje powiadomienie
export function notify({
  title,
  message,
  variant = "info",
  duration = NOTIFICATION_DURATION,
  category,
}: NotificationInput): AppNotification {
  const notification: AppNotification = {
    id: `notification-${++sequence}`,
    title,
    message,
    variant,
    duration,
    category: resolveNotificationCategory(title, category),
  };

  if (listeners.size === 0) {
    pending = mergeNotificationQueue(pending, notification);
    return notification;
  }

  listeners.forEach((listener) => listener(notification));
  return notification;
}

// Subskrybuje się do powiadomień
export function subscribeToNotifications(
  listener: NotificationListener,
): () => void {
  listeners.add(listener);

  if (pending.length > 0) {
    const queued = pending;
    pending = [];
    queued.forEach(listener);
  }

  return () => {
    listeners.delete(listener);
  };
}
