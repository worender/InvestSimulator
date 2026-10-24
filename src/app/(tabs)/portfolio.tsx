import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '../../components/GlassSurface';
import { PanelHeader } from '../../components/PanelHeader';
import { Section } from '../../components/Section';
import { useTheme } from '../../theme';
import { useScrollAwareNavigation } from '../../useScrollAwareNavigation';

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const scrollNav = useScrollAwareNavigation();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        title="Moje portfolio"
        left={
          <Pressable disabled accessibilityLabel="Przełącz portfel" hitSlop={8}>
            <Ionicons name="swap-horizontal" size={22} color={colors.accent} />
          </Pressable>
        }
        right={
          <Pressable disabled accessibilityLabel="Dodaj aktywo" hitSlop={8}>
            <Ionicons name="add" size={24} color={colors.textMuted} />
          </Pressable>
        }
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: 38 + bottom }]}
        {...scrollNav}
      >
        <Text style={[styles.intro, { color: colors.textMuted }]}>Twoje decyzje, Twoje tempo nauki.</Text>

        <GlassSurface tintColor={colors.accent} style={[styles.summary, { borderColor: colors.accent }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>WARTOŚĆ PORTFELA</Text>
          <Text style={[styles.total, { color: colors.text }]}>10 000,00 zł</Text>
          <View style={styles.returnRow}>
            <Ionicons name="trending-up" size={18} color={colors.positive} />
            <Text style={[styles.returnText, { color: colors.positive }]}>+0,00 zł (0,00%)</Text>
          </View>
        </GlassSurface>

        <Section label="Twoje aktywa">
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Portfolio jest puste</Text>
            <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
              Kup pierwsze aktywo na ekranie Rynki, aby zobaczyć tu swoją historię.
            </Text>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

// Stylesheet dla komponentu PortfolioScreen (ekran "Portfolio")
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  summary: { borderWidth: 1, borderRadius: 18, padding: 18 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  total: { fontSize: 30, fontWeight: '700', marginTop: 8 },
  returnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  returnText: { fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptyCopy: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 7 },
});
