import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

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
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.surface,
        { backgroundColor: isDark ? 'rgba(22, 27, 34, 0.72)' : 'rgba(255, 255, 255, 0.78)' },
        style,
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: isDark ? 0.26 : 0.14 }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden' },
});
