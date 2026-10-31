import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme";

export type ChoiceOption<T extends string> = {
  key: T;
  label: string;
};

type ChoiceSliderProps<T extends string> = {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

const PADDING = 3;

export function ChoiceSlider<T extends string>({
  options,
  value,
  onChange,
}: ChoiceSliderProps<T>) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.key === value),
  );
  const position = useSharedValue(index);
  const currentIndex = useRef(index);
  const segmentWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;

  useEffect(() => {
    currentIndex.current = index;
    position.value = withTiming(index, {
      duration: 210,
      easing: Easing.out(Easing.cubic),
    });
  }, [index, position]);

  const selectFromX = useCallback(
    (x: number, commit: boolean) => {
      if (segmentWidth <= 0) return;
      const next = Math.min(
        Math.max(Math.round((x - PADDING) / segmentWidth), 0),
        options.length - 1,
      );
      if (next === currentIndex.current) return;
      currentIndex.current = next;
      // eslint-disable-next-line react-hooks/immutability
      position.value = withTiming(next, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
      });
      if (commit) onChange(options[next].key);
    },
    [onChange, options, position, segmentWidth],
  );

  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          selectFromX(event.nativeEvent.locationX, true);
        },
        onPanResponderMove: (event) => {
          selectFromX(event.nativeEvent.locationX, false);
        },
        onPanResponderRelease: (event) => {
          selectFromX(event.nativeEvent.locationX, true);
        },
      }),
    [selectFromX],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * segmentWidth }],
  }));

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={handleLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Wybór opcji"
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.borderGlass,
        },
      ]}
    >
      {segmentWidth > 0 && (
        <Reanimated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: Math.max(segmentWidth - 2, 0),
              backgroundColor: colors.accent,
            },
            indicatorStyle,
          ]}
        />
      )}
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <View key={option.key} style={styles.segment}>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: selected ? "#ffffff" : colors.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: PADDING,
    minWidth: 124,
    height: 32,
    overflow: "hidden",
  },
  indicator: {
    position: "absolute",
    left: PADDING,
    top: PADDING,
    bottom: PADDING,
    borderRadius: 999,
  },
  segment: {
    flex: 1,
    minWidth: 38,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
