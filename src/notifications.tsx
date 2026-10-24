import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationCard } from './components/NotificationCard';
import {
  notify,
  subscribeToNotifications,
  type AppNotification,
} from './notificationBus';

type NotificationContextValue = {
  notify: typeof notify;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Kolejkuje powiadomienia i renderuje je nad całą aplikacją.
 * Jedno powiadomienie jest widoczne naraz - kolejne czekają na swoją kolej.
 */
export function NotificationProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<AppNotification[]>([]);

  useEffect(
    () =>
      subscribeToNotifications((notification) => {
        setQueue((current) => [...current, notification]);
      }),
    [],
  );

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({ notify }), []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationViewport notification={queue[0]} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return context;
}

type NotificationViewportProps = {
  notification?: AppNotification;
  onDismiss: () => void;
};

function NotificationViewport({ notification, onDismiss }: NotificationViewportProps) {
  const { top } = useSafeAreaInsets();

  if (!notification) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { paddingTop: top + 8 }]}
    >
      <NotificationCard
        key={notification.id}
        notification={notification}
        onDismiss={onDismiss}
      />
    </View>
  );
}

// Styl dla widoku powiadomień, który jest absolutnie pozycjonowany nad całą aplikacją
const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
});
