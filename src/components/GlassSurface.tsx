/**
 * Kontener z efektem „liquid glass”.
 *
 * @module src/components/GlassSurface
 */

import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassBackground } from './GlassBackground';

/**
 * Właściwości {@link GlassSurface}.
 * @inline
 */
type GlassSurfaceProps = PropsWithChildren<{
  /** Kolor nakładki barwiącej szkło. */
  tintColor: string;
  /** Siła rozmycia tła (domyślnie 45). */
  intensity?: number;
  /** Dodatkowy styl kontenera. */
  style?: StyleProp<ViewStyle>;
  /** Obsługa dotyku kontenera (domyślnie `'auto'`). */
  pointerEvents?: 'auto' | 'none' | 'box-none';
}>;

/**
 * Kontener z efektem „liquid glass”: tło {@link GlassBackground} pod dowolną treścią.
 *
 * @param props Właściwości komponentu.
 */
export function GlassSurface({
  tintColor,
  intensity = 45,
  style,
  pointerEvents = 'auto',
  children,
}: GlassSurfaceProps) {
  return (
    <View pointerEvents={pointerEvents} style={[styles.surface, style]}>
      <GlassBackground intensity={intensity} tintColor={tintColor} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden' },
});
