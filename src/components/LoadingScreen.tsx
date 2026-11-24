import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

type LoadingScreenProps = {
  promises?: readonly Promise<unknown>[];
  onFinished?: () => void;
  timeoutMs?: number;
  finishDurationMs?: number;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function LoadingScreen({
  promises = [],
  onFinished,
  timeoutMs = 60_000,
  finishDurationMs = 400,
}: LoadingScreenProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (promises.length === 0) return;

    let active = true;
    let timerAnimation: Animated.CompositeAnimation | null = null;
    let finishAnimation: Animated.CompositeAnimation | null = null;
    progress.setValue(0);

    const finishLoading = () => {
      if (!active) return;

      timerAnimation?.stop();
      finishAnimation?.stop();
      finishAnimation = Animated.timing(progress, {
        toValue: 1,
        duration: finishDurationMs,
        useNativeDriver: false,
      });

      finishAnimation.start(({ finished }) => {
        if (!active) return;
        active = false;
        clearTimeout(timeoutId);
        if (finished) onFinished?.();
      });
    };

    const timeoutId = setTimeout(finishLoading, timeoutMs);

    timerAnimation = Animated.timing(progress, {
      toValue: 1,
      duration: timeoutMs,
      useNativeDriver: false,
    });
    timerAnimation.start();

    void Promise.allSettled(promises).then(() => {
      if (active) finishLoading();
    });

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [promises, onFinished, progress, timeoutMs, finishDurationMs]);

  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1],
  });

  const dotX = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [12, 72, 130, 188, 248],
  });

  const dotY = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [100, 72, 88, 42, 64],
  });

  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.18],
  });

  const innerGlowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.35],
  });

  const chartPath = "M12 100 L72 72 L130 88 L188 42 L248 64";

  return (
    <View style={styles.container}>
      <Svg width={260} height={130}>
        <Path
          d={chartPath}
          fill="none"
          stroke="#59636f"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <AnimatedPath
          d={chartPath}
          fill="none"
          stroke="#58a6ff"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="265 265"
          strokeDashoffset={progress.interpolate({
            inputRange: [0, 1],
            outputRange: [265, 0],
          })}
          opacity={opacity}
        />

        <AnimatedCircle
          cx={dotX}
          cy={dotY}
          r={9}
          fill="#58a6ff"
          opacity={glowOpacity}
        />

        <AnimatedCircle
          cx={dotX}
          cy={dotY}
          r={5}
          fill="#58a6ff"
          opacity={innerGlowOpacity}
        />

        <AnimatedCircle
          cx={dotX}
          cy={dotY}
          r={2}
          fill="#58a6ff"
          opacity={opacity}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1117",
  },
});
