/**
 * Kontekst widoczności dolnej nawigacji (paska zakładek).
 *
 * Ekrany mogą chować pasek podczas przewijania (patrz `useScrollAwareNavigation`),
 * a układ zakładek odczytuje flagę i animuje pasek.
 *
 * @module src/navigationVisibility
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

/** Wartość kontekstu widoczności nawigacji. */
type NavigationVisibilityContextValue = {
  /** Czy pasek nawigacji jest widoczny. */
  visible: boolean;
  /** Pokazuje (`true`) lub chowa (`false`) pasek nawigacji. */
  setVisible: (visible: boolean) => void;
};

/** Kontekst widoczności; `null` poza {@link NavigationVisibilityProvider}. */
const NavigationVisibilityContext = createContext<NavigationVisibilityContextValue | null>(null);

/**
 * Dostawca kontekstu widoczności nawigacji. Na starcie pasek jest widoczny.
 *
 * @param props Właściwości komponentu; `children` — drzewo aplikacji, które ma dostęp do kontekstu.
 */
export function NavigationVisibilityProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(true);
  const value = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <NavigationVisibilityContext.Provider value={value}>
      {children}
    </NavigationVisibilityContext.Provider>
  );
}

/**
 * Zwraca stan widoczności nawigacji i funkcję do jego zmiany.
 *
 * @returns Obiekt `{ visible, setVisible }`.
 * @throws {Error} Gdy hook użyto poza {@link NavigationVisibilityProvider}.
 */
export function useNavigationVisibility() {
  const context = useContext(NavigationVisibilityContext);
  if (!context) {
    throw new Error('useNavigationVisibility must be used inside NavigationVisibilityProvider');
  }
  return context;
}
