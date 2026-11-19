/**
 * Globalna blokada interakcji ekranu pod spodem.
 *
 * Natywny `Modal` w React Native nie blokuje gestów obsługiwanych w warstwie JS
 * (np. `PanResponder` przełączający zakładki). Dzięki temu kontekstowi każdy modal
 * może zgłosić, że jest otwarty, a ekran główny wyłącza wtedy swoje gesty.
 *
 * Licznik (`count`) pozwala bezpiecznie zagnieżdżać modale — blokada zdejmowana jest
 * dopiero po zamknięciu ostatniego.
 *
 * @module src/interactionLock
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

/** Wartość kontekstu blokady interakcji. */
type InteractionLockContextValue = {
  /** Czy aktywna jest co najmniej jedna blokada. */
  locked: boolean;
  /** Zakłada blokadę (zwiększa licznik). */
  acquire: () => void;
  /** Zdejmuje blokadę (zmniejsza licznik, nie poniżej zera). */
  release: () => void;
};

/** Kontekst blokady; `null` poza {@link InteractionLockProvider}. */
const InteractionLockContext = createContext<InteractionLockContextValue | null>(null);

/**
 * Dostawca kontekstu blokady interakcji.
 *
 * Licznik blokad jest trzymany w `ref`, a stan `locked` (powodujący ponowny
 * render) zmienia się tylko przy przejściu 0 → 1 i 1 → 0.
 *
 * @param props Właściwości komponentu; `children` — drzewo aplikacji, które ma dostęp do kontekstu.
 */
export function InteractionLockProvider({ children }: PropsWithChildren) {
  const countRef = useRef(0);
  const [locked, setLocked] = useState(false);

  const acquire = useCallback(() => {
    countRef.current += 1;
    if (countRef.current === 1) {
      setLocked(true);
    }
  }, []);

  const release = useCallback(() => {
    countRef.current = Math.max(countRef.current - 1, 0);
    if (countRef.current === 0) {
      setLocked(false);
    }
  }, []);

  const value = useMemo(() => ({ locked, acquire, release }), [locked, acquire, release]);

  return (
    <InteractionLockContext.Provider value={value}>{children}</InteractionLockContext.Provider>
  );
}

/**
 * Zwraca stan blokady interakcji oraz funkcje `acquire` i `release`.
 *
 * @returns Obiekt `{ locked, acquire, release }`.
 * @throws {Error} Gdy hook użyto poza {@link InteractionLockProvider}.
 */
export function useInteractionLock() {
  const context = useContext(InteractionLockContext);
  if (!context) {
    throw new Error('useInteractionLock must be used inside InteractionLockProvider');
  }
  return context;
}

/**
 * Blokuje gesty ekranu pod spodem, dopóki `active` jest true.
 * Sprząta po sobie przy odmontowaniu komponentu.
 *
 * @param active Czy blokada ma być aktywna (zwykle flaga `visible` modala).
 *
 * @example
 * function MyModal({ visible }: { visible: boolean }) {
 *   useLockScreenWhileActive(visible);
 *   return <Modal visible={visible}>...</Modal>;
 * }
 */
export function useLockScreenWhileActive(active: boolean) {
  const { acquire, release } = useInteractionLock();

  useEffect(() => {
    if (!active) return;
    acquire();
    return () => release();
  }, [active, acquire, release]);
}
