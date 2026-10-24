/**
  * Szyna powiadomień. Dzięki niej komunikaty mogą wysyłać także
  * moduły niezależne od Reacta (np. warstwa API), a `NotificationProvider`
  * tylko je odbiera i kolejkuje do wyświetlenia.
 */

const NOTIFICATION_DURATION = 7000; // ms

export type NotificationVariant = 'error' | 'success' | 'info' | 'warning';

export type AppNotification = {
  id: string;
  title: string;
  message?: string;
  variant: NotificationVariant;
  duration: number;
};

export type NotificationInput = {
  title: string;
  message?: string;
  variant?: NotificationVariant;
  duration?: number;
};

type NotificationListener = (notification: AppNotification) => void;

const listeners = new Set<NotificationListener>();
let pending: AppNotification[] = [];
let sequence = 0;
let lastSignature = '';
let lastSignatureAt = 0;

// kolejkuje powiadomienie
export function notify({
  title,
  message,
  variant = 'info',
  duration = NOTIFICATION_DURATION,
}: NotificationInput): AppNotification {
  const notification: AppNotification = {
    id: `notification-${++sequence}`,
    title,
    message,
    variant,
    duration,
  };

  // Sprawdza, czy powiadomienie jest duplikatem 
  const signature = `${variant}:${title}:${message ?? ''}`;
  const now = Date.now();
  const duplicated = signature === lastSignature && now - lastSignatureAt < 2500;
  lastSignature = signature;
  lastSignatureAt = now;
  if (duplicated) return notification;

  if (listeners.size === 0) {
    pending = [...pending, notification];
    return notification;
  }

  listeners.forEach((listener) => listener(notification));
  return notification;
}

// Subskrybuje się do powiadomień
export function subscribeToNotifications(listener: NotificationListener): () => void {
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
