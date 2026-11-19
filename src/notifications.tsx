/**
 * Wyświetlanie powiadomień w aplikacji.
 *
 * `NotificationProvider` odbiera komunikaty z szyny `notificationBus`, kolejkuje je
 * i pokazuje po jednym nad całą aplikacją. Natywny `Modal` tworzy osobną warstwę
 * widoku, więc powiadomienie z korzenia aplikacji byłoby pod nim niewidoczne —
 * dlatego wewnątrz modali umieszcza się `NotificationHost`, który przejmuje
 * wyświetlanie, dopóki modal jest otwarty.
 *
 * @module src/notifications
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

/** Wartość kontekstu powiadomień. */
type NotificationContextValue = {
  /** Wysyła powiadomienie (ta sama funkcja co {@link notify} z szyny). */
  notify: typeof notify;
};

/** Kontekst z funkcją `notify`; `null` poza {@link NotificationProvider}. */
const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

/** Wartość kontekstu widoku: bieżące powiadomienie i sterowanie nim. */
type NotificationViewContextValue = {
  /** Powiadomienie aktualnie widoczne (pierwsze w kolejce). */
  notification?: AppNotification;
  /** Ukrywa bieżące powiadomienie i pokazuje następne. */
  dismiss: () => void;
  /** Czas pozostały do ukrycia i informacja, czy powiadomienie było już widoczne. */
  getTiming: (notification: AppNotification) => {
    duration: number;
    alreadyShown: boolean;
  };
};

/** Kontekst widoku powiadomień (wewnętrzny). */
const NotificationViewContext =
  createContext<NotificationViewContextValue | null>(null);

/** Wartość kontekstu warstw powiadomień w natywnych modalach. */
type NotificationLayerContextValue = {
  /** Warstwa, która teraz wyświetla powiadomienia (ostatnio zarejestrowana); `null` — korzeń aplikacji. */
  activeLayerId: number | null;
  /** Rejestruje warstwę i czyni ją aktywną. */
  registerLayer: (id: number) => void;
  /** Wyrejestrowuje warstwę; aktywna staje się poprzednia. */
  unregisterLayer: (id: number) => void;
};

/** Kontekst warstw powiadomień (wewnętrzny). */
const NotificationLayerContext =
  createContext<NotificationLayerContextValue | null>(null);

/**
 * Kolejkuje powiadomienia i renderuje je nad całą aplikacją.
 *
 * Subskrybuje szynę `notificationBus` i trzyma kolejkę (pierwszy element jest
 * widoczny). Pamięta, kiedy każde powiadomienie zostało pokazane, dzięki czemu
 * przeniesienie go między warstwami (np. przy otwarciu modala) nie resetuje
 * licznika czasu ani nie odtwarza animacji wejścia. Gdy żaden
 * {@link NotificationHost} nie jest aktywny, wyświetla powiadomienia sam.
 *
 * @param props Właściwości komponentu; `children` — drzewo aplikacji.
 */
export function NotificationProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<AppNotification[]>([]);
  // Warstwy powiadomień wewnątrz natywnych modali. Modal tworzy osobną
  // warstwę natywną, więc powiadomienie z korzenia aplikacji zostałoby pod nim.
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null);
  const layersRef = useRef<number[]>([]);
  const shownAtRef = useRef<Map<string, number>>(new Map());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(
    () =>
      subscribeToNotifications((notification) => {
        setQueue((current) => mergeNotificationQueue(current, notification));
      }),
    [],
  );

  const dismiss = useCallback(() => {
    setQueue((current) => {
      const [first] = current;
      if (first) {
        shownAtRef.current.delete(first.id);
        seenRef.current.delete(first.id);
      }
      return current.slice(1);
    });
  }, []);

  const getTiming = useCallback((notification: AppNotification) => {
    const now = Date.now();
    const alreadyShown = seenRef.current.has(notification.id);

    let shownAt = shownAtRef.current.get(notification.id);
    if (shownAt === undefined) {
      shownAt = now;
      shownAtRef.current.set(notification.id, shownAt);
    }
    seenRef.current.add(notification.id);

    return {
      duration: Math.max(0, notification.duration - (now - shownAt)),
      alreadyShown,
    };
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
    () => ({ notification: queue[0], dismiss, getTiming }),
    [dismiss, getTiming, queue],
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
            <NotificationViewport
              notification={queue[0]}
              onDismiss={dismiss}
              getTiming={getTiming}
            />
          ) : null}
        </NotificationLayerContext.Provider>
      </NotificationViewContext.Provider>
    </NotificationContext.Provider>
  );
}

/**
 * Zwraca funkcję `notify` z kontekstu powiadomień.
 *
 * Poza komponentami można użyć bezpośrednio {@link notify} z `notificationBus`.
 *
 * @returns Obiekt `{ notify }`.
 * @throws {Error} Gdy hook użyto poza {@link NotificationProvider}.
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }
  return context;
}

/** Licznik używany do nadawania identyfikatorów warstw {@link NotificationHost}. */
let layerSequence = 0;

/**
 * Warstwa powiadomień dla natywnego modala. Należy umieścić ją wewnątrz
 * `<Modal>`, aby komunikaty były widoczne nad jego treścią.
 *
 * Po zamontowaniu rejestruje się jako aktywna warstwa (przy zagnieżdżonych
 * modalach wygrywa ostatnio otwarty), a po odmontowaniu oddaje wyświetlanie
 * poprzedniej warstwie. Renderuje się tylko wtedy, gdy jest aktywna i jest
 * co wyświetlić.
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
        getTiming={viewContext.getTiming}
      />
    </GestureHandlerRootView>
  );
}

/** Właściwości komponentu `NotificationViewport`. */
type NotificationViewportProps = {
  /** Powiadomienie do pokazania; brak — nic nie jest renderowane. */
  notification?: AppNotification;
  /** Wywoływane po zamknięciu lub upływie czasu powiadomienia. */
  onDismiss: () => void;
  /** Zwraca pozostały czas wyświetlania i informację, czy powiadomienie było już widoczne. */
  getTiming: (notification: AppNotification) => {
    duration: number;
    alreadyShown: boolean;
  };
};

/**
 * Pozycjonuje kartę powiadomienia u góry ekranu, z uwzględnieniem bezpiecznego obszaru.
 *
 * @param props Właściwości komponentu (patrz `NotificationViewportProps`).
 */
function NotificationViewport({
  notification,
  onDismiss,
  getTiming,
}: NotificationViewportProps) {
  const { top } = useSafeAreaInsets();

  if (!notification) return null;

  const { duration, alreadyShown } = getTiming(notification);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { paddingTop: top + 8 }]}
    >
      <NotificationCard
        key={notification.id}
        notification={notification}
        duration={duration}
        alreadyShown={alreadyShown}
        onDismiss={onDismiss}
      />
    </View>
  );
}

/** Style warstwy powiadomień, pozycjonowanej absolutnie nad całą aplikacją. */
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
