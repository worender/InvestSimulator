import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Reanimated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';

const TOGGLE_MS = 180;

type ToggleSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
};

// Przełącznik z animowanym przesuwaniem kółka i przejściem kolorów (wspólny dla mobile i webu)
export function ToggleSwitch({ value, onValueChange, accessibilityLabel }: ToggleSwitchProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: TOGGLE_MS });
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surfaceMuted, colors.accent]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.textMuted, '#ffffff']),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [2, 18]) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={styles.pressable}
    >
      <Reanimated.View style={[styles.track, trackStyle]}>
        <Reanimated.View style={[styles.thumb, thumbStyle]} />
      </Reanimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 12 },
  track: { width: 40, height: 24, borderRadius: 12, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10 },
});
