import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

type NavigationVisibilityContextValue = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

const NavigationVisibilityContext = createContext<NavigationVisibilityContextValue | null>(null);

export function NavigationVisibilityProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(true);
  const value = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <NavigationVisibilityContext.Provider value={value}>
      {children}
    </NavigationVisibilityContext.Provider>
  );
}

export function useNavigationVisibility() {
  const context = useContext(NavigationVisibilityContext);
  if (!context) {
    throw new Error('useNavigationVisibility must be used inside NavigationVisibilityProvider');
  }
  return context;
}
