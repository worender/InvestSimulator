import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanelHeader } from '../../components/PanelHeader';
import { Section } from '../../components/Section';
import { useTheme } from '../../theme';
import { useLayoutMode } from '../../useLayoutMode';
import { useScrollAwareNavigation } from '../../useScrollAwareNavigation';

// Przykładowe lekcje edukacyjne o inwestowaniu, które są wyświetlane w sekcji "Lekcje" na ekranie AboutScreen
const lessons = [
  ['01', 'Ryzyko i zysk', 'Dlaczego większy potencjalny zysk oznacza też większe ryzyko?'],
  ['02', 'Dywersyfikacja', 'Jak nie wkładać wszystkich jajek do jednego koszyka.'],
  ['03', 'Czytanie wykresu', 'Podstawy poruszania się po danych rynkowych.'],
] as const;

export default function AboutScreen() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const scrollNav = useScrollAwareNavigation();
  const { isDesktop } = useLayoutMode();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        title="O inwestowaniu"
        left={
          <Pressable disabled accessibilityLabel="Zapisane lekcje" hitSlop={8}>
            <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
          </Pressable>
        }
        right={
          <Pressable disabled accessibilityLabel="Pomoc" hitSlop={8}>
            <Ionicons name="help-circle-outline" size={24} color={colors.textMuted} />
          </Pressable>
        }
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop, { paddingBottom: 38 + bottom }]}
        {...scrollNav}
      >
        <Text style={[styles.eyebrow, { color: colors.accent }]}>CENTRUM WIEDZY</Text>
        <Text style={[styles.title, { color: colors.text }]}>Inwestowanie bez skrótów</Text>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          Poznaj podstawy, zanim podejmiesz decyzję. Tutaj ćwiczysz na fikcyjnych danych, bez ryzyka utraty pieniędzy.
        </Text>

        <Section label="Lekcje">
          {lessons.map(([number, title, copy], index) => (
            <View
              key={number}
              style={[
                styles.lesson,
                index < lessons.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.borderGlass,
                },
              ]}
            >
              <Text style={[styles.number, { color: colors.accent }]}>{number}</Text>
              <View style={styles.lessonCopy}>
                <Text style={[styles.lessonTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.copy, { color: colors.textMuted }]}>{copy}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          ))}
        </Section>
      </ScrollView>
    </View>
  );
}

// Stylesheet dla komponentu AboutScreen
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  // Na desktopie tekst w kolumnie o wygodnej do czytania szerokości
  contentDesktop: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 32, paddingTop: 40 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  lead: { fontSize: 15, lineHeight: 23, marginTop: 12 },
  lesson: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  number: { fontSize: 13, fontWeight: '700', width: 32 },
  lessonCopy: { flex: 1, paddingRight: 12 },
  lessonTitle: { fontSize: 15, fontWeight: '700' },
  copy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
