import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { YahooNewsItem } from "../api/newsService";
import type { EducationalArticle } from "../database/educationalArticles";
import { useLockScreenWhileActive } from "../interactionLock";
import { notify } from "../notificationBus";
import { useTheme } from "../theme";

type ReadableArticle = YahooNewsItem | EducationalArticle;

type NewsArticleModalProps = {
  article: ReadableArticle;
  onClose: () => void;
};

// Dzieli opis artykułu na akapity
const buildParagraphs = (summary: string): string[] => {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized
    .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim()) ?? [normalized];

  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 3) {
    const paragraph = sentences.slice(index, index + 3).join(" ");
    if (paragraph) paragraphs.push(paragraph);
  }
  return paragraphs;
};

const formatArticleDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function NewsArticleModal({ article, onClose }: NewsArticleModalProps) {
  const theme = useTheme();
  const { colors } = theme;
  const { bottom } = useSafeAreaInsets();

  // Blokuje gesty ekranu pod spodem
  useLockScreenWhileActive(true);

  const [isSaved, setIsSaved] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useSharedValue(windowHeight);
  const dragStart = useSharedValue(0);

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
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [finishClose, translateY, windowHeight]);

  useEffect(() => {
    // Animacja wejścia
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
                if (finished) {
                  runOnJS(finishClose)();
                }
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

  const newsArticle = "topic" in article ? article : null;
  const educationalArticle = "topic" in article ? null : article;

  const paragraphs = newsArticle
    ? buildParagraphs(newsArticle.summary)
    : [...(educationalArticle?.content ?? [])];
  const topicLabel = newsArticle
    ? newsArticle.topic === "poland"
      ? "Polska"
      : "Świat"
    : "Edukacja";
  const languageLabel = article.language === "pl" ? "Polski" : "Angielski";
  const publishedLabel = newsArticle
    ? formatArticleDate(newsArticle.publishedAt)
    : "";
  const headerTitle =
    newsArticle?.publisher ?? educationalArticle?.author ?? article.title;
  const metaLine = newsArticle
    ? `${newsArticle.publisher}${publishedLabel ? ` · ${publishedLabel}` : ""}`
    : `${educationalArticle?.author ?? ""}${educationalArticle ? ` · ${educationalArticle.readMinutes} min czytania` : ""}`;

  const openFullArticle = async () => {
    if (!newsArticle) return;
    try {
      await WebBrowser.openBrowserAsync(newsArticle.link);
    } catch (error) {
      console.error("Nie udało się otworzyć artykułu:", error);
      notify({
        variant: "error",
        title: "Nie udało się otworzyć artykułu",
        message: "Sprawdź połączenie z internetem i spróbuj ponownie.",
      });
    }
  };

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
              accessibilityLabel="Zamknij artykuł"
            />
          </Reanimated.View>

          <Reanimated.View
            style={[
              styles.sheet,
              {
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
                <View style={styles.side}>
                  <Pressable
                    onPress={() => setIsSaved((value) => !value)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isSaved ? "Usuń z zapisanych" : "Zapisz artykuł"
                    }
                  >
                    <Ionicons
                      name={isSaved ? "bookmark" : "bookmark-outline"}
                      size={22}
                      color={isSaved ? colors.accent : colors.textMuted}
                    />
                  </Pressable>
                </View>

                <GestureDetector gesture={headerDragGesture}>
                  <View style={styles.center}>
                    <Text
                      accessibilityRole="header"
                      numberOfLines={1}
                      style={[styles.headerTitle, { color: colors.text }]}
                    >
                      {headerTitle}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.headerSubtitle,
                        { color: colors.textMuted },
                      ]}
                    >
                      {topicLabel} · {languageLabel}
                    </Text>
                  </View>
                </GestureDetector>

                <View style={[styles.side, styles.sideRight]}>
                  {newsArticle && (
                    <Pressable
                      onPress={openFullArticle}
                      hitSlop={10}
                      accessibilityRole="link"
                      accessibilityLabel="Otwórz pełny artykuł w Yahoo Finance"
                    >
                      <Ionicons
                        name="open-outline"
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  )}

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
                { paddingBottom: 32 + bottom },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.metaRow}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                  {topicLabel.toUpperCase()}
                </Text>
                <View
                  style={[styles.languageBadge, { borderColor: colors.accent }]}
                >
                  <Text style={[styles.languageText, { color: colors.accent }]}>
                    {article.language.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.articleTitle, { color: colors.text }]}>
                {article.title}
              </Text>

              <Text style={[styles.byline, { color: colors.textMuted }]}>
                {metaLine}
              </Text>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.borderGlass },
                ]}
              />

              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${article.id}-paragraph-${index}`}
                    style={[styles.paragraph, { color: colors.text }]}
                  >
                    {paragraph}
                  </Text>
                ))
              ) : (
                <Text style={[styles.paragraph, { color: colors.textMuted }]}>
                  Ten materiał nie zawiera jeszcze pełnej treści. Wróć do niego
                  później.
                </Text>
              )}

              <Text style={[styles.footerNote, { color: colors.textMuted }]}>
                {newsArticle
                  ? "Źródło: Yahoo Finance · materiał edukacyjny"
                  : "Materiał edukacyjny przygotowany przez twórców InvestSimulator"}
              </Text>
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
    height: "91%",
    maxHeight: "91%",
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
    width: 56,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  languageBadge: {
    minWidth: 28,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  languageText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  articleTitle: {
    marginTop: 10,
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  byline: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 14,
  },
  footerNote: {
    marginTop: 18,
    fontSize: 11,
    textAlign: "center",
  },
});
