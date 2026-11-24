import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type LoadingScreenProps = {
  promises?: readonly Promise<unknown>[];
  onFinished?: () => void;
  timeoutMs?: number;
  finishDurationMs?: number;
};

const EMPTY_PROMISES: readonly Promise<unknown>[] = [];
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CHART_PATH = "M12 100 L72 72 L130 88 L188 42 L248 64";

export function LoadingScreen({
  promises = EMPTY_PROMISES,
  onFinished,
  timeoutMs = 60_000,
  finishDurationMs = 400,
}: LoadingScreenProps) {
  const progress = useSharedValue(0);
  const finishStarted = useSharedValue(false);
  const activeRef = useRef(true);

  const finishCallback = useCallback(() => {
    if (activeRef.current) onFinished?.();
  }, [onFinished]);

  useEffect(() => {
    if (promises.length === 0) return;

    activeRef.current = true;
    progress.value = 0;
    finishStarted.value = false;

    let timerId: ReturnType<typeof setTimeout>;

    const finishLoading = () => {
      if (finishStarted.value) return;
      finishStarted.value = true;
      clearTimeout(timerId);
      cancelAnimation(progress);
      progress.value = withTiming(1, { duration: finishDurationMs }, (finished) => {
        if (finished) runOnJS(finishCallback)();
      });
    };

    timerId = setTimeout(finishLoading, timeoutMs);
    progress.value = withTiming(1, { duration: timeoutMs });

    void Promise.allSettled(promises).then(finishLoading);

    return () => {
      activeRef.current = false;
      clearTimeout(timerId);
      cancelAnimation(progress);
    };
  }, [
    finishCallback,
    finishDurationMs,
    finishStarted,
    promises,
    progress,
    timeoutMs,
  ]);

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [265, 0]),
  }));

  const outerGlowProps = useAnimatedProps(() => ({
    cx: interpolate(progress.value, [0, 0.25, 0.5, 0.75, 1], [12, 72, 130, 188, 248]),
    cy: interpolate(progress.value, [0, 0.25, 0.5, 0.75, 1], [100, 72, 88, 42, 64]),
    opacity: 0.18,
  }));

  const innerGlowProps = useAnimatedProps(() => ({
    cx: interpolate(progress.value, [0, 0.25, 0.5, 0.75, 1], [12, 72, 130, 188, 248]),
    cy: interpolate(progress.value, [0, 0.25, 0.5, 0.75, 1], [100, 72, 88, 42, 64]),
    opacity: 0.35,
  }));

  const dotProps = useAnimatedProps(() => ({
    cx: interpolate(progress.value, [0, 0.25, 0.5, 0.75, 1], [12, 72, 130, 188, 248]),
    cy: interpolate(progress.value, [0, 0.25, 0.5, 0.75, 1], [100, 72, 88, 42, 64]),
    opacity: 1,
  }));

  return (
    <View style={styles.container}>
      <Svg width={260} height={130}>
        <Path
          d={CHART_PATH}
          fill="none"
          stroke="#59636f"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <AnimatedPath
          d={CHART_PATH}
          fill="none"
          stroke="#58a6ff"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="265 265"
          animatedProps={pathProps}
        />

        <AnimatedCircle
          r={9}
          fill="#58a6ff"
          animatedProps={outerGlowProps}
        />
        <AnimatedCircle
          r={5}
          fill="#58a6ff"
          animatedProps={innerGlowProps}
        />
        <AnimatedCircle
          r={2}
          fill="#58a6ff"
          animatedProps={dotProps}
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