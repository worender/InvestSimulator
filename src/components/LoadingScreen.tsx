import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function LoadingScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [1, 1, 0],
  });

  const dotX = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [12, 72, 130, 188, 248],
  });

  const dotY = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [100, 72, 88, 42, 64],
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
          r={6}
          fill="#ffffff"
          stroke="#58a6ff"
          strokeWidth={4}
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