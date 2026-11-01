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
  const activeIndex = useRef(index);
  const lastEmitted = useRef(index);
  const segmentWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;

  useEffect(() => {
    activeIndex.current = index;
    lastEmitted.current = index;
    position.value = withTiming(index, {
      duration: 190,
      easing: Easing.out(Easing.cubic),
    });
  }, [index, position]);

  const moveTo = useCallback(
    (next: number) => {
      if (next === activeIndex.current) return;
      activeIndex.current = next;
      // eslint-disable-next-line react-hooks/immutability
      position.value = withTiming(next, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
    },
    [position],
  );

  const updateFromX = useCallback(
    (x: number, commit: boolean) => {
      if (segmentWidth <= 0) return;
      const raw = (x - PADDING) / segmentWidth;
      const next = Math.min(Math.max(Math.floor(raw), 0), options.length - 1);

      moveTo(next);

      if (commit && next !== lastEmitted.current) {
        lastEmitted.current = next;
        onChange(options[next].key);
      }
    },
    [moveTo, onChange, options, segmentWidth],
  );

  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          updateFromX(event.nativeEvent.locationX, true);
        },
        onPanResponderMove: (event) => {
          updateFromX(event.nativeEvent.locationX, false);
        },
        onPanResponderRelease: (event) => {
          updateFromX(event.nativeEvent.locationX, true);
        },
        onPanResponderTerminate: (event) => {
          updateFromX(event.nativeEvent.locationX, true);
        },
      }),
    [updateFromX],
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
      accessibilityValue={{
        min: 0,
        max: options.length - 1,
        now: index,
        text: options[index]?.label,
      }}
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
          <View key={option.key} pointerEvents="none" style={styles.segment}>
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
    minWidth: 140,
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
