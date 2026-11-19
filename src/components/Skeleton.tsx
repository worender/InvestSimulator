/**
 * Szkielet ładowania (placeholder).
 *
 * @module src/components/Skeleton
 */

import { useEffect, useState } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

/**
 * Szkielet (placeholder) dla elementów, które jeszcze się ładują — prostokąt
 * w kolorze `surfaceMuted` z pulsującym kryciem (0.45 ↔ 0.8, co 0.7 s).
 *
 * @param props Właściwości komponentu.
 * @param props.width Szerokość w px lub procentach (np. `"60%"`).
 * @param props.height Wysokość w px.
 * @param props.radius Promień zaokrąglenia (domyślnie 8).
 * @param props.style Dodatkowy styl.
 */
export function Skeleton({ width, height, radius = 8, style }: { width: number | `${number}%`; height: number; radius?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { width, height, borderRadius: radius, backgroundColor: colors.surfaceMuted, opacity }, style]} />;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
