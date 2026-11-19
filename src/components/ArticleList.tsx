/**
 * Lista artykułów z rozwijaniem.
 *
 * @module src/components/ArticleList
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { ArticleRow } from "./ArticleRow";

/** Minimalny kształt artykułu wymagany przez listę. */
type ListArticle = {
  /** Unikalny identyfikator (klucz wiersza). */
  id: string;
  /** Tytuł. */
  title: string;
  /** Zajawka. */
  summary: string;
  /** Język artykułu. */
  language: "pl" | "en";
};

/**
 * Właściwości {@link ArticleList}.
 * @inline
 */
type ArticleListProps<T extends ListArticle> = {
  /** Artykuły do wyświetlenia. */
  items: readonly T[];
  /** Liczba artykułów widocznych przed rozwinięciem (domyślnie 4). */
  previewCount?: number;
  /** Zwraca linię z dodatkowymi informacjami dla artykułu (np. wydawca, data). */
  getMeta: (item: T) => string;
  /** Wywoływane po wybraniu artykułu. */
  onSelect: (item: T) => void;
};

/**
 * Lista artykułów z przyciskiem „Pokaż wszystkie (N)” / „Pokaż mniej”.
 *
 * Przycisk pojawia się tylko wtedy, gdy artykułów jest więcej niż `previewCount`.
 *
 * @typeParam T Typ artykułu (np. news albo artykuł edukacyjny).
 * @param props Właściwości komponentu.
 */

export function ArticleList<T extends ListArticle>({
  items,
  previewCount = 4,
  getMeta,
  onSelect,
}: ArticleListProps<T>) {
  const { colors } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const visibleItems = showAll ? items : items.slice(0, previewCount);
  const canExpand = items.length > previewCount;

  return (
    <View>
      {visibleItems.map((item, index) => (
        <ArticleRow
          key={item.id}
          title={item.title}
          summary={item.summary}
          language={item.language}
          meta={getMeta(item)}
          onPress={() => onSelect(item)}
          divider={index < visibleItems.length - 1 || canExpand}
        />
      ))}

      {canExpand && (
        <Pressable
          onPress={() => setShowAll((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showAll }}
          accessibilityLabel={
            showAll
              ? "Pokaż mniej artykułów"
              : `Pokaż wszystkie artykuły (${items.length})`
          }
          style={({ pressed }) => [
            styles.showAllButton,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Text style={[styles.showAllText, { color: colors.accent }]}>
            {showAll ? "Pokaż mniej" : `Pokaż wszystkie (${items.length})`}
          </Text>
          <Ionicons
            name={showAll ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.accent}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  showAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginBottom: 2,
  },
  showAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
