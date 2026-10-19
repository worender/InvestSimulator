import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: 120 + bottom }]}>
      <Text style={[styles.intro, { color: colors.textMuted }]}>Twoje decyzje, Twoje tempo nauki.</Text>
      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>WARTOŚĆ PORTFELA</Text>
        <Text style={[styles.total, { color: colors.text }]}>10 000,00 zł</Text>
        <View style={styles.returnRow}>
          <Ionicons name="trending-up" size={18} color={colors.positive} />
          <Text style={[styles.returnText, { color: colors.positive }]}>+0,00 zł (0,00%)</Text>
        </View>
      </View>
      <Text style={[styles.section, { color: colors.text }]}>Twoje aktywa</Text>
      <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="briefcase-outline" size={28} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Portfolio jest puste</Text>
        <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>Kup pierwsze aktywo na ekranie Rynki, aby zobaczyć tu swoją historię.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 32 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  summary: { padding: 20, borderRadius: 8, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  total: { fontSize: 30, fontWeight: '700', marginTop: 8 },
  returnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  returnText: { fontWeight: '600' },
  section: { fontSize: 17, fontWeight: '700', marginTop: 30, marginBottom: 10 },
  empty: { alignItems: 'center', padding: 28, borderRadius: 8, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyCopy: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 7 },
});
