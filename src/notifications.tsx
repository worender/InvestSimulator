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
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationCard } from "./components/NotificationCard";
import {
  mergeNotificationQueue,
  notify,
  subscribeToNotifications,
  type AppNotification,
} from "./notificationBus";

type NotificationContextValue = {
  notify: typeof notify;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

type NotificationViewContextValue = {
  notification?: AppNotification;
  dismiss: () => void;
};

const NotificationViewContext =
  createContext<NotificationViewContextValue | null>(null);

type NotificationLayerContextValue = {
  activeLayerId: number | null;
  registerLayer: (id: number) => void;
  unregisterLayer: (id: number) => void;
};

const NotificationLayerContext =
  createContext<NotificationLayerContextValue | null>(null);

// Kolejkuje powiadomienia i renderuje je nad całą aplikacją
export function NotificationProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<AppNotification[]>([]);
  // Warstwy powiadomień wewnątrz natywnych modali. Modal tworzy osobną
  // warstwę natywną, więc powiadomienie z korzenia aplikacji zostałoby pod nim.
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null);
  const layersRef = useRef<number[]>([]);

  useEffect(
    () =>
      subscribeToNotifications((notification) => {
        setQueue((current) => mergeNotificationQueue(current, notification));
      }),
    [],
  );

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  const registerLayer = useCallback((id: number) => {
    layersRef.current = [
      ...layersRef.current.filter((layerId) => layerId !== id),
      id,
    ];
    setActiveLayerId(id);
  }, []);

  const unregisterLayer = useCallback((id: number) => {
    layersRef.current = layersRef.current.filter((layerId) => layerId !== id);
    setActiveLayerId(layersRef.current[layersRef.current.length - 1] ?? null);
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({ notify }), []);
  const viewValue = useMemo<NotificationViewContextValue>(
    () => ({ notification: queue[0], dismiss }),
    [dismiss, queue],
  );
  const layerValue = useMemo<NotificationLayerContextValue>(
    () => ({ activeLayerId, registerLayer, unregisterLayer }),
    [activeLayerId, registerLayer, unregisterLayer],
  );

  return (
    <NotificationContext.Provider value={value}>
      <NotificationViewContext.Provider value={viewValue}>
        <NotificationLayerContext.Provider value={layerValue}>
          {children}
          {/* Warstwa zapasowa dla ekranów, które nie są natywnymi modalami. */}
          {activeLayerId === null ? (
            <NotificationViewport notification={queue[0]} onDismiss={dismiss} />
          ) : null}
        </NotificationLayerContext.Provider>
      </NotificationViewContext.Provider>
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }
  return context;
}

let layerSequence = 0;

/**
 * Warstwa powiadomień dla natywnego modala. Należy umieścić ją wewnątrz
 * `<Modal>`, aby komunikaty były widoczne nad jego treścią
 */
export function NotificationHost() {
  const layerContext = useContext(NotificationLayerContext);
  const viewContext = useContext(NotificationViewContext);
  const [layerId] = useState(() => ++layerSequence);

  const registerLayer = layerContext?.registerLayer;
  const unregisterLayer = layerContext?.unregisterLayer;

  useEffect(() => {
    if (!registerLayer || !unregisterLayer) return undefined;
    registerLayer(layerId);
    return () => unregisterLayer(layerId);
  }, [layerId, registerLayer, unregisterLayer]);

  if (
    !layerContext ||
    !viewContext ||
    layerContext.activeLayerId !== layerId ||
    !viewContext.notification
  ) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.hostRoot} pointerEvents="box-none">
      <NotificationViewport
        notification={viewContext.notification}
        onDismiss={viewContext.dismiss}
      />
    </GestureHandlerRootView>
  );
}

type NotificationViewportProps = {
  notification?: AppNotification;
  onDismiss: () => void;
};

function NotificationViewport({
  notification,
  onDismiss,
}: NotificationViewportProps) {
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
  hostRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 24,
  },
  viewport: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 24,
  },
});
