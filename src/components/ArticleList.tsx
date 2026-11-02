import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { ArticleRow } from "./ArticleRow";

type ListArticle = {
  id: string;
  title: string;
  summary: string;
  language: "pl" | "en";
};

type ArticleListProps<T extends ListArticle> = {
  items: readonly T[];
  previewCount?: number;
  getMeta: (item: T) => string;
  onSelect: (item: T) => void;
};

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
