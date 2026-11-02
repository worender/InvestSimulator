import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Reanimated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLockScreenWhileActive } from "../../interactionLock";
import { useTheme } from "../../theme";

type SettingsSheetProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  height?: `${number}%` | number;
}>;

export function SettingsSheet({
  title,
  subtitle,
  onClose,
  height = "82%",
  children,
}: SettingsSheetProps) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useSharedValue(windowHeight);
  const dragStart = useSharedValue(0);

  useLockScreenWhileActive(true);

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const closeThreshold = Math.max(windowHeight * 0.12, 96);

  const animateClose = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(
      windowHeight,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        "worklet";
        if (finished) runOnJS(finishClose)();
      },
    );
  }, [finishClose, translateY, windowHeight]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [translateY]);

  const createDragGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .onStart(() => {
          cancelAnimation(translateY);
          dragStart.value = translateY.value;
        })
        .onUpdate((event) => {
          const dy = event.translationY;
          const offset = dy > 0 ? dy : Math.max(dy * 0.15, -14);
          translateY.value = Math.max(dragStart.value + offset, -14);
        })
        .onEnd((event) => {
          const shouldClose =
            translateY.value > closeThreshold ||
            (event.translationY > 32 && event.velocityY > 800);

          if (shouldClose) {
            const remaining = Math.max(windowHeight - translateY.value, 0);
            const duration = Math.min(Math.max(remaining * 0.35, 120), 260);
            translateY.value = withTiming(
              windowHeight,
              { duration, easing: Easing.out(Easing.cubic) },
              (finished) => {
                "worklet";
                if (finished) runOnJS(finishClose)();
              },
            );
          } else {
            translateY.value = withSpring(0, {
              damping: 24,
              stiffness: 240,
              mass: 0.9,
              overshootClamping: true,
            });
          }
        }),
    [closeThreshold, dragStart, finishClose, translateY, windowHeight],
  );

  const dragGesture = useMemo(() => createDragGesture(), [createDragGesture]);
  const headerDragGesture = useMemo(
    () => createDragGesture(),
    [createDragGesture],
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, Math.max(windowHeight * 0.5, 1)],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: interpolate(
          translateY.value,
          [0, 80],
          [1, 1.35],
          Extrapolation.CLAMP,
        ),
      },
    ],
    backgroundColor: interpolateColor(
      translateY.value,
      [0, 50],
      [colors.border, colors.accent],
    ),
  }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.modalRoot}>
          <Reanimated.View
            style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}
          >
            <Pressable
              style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
              onPress={animateClose}
              accessibilityLabel="Zamknij ustawienia"
            />
          </Reanimated.View>

          <Reanimated.View
            style={[
              styles.sheet,
              {
                height,
                backgroundColor: colors.background,
                borderColor: colors.borderGlass,
              },
              sheetAnimatedStyle,
            ]}
          >
            <View
              style={[styles.header, { borderBottomColor: colors.borderGlass }]}
            >
              <GestureDetector gesture={dragGesture}>
                <View
                  style={styles.dragArea}
                  accessibilityHint="Przeciągnij w dół, aby zamknąć okno"
                >
                  <Reanimated.View
                    style={[styles.dragHandle, handleAnimatedStyle]}
                  />
                </View>
              </GestureDetector>

              <View style={styles.headerRow}>
                <View style={styles.side} />

                <GestureDetector gesture={headerDragGesture}>
                  <View style={styles.center}>
                    <Text
                      accessibilityRole="header"
                      numberOfLines={1}
                      style={[styles.headerTitle, { color: colors.text }]}
                    >
                      {title}
                    </Text>
                    {subtitle ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.headerSubtitle,
                          { color: colors.textMuted },
                        ]}
                      >
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                </GestureDetector>

                <View style={[styles.side, styles.sideRight]}>
                  <Pressable
                    onPress={animateClose}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Zamknij"
                  >
                    <Ionicons name="close" size={22} color={colors.accent} />
                  </Pressable>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: 28 + bottom },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Reanimated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  dragArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  side: {
    width: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    maxWidth: "100%",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 2,
  },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
});
