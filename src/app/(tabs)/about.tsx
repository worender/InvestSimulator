import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurTargetView } from "expo-blur";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
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
import { getActiveAccountId } from "../../database/activeAccount";
import {
  getEducationalArticles,
  getSavedArticleSlugs,
  setArticleSaved,
} from "../../database/database";
import type { EducationalArticle } from "../../database/educationalArticles";
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

// Metadane artykułu edukacyjnego: kategoria i czas czytania
const formatEducationalMeta = (item: EducationalArticle): string =>
  `${item.category} · ${item.readMinutes} min czytania`;

const isEducationalArticle = (
  article: ReadableArticle,
): article is EducationalArticle => "readMinutes" in article;

// Szkielet listy wyświetlany podczas ładowania artykułów
function ArticleListSkeleton({ borderColor }: { borderColor: string }) {
  return (
    <View>
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonRow,
            item < 2 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: borderColor,
            },
          ]}
        >
          <Skeleton width="84%" height={16} />
          <Skeleton width="100%" height={12} />
          <Skeleton width="36%" height={10} />
        </View>
      ))}
    </View>
  );
}

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

  // Artykuły edukacyjne odczytywane z lokalnej bazy danych
  const [educationalArticles, setEducationalArticles] = useState<
    EducationalArticle[] | null
  >(null);

  // Artykuły „do przeczytania później” aktywnego konta (tabela saved_article)
  const [savedSlugs, setSavedSlugs] = useState<readonly string[]>([]);

  useEffect(() => {
    let active = true;

    getEducationalArticles()
      .then((articles) => {
        if (active) setEducationalArticles(articles);
      })
      .catch((error) => {
        console.error("Nie udało się wczytać artykułów edukacyjnych:", error);
        if (!active) return;
        setEducationalArticles([]);
        notify({
          variant: "error",
          title: "Nie udało się wczytać artykułów",
          message: "Spróbuj ponownie uruchomić aplikację.",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  // Zapisane artykuły odświeżane przy każdym wejściu na zakładkę,
  // bo w międzyczasie użytkownik mógł przełączyć konto w ustawieniach
  useFocusEffect(
    useCallback(() => {
      let active = true;

      getActiveAccountId()
        .then(getSavedArticleSlugs)
        .then((slugs) => {
          if (active) setSavedSlugs(slugs);
        })
        .catch((error) => {
          console.error("Nie udało się wczytać zapisanych artykułów:", error);
          if (!active) return;
          notify({
            variant: "error",
            title: "Nie udało się wczytać zapisanych artykułów",
            message: "Lista „Zapisane” może być niepełna.",
          });
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const savedArticles = useMemo(
    () =>
      savedSlugs
        .map((slug) => educationalArticles?.find((item) => item.id === slug))
        .filter((article): article is EducationalArticle => !!article),
    [educationalArticles, savedSlugs],
  );

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

  const toggleSaved = async (article: ReadableArticle) => {
    const previous = savedSlugs;
    const exists = previous.includes(article.id);
    const next = exists
      ? previous.filter((slug) => slug !== article.id)
      : [article.id, ...previous];

    // Natychmiastowa zmiana w UI, cofana, jeśli zapis do bazy się nie uda
    setSavedSlugs(next);
    if (next.length === 0) {
      setExpandedCategory((category) =>
        category === "saved" ? null : category,
      );
    }

    try {
      await setArticleSaved(article.id, !exists, await getActiveAccountId());
    } catch (error) {
      console.error("Nie udało się zapisać zakładki:", error);
      setSavedSlugs(previous);
      notify({
        variant: "error",
        title: exists
          ? "Nie udało się usunąć z zapisanych"
          : "Nie udało się zapisać artykułu",
        message: "Spróbuj ponownie za chwilę.",
      });
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
                  "Otwórz artykuł edukacyjny i dotknij ikony zakładki, aby dodać go do kategorii „Zapisane”.",
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
            count={educationalArticles?.length}
            expanded={expandedCategory === "educational"}
            onToggle={() => toggleCategory("educational")}
          >
            {educationalArticles === null ? (
              <ArticleListSkeleton borderColor={colors.borderGlass} />
            ) : educationalArticles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="school-outline"
                  size={28}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Brak artykułów
                </Text>
                <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
                  Nie udało się wczytać artykułów edukacyjnych z bazy danych.
                </Text>
              </View>
            ) : (
              <ArticleList
                items={educationalArticles}
                previewCount={3}
                getMeta={formatEducationalMeta}
                onSelect={setSelectedArticle}
              />
            )}
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
                getMeta={formatEducationalMeta}
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
                  <ArticleListSkeleton borderColor={colors.borderGlass} />
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
          saved={savedSlugs.includes(selectedArticle.id)}
          // Zakładki dotyczą artykułów z bazy; newsy Yahoo nie są w niej zapisywane
          onToggleSaved={
            isEducationalArticle(selectedArticle) ? toggleSaved : undefined
          }
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
