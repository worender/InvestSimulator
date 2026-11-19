/**
 * Szyna powiadomień. Dzięki niej komunikaty mogą wysyłać także
 * moduły niezależne od Reacta (np. warstwa API), a `NotificationProvider`
 * tylko je odbiera i kolejkuje do wyświetlenia.
 *
 * Powiadomienia wysłane, zanim ktokolwiek zasubskrybuje szynę (np. podczas
 * startu aplikacji), czekają w kolejce i trafiają do pierwszego subskrybenta.
 *
 * @module src/notificationBus
 */

/** Domyślny czas wyświetlania powiadomienia w milisekundach. */
const NOTIFICATION_DURATION = 7000; // ms
/** Maksymalna długość kolejki (łącznie z powiadomieniem aktualnie widocznym). */
const MAX_QUEUE_SIZE = 5;

/** Rodzaj powiadomienia — decyduje o kolorze i ikonie karty. */
export type NotificationVariant = "error" | "success" | "info" | "warning";

/**
 * Nazwane grupy powiadomień. Powiadomienia z tej samej grupy nie tworzą
 * długiej kolejki — nowsze zastępuje czekające starsze z tej grupy
 * (patrz {@link mergeNotificationQueue}).
 */
export const NOTIFICATION_GROUPS = {
  account: "account",
  appearance: "appearance",
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

/** Powiadomienie gotowe do wyświetlenia (z uzupełnionymi wartościami domyślnymi). */
export type AppNotification = {
  /** Unikalny identyfikator, np. `"notification-3"`. */
  id: string;
  /** Tytuł powiadomienia. */
  title: string;
  /** Opcjonalna treść pod tytułem. */
  message?: string;
  /** Rodzaj powiadomienia. */
  variant: NotificationVariant;
  /** Czas wyświetlania w milisekundach. */
  duration: number;
  /** Grupa powiązanych powiadomień (używana do deduplikacji w kolejce). */
  category: string;
};

/** Dane przekazywane do {@link notify}. */
export type NotificationInput = {
  /** Tytuł powiadomienia (wymagany). */
  title: string;
  /** Opcjonalna treść pod tytułem. */
  message?: string;
  /** Rodzaj powiadomienia; domyślnie `"info"`. */
  variant?: NotificationVariant;
  /** Czas wyświetlania w ms; domyślnie 7000. */
  duration?: number;
  /** Opcjonalna grupa deduplikacji (najlepiej z {@link NOTIFICATION_GROUPS}). Domyślnie jest nią tytuł powiadomienia. */
  category?: string;
};

/** Funkcja odbierająca każde nowe powiadomienie. */
type NotificationListener = (notification: AppNotification) => void;

/** Aktywni subskrybenci szyny. */
const listeners = new Set<NotificationListener>();
/** Powiadomienia wysłane, gdy nie było jeszcze żadnego subskrybenta. */
let pending: AppNotification[] = [];
/** Licznik używany do nadawania identyfikatorów. */
let sequence = 0;

/**
 * Wyznacza grupę (kategorię) powiadomienia.
 *
 * @param title Tytuł powiadomienia.
 * @param category Jawnie podana grupa; pusta lub same spacje są ignorowane.
 * @returns Przycięta jawna grupa, a gdy jej brak — tytuł zapisany małymi
 * literami, z wielokrotnymi spacjami zamienionymi na jedną.
 *
 * @example
 * resolveNotificationCategory("Brak  Newsów");          // "brak newsów"
 * resolveNotificationCategory("Błąd", " news-feed ");   // "news-feed"
 */
export function resolveNotificationCategory(
  title: string,
  category?: string,
): string {
  const explicit = category?.trim();
  if (explicit) return explicit;

  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Tworzy podpis powiadomienia (grupa, tytuł i treść) do wykrywania duplikatów.
 *
 * @param notification Powiadomienie.
 * @returns Tekst `grupa|tytuł|treść`.
 */
function notificationSignature(notification: AppNotification): string {
  return [
    notification.category,
    notification.title,
    notification.message ?? "",
  ].join("|");
}

/**
 * Dodaje powiadomienie do kolejki, pilnując, aby nie zawierała duplikatów.
 *
 * Pierwszy element kolejki to powiadomienie aktualnie widoczne. Reguły:
 * 1. Identyczne powiadomienie (ta sama grupa, tytuł i treść) jest już w kolejce — kolejka bez zmian.
 * 2. Czeka już (poza widocznym) powiadomienie z tej samej grupy — jest zastępowane nowym w tym samym miejscu.
 * 3. Kolejka ma już 5 elementów — usuwane jest najstarsze czekające, a nowe trafia na koniec.
 * 4. W pozostałych przypadkach nowe powiadomienie trafia na koniec.
 *
 * Funkcja jest czysta — nie modyfikuje przekazanej tablicy.
 *
 * @param queue Bieżąca kolejka.
 * @param notification Nowe powiadomienie.
 * @returns Nowa kolejka (albo ta sama tablica, gdy nic się nie zmieniło).
 */
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

/**
 * Wysyła powiadomienie do wyświetlenia. Można ją wywołać z dowolnego miejsca,
 * także spoza komponentów Reacta.
 *
 * Gdy nikt jeszcze nie subskrybuje szyny, powiadomienie czeka w kolejce
 * i trafi do pierwszego subskrybenta.
 *
 * @param input Dane powiadomienia.
 * @param input.title Tytuł.
 * @param input.message Opcjonalna treść.
 * @param input.variant Rodzaj; domyślnie `"info"`.
 * @param input.duration Czas wyświetlania w ms; domyślnie 7000.
 * @param input.category Grupa deduplikacji; domyślnie wyznaczana z tytułu ({@link resolveNotificationCategory}).
 * @returns Utworzone powiadomienie.
 *
 * @example
 * notify({
 *   variant: "error",
 *   title: "Nie udało się zapisać",
 *   category: NOTIFICATION_GROUPS.transactions,
 * });
 */
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

/**
 * Rejestruje odbiorcę powiadomień.
 *
 * Jeśli w kolejce czekają powiadomienia wysłane przed pierwszą subskrypcją,
 * zostają od razu przekazane temu odbiorcy, a kolejka jest czyszczona.
 *
 * @param listener Funkcja wywoływana dla każdego nowego powiadomienia.
 * @returns Funkcja wyrejestrowująca odbiorcę.
 */
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
