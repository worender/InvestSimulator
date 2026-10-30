import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

/**
 * Globalna blokada interakcji ekranu pod spodem.
 *
 * Natywny `Modal` w React Native nie blokuje gestów obsługiwanych w warstwie JS
 * (np. `PanResponder` przełączający zakładki). Dzięki temu kontekstowi każdy modal
 * może zgłosić, że jest otwarty, a ekran główny wyłącza wtedy swoje gesty.
 *
 * Licznik (`count`) pozwala bezpiecznie zagnieżdżać modale — blokada zdejmowana jest
 * dopiero po zamknięciu ostatniego.
 */
type InteractionLockContextValue = {
  locked: boolean;
  acquire: () => void;
  release: () => void;
};

const InteractionLockContext = createContext<InteractionLockContextValue | null>(null);

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
 */
export function useLockScreenWhileActive(active: boolean) {
  const { acquire, release } = useInteractionLock();

  useEffect(() => {
    if (!active) return;
    acquire();
    return () => release();
  }, [active, acquire, release]);
}
