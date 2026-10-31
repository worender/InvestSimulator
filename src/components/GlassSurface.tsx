import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassBackground } from './GlassBackground';

type GlassSurfaceProps = PropsWithChildren<{
  tintColor: string;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'auto' | 'none' | 'box-none';
}>;

// Komponent z efektem liquidglass
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
