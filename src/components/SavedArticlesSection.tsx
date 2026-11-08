import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ReadableArticle } from "./NewsArticleModal";
import { useSavedArticles } from "../savedArticles";
import { useTheme } from "../theme";
import { ArticleList } from "./ArticleList";
import { NewsArticleModal } from "./NewsArticleModal";

const formatMeta = (item: ReadableArticle) => {
  if ("readMinutes" in item) {
    return `Edukacja · ${item.readMinutes} min czytania`;
  }
  const date = new Date(item.publishedAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  return [item.publisher, dateLabel].filter(Boolean).join(" · ");
};

export function SavedArticlesSection() {
  const { colors } = useTheme();
  const { articles, isSaved, toggle } = useSavedArticles();
  const [selected, setSelected] = useState<ReadableArticle | null>(null);

  if (articles.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Brak zapisanych artykułów
        </Text>
        <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
          Otwórz materiał w zakładce Nauka i dotknij ikony zakładki, aby dodać
          go tutaj.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <ArticleList
        items={articles}
        previewCount={3}
        getMeta={formatMeta}
        onSelect={setSelected}
      />

      {selected && (
        <NewsArticleModal
          key={selected.id}
          article={selected}
          saved={isSaved(selected.id)}
          onToggleSaved={toggle}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyCopy: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
