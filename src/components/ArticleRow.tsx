import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type ArticleLanguage = "pl" | "en";

type ArticleRowProps = {
  title: string;
  summary?: string;
  language?: ArticleLanguage;
  meta?: string;
  onPress: () => void;
  divider?: boolean;
};

/**
 * Pojedynczy artykuł w bloku kategorii
 */
export function ArticleRow({
  title,
  summary,
  language,
  meta,
  onPress,
  divider = true,
}: ArticleRowProps) {
  const { colors } = useTheme();
  const languageLabel = language?.toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${languageLabel ? `, język ${languageLabel}` : ""}`}
      style={({ pressed }) => [
        styles.row,
        divider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderGlass,
        },
        { opacity: pressed ? 0.62 : 1 },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {languageLabel && (
          <View style={[styles.languageBadge, { borderColor: colors.accent }]}>
            <Text style={[styles.languageText, { color: colors.accent }]}>
              {languageLabel}
            </Text>
          </View>
        )}
      </View>

      {summary ? (
        <Text
          style={[styles.summary, { color: colors.textMuted }]}
          numberOfLines={2}
        >
          {summary}
        </Text>
      ) : null}

      {meta ? (
        <Text
          style={[styles.meta, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  languageBadge: {
    marginTop: 2,
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
  summary: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});
