import { Platform, useWindowDimensions } from 'react-native';

export type LayoutMode = 'mobile' | 'tablet' | 'desktop';

// Progi szerokości (px) dla wersji webowej. Poniżej TABLET web wygląda dokładnie jak aplikacja mobilna.
export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Jedno źródło prawdy dla układu ekranu.
 *
 * - aplikacja natywna zawsze dostaje układ mobilny (także na tabletach),
 * - na webie układ zależy od szerokości okna i zmienia się na żywo przy jej zmianie.
 */
export function useLayoutMode() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  let mode: LayoutMode = 'mobile';
  if (isWeb && width >= BREAKPOINTS.desktop) {
    mode = 'desktop';
  } else if (isWeb && width >= BREAKPOINTS.tablet) {
    mode = 'tablet';
  }

  return {
    mode,
    isWeb,
    isMobile: mode === 'mobile',
    isTablet: mode === 'tablet',
    isDesktop: mode === 'desktop',
  };
}
