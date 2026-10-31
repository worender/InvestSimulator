import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme";

type SettingsToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

export function SettingsToggle({
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: SettingsToggleProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: 190,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 2 + progress.value * 18 }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={styles.hitArea}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: value ? colors.accent : colors.surfaceMuted,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        <Reanimated.View
          style={[
            styles.thumb,
            {
              backgroundColor: value ? "#ffffff" : colors.textMuted,
            },
            thumbStyle,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: { paddingVertical: 4 },
  track: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
