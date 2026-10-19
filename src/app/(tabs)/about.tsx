import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export default function AboutScreen() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const lessons = [
    ['01', 'Ryzyko i zysk', 'Dlaczego większy potencjalny zysk oznacza też większe ryzyko?'],
    ['02', 'Dywersyfikacja', 'Jak nie wkładać wszystkich jajek do jednego koszyka.'],
    ['03', 'Czytanie wykresu', 'Podstawy poruszania się po danych rynkowych.'],
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: 120 + bottom }]}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>CENTRUM WIEDZY</Text>
      <Text style={[styles.title, { color: colors.text }]}>Inwestowanie bez skrótów</Text>
      <Text style={[styles.lead, { color: colors.textMuted }]}>Poznaj podstawy, zanim podejmiesz decyzję. Tutaj ćwiczysz na fikcyjnych danych, bez ryzyka utraty pieniędzy.</Text>
      {lessons.map(([number, title, copy]) => (
        <View key={number} style={[styles.lesson, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.number, { color: colors.accent }]}>{number}</Text>
          <View style={styles.lessonCopy}>
            <Text style={[styles.lessonTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.copy, { color: colors.textMuted }]}>{copy}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 32 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  lead: { fontSize: 15, lineHeight: 23, marginTop: 12, marginBottom: 26 },
  lesson: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 8, marginBottom: 10 },
  number: { fontSize: 13, fontWeight: '700', width: 32 },
  lessonCopy: { flex: 1, paddingRight: 12 },
  lessonTitle: { fontSize: 15, fontWeight: '700' },
  copy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
