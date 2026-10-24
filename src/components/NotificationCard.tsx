import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { AppNotification, NotificationVariant } from '../notificationBus';
import { useTheme } from '../theme';

type NotificationCardProps = {
  notification: AppNotification;
  onDismiss: () => void;
};

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 240,
  mass: 0.9,
  overshootClamping: true,
};

const EXIT_DISTANCE = 220;

const VARIANT_ICONS: Record<NotificationVariant, keyof typeof Ionicons.glyphMap> = {
  error: 'alert-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  info: 'information-circle',
};

// Komponent karty powiadomienia, wyświetlany w górnej części ekranu
export function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
  const { colors } = useTheme();
  const [paused, setPaused] = useState(false);

  const translateY = useSharedValue(-EXIT_DISTANCE);
  const opacity = useSharedValue(0);
  const isClosing = useSharedValue(0);

  const variantColor = {
    error: colors.negative,
    success: colors.positive,
    warning: colors.warning,
    info: colors.accent,
  }[notification.variant];

  const finishDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Animacja wejścia
  useEffect(() => {
    translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 200 });
  }, [opacity, translateY]);

  const closeUp = useCallback(() => {
    if (isClosing.value) return;
    // eslint-disable-next-line react-hooks/immutability
    isClosing.value = 1;
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(
      -EXIT_DISTANCE,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(finishDismiss)();
        }
      },
    );
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withTiming(0, { duration: 200 });
  }, [finishDismiss, isClosing, opacity, translateY]);

  // Automatyczne zwijanie
  useEffect(() => {
    if (paused) return;
    const timeout = setTimeout(() => closeUp(), notification.duration);
    return () => clearTimeout(timeout);
  }, [closeUp, notification.duration, paused]);

  // Gest przeciągania w górę, aby zamknąć powiadomienie
  const createGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .onStart(() => {
          cancelAnimation(translateY);
          cancelAnimation(opacity);
          runOnJS(setPaused)(true);
        })
        .onUpdate((event) => {
          const dy =
            Math.min(event.translationY, 0) + Math.max(event.translationY, 0) * 0.2;
          translateY.value = dy;
          opacity.value = interpolate(
            Math.abs(dy),
            [0, 220],
            [1, 0.4],
            Extrapolation.CLAMP,
          );
        })
        .onEnd((event) => {
          const closingUp = translateY.value < -60 || event.velocityY < -900;

          if (closingUp) {
            if (isClosing.value) return;
            isClosing.value = 1;
            translateY.value = withTiming(
              -EXIT_DISTANCE,
              { duration: 200, easing: Easing.out(Easing.cubic) },
              (finished) => {
                'worklet';
                if (finished) {
                  runOnJS(finishDismiss)();
                }
              },
            );
            opacity.value = withTiming(0, { duration: 180 });
            return;
          }
          translateY.value = withSpring(0, SPRING_CONFIG);
          opacity.value = withTiming(1, { duration: 140 });
          runOnJS(setPaused)(false);
        }),
    [finishDismiss, isClosing, opacity, translateY],
  );

  const gesture = useMemo(
    () =>
      createGesture(),
    [createGesture],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Reanimated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderGlass,
          },
          animatedStyle,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${variantColor}1f` }]}>
          <Ionicons name={VARIANT_ICONS[notification.variant]} size={20} color={variantColor} />
        </View>

        <View style={styles.copy}>
          <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
            {notification.title}
          </Text>
          {notification.message ? (
            <Text numberOfLines={3} style={[styles.message, { color: colors.textMuted }]}>
              {notification.message}
            </Text>
          ) : null}
        </View>
      </Reanimated.View>
    </GestureDetector>
  );
}

// Stylesheet dla komponentu NotificationCard (karta powiadomienia)
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    elevation: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
