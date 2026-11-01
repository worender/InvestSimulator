import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurTargetView } from "expo-blur";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getYahooNewsByTopic,
  NEWS_TOPICS,
  type NewsTopic,
  type YahooNewsItem,
} from "../../api/newsService";
import { ArticleList } from "../../components/ArticleList";
import { ExpandableCategoryBlock } from "../../components/ExpandableCategoryBlock";
import {
  NewsArticleModal,
  type ReadableArticle,
} from "../../components/NewsArticleModal";
import { PANEL_HEADER_HEIGHT, PanelHeader } from "../../components/PanelHeader";
import { Skeleton } from "../../components/Skeleton";
import {
  EDUCATIONAL_ARTICLES,
  type EducationalArticle,
} from "../../database/educationalArticles";
import { notify } from "../../notificationBus";
import { useTheme } from "../../theme";
import { useScrollAwareNavigation } from "../../useScrollAwareNavigation";

// Ikona nagłówka dla każdej kategorii newsów
const TOPIC_ICONS: Record<NewsTopic, keyof typeof Ionicons.glyphMap> = {
  poland: "flag-outline",
  world: "globe-outline",
};

// Metadane artykułu: wydawca i data publikacji
const formatNewsMeta = (item: YahooNewsItem): string => {
  const date = new Date(item.publishedAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  return [item.publisher, dateLabel].filter(Boolean).join(" · ");
};

// Metadane artykułu zapisanego
const formatSavedMeta = (item: ReadableArticle): string =>
  "readMinutes" in item
    ? `Edukacja · ${item.readMinutes} min czytania`
    : `${formatNewsMeta(item)} · ${item.topic === "poland" ? "Polska" : "Świat"}`;

// Mock: dwa istniejące artykuły startowo obecne w kategorii „Zapisane”
const MOCK_SAVED_ARTICLES: readonly ReadableArticle[] = ["edu-01", "edu-04"]
  .map((id) => EDUCATIONAL_ARTICLES.find((article) => article.id === id))
  .filter((article): article is EducationalArticle => article !== undefined);

export default function AboutScreen() {
  const { colors } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();

  const [newsByTopic, setNewsByTopic] = useState<
    Record<NewsTopic, YahooNewsItem[]>
  >({
    poland: [],
    world: [],
  });
  const [loadingNews, setLoadingNews] = useState(true);
  // Tylko jedna kategoria może być rozwinięta jednocześnie
  // Na start otwarta jest edukacja
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "educational",
  );

  // Aktualnie otwarty artykuł w modalu
  const [selectedArticle, setSelectedArticle] =
    useState<ReadableArticle | null>(null);

  // Artykuły zapisane przez użytkownika tymaczsowo w stanie komponentu (w przyszłości w bazie danych)
  const [savedArticles, setSavedArticles] =
    useState<readonly ReadableArticle[]>(MOCK_SAVED_ARTICLES);

  useEffect(() => {
    let active = true;

    getYahooNewsByTopic(12).then((items) => {
      if (!active) return;
      setNewsByTopic(items);
      setLoadingNews(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategory((current) => (current === category ? null : category));
  };

  const toggleSaved = (article: ReadableArticle) => {
    const exists = savedArticles.some((item) => item.id === article.id);
    const next = exists
      ? savedArticles.filter((item) => item.id !== article.id)
      : [article, ...savedArticles];

    setSavedArticles(next);
    if (next.length === 0) {
      setExpandedCategory((category) =>
        category === "saved" ? null : category,
      );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        blurTarget={blurTargetRef}
        title="O inwestowaniu"
        left={
          <Pressable
            onPress={() =>
              notify({
                variant: "info",
                title: "Zapisane artykuły",
                message:
                  "Otwórz artykuł i dotknij ikony zakładki, aby dodać go do kategorii „Zapisane”.",
              })
            }
            accessibilityLabel="Zapisane artykuły"
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
          </Pressable>
        }
        right={
          <Pressable
            onPress={() =>
              notify({
                variant: "info",
                title: "Centrum wiedzy",
                message:
                  "Rozwiń blok kategorii, aby zobaczyć artykuły i najnowsze newsy rynkowe.",
              })
            }
            accessibilityLabel="Pomoc"
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={colors.textMuted}
            />
          </Pressable>
        }
      />

      <BlurTargetView ref={blurTargetRef} style={styles.body}>
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: 38 + bottom,
              paddingTop: top + PANEL_HEADER_HEIGHT + 8,
            },
          ]}
          showsVerticalScrollIndicator={false}
          {...scrollNav}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Centrum wiedzy
          </Text>

          <ExpandableCategoryBlock
            title="Artykuły edukacyjne"
            icon="school-outline"
            count={EDUCATIONAL_ARTICLES.length}
            expanded={expandedCategory === "educational"}
            onToggle={() => toggleCategory("educational")}
          >
            <ArticleList
              items={EDUCATIONAL_ARTICLES}
              previewCount={3}
              getMeta={(item) => `${item.readMinutes} min czytania`}
              onSelect={setSelectedArticle}
            />
          </ExpandableCategoryBlock>

          {savedArticles.length > 0 && (
            <ExpandableCategoryBlock
              title="Zapisane"
              icon="bookmark-outline"
              count={savedArticles.length}
              expanded={expandedCategory === "saved"}
              onToggle={() => toggleCategory("saved")}
            >
              <ArticleList
                items={savedArticles}
                previewCount={3}
                getMeta={formatSavedMeta}
                onSelect={setSelectedArticle}
              />
            </ExpandableCategoryBlock>
          )}

          {NEWS_TOPICS.map((topic) => {
            const topicArticles = newsByTopic[topic.id];

            return (
              <ExpandableCategoryBlock
                key={topic.id}
                title={topic.label}
                icon={TOPIC_ICONS[topic.id]}
                count={loadingNews ? undefined : topicArticles.length}
                expanded={expandedCategory === topic.id}
                onToggle={() => toggleCategory(topic.id)}
              >
                {loadingNews ? (
                  <View>
                    {[0, 1, 2].map((item) => (
                      <View
                        key={`${topic.id}-skeleton-${item}`}
                        style={[
                          styles.skeletonRow,
                          item < 2 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.borderGlass,
                          },
                        ]}
                      >
                        <Skeleton width="84%" height={16} />
                        <Skeleton width="100%" height={12} />
                        <Skeleton width="36%" height={10} />
                      </View>
                    ))}
                  </View>
                ) : topicArticles.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name={TOPIC_ICONS[topic.id]}
                      size={28}
                      color={colors.textMuted}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      Brak newsów
                    </Text>
                    <Text
                      style={[styles.emptyCopy, { color: colors.textMuted }]}
                    >
                      Nie udało się pobrać materiałów z kategorii „{topic.label}
                      ”. Spróbuj ponownie później.
                    </Text>
                  </View>
                ) : (
                  <ArticleList
                    items={topicArticles}
                    previewCount={2}
                    getMeta={formatNewsMeta}
                    onSelect={setSelectedArticle}
                  />
                )}
              </ExpandableCategoryBlock>
            );
          })}
        </ScrollView>
      </BlurTargetView>

      {selectedArticle && (
        <NewsArticleModal
          key={selectedArticle.id}
          article={selectedArticle}
          saved={savedArticles.some((item) => item.id === selectedArticle.id)}
          onToggleSaved={toggleSaved}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </View>
  );
}

// Stylesheet dla ekranu "Nauka"
const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  title: {
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 20,
  },
  skeletonRow: {
    paddingVertical: 14,
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
