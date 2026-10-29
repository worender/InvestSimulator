import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanelHeader } from '../../components/PanelHeader';
import { Section } from '../../components/Section';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { Currency, ThemeAccent, useTheme } from '../../theme';
import { useScrollAwareNavigation } from '../../useScrollAwareNavigation';

// Opcje kolorów akcentu dostępne w ustawieniach aplikacji
const accentOptions: ThemeAccent[] = ['Niebieski', 'Fioletowy', 'Zielony', 'Pomarańczowy'];
const accentColors: Record<ThemeAccent, string> = {
  Niebieski: '#0969da',
  Fioletowy : '#8250df',
  Zielony: '#1a7f37',
  Pomarańczowy: '#bc4c00',
};

// Komponent ekranu ustawień aplikacji, umożliwiający użytkownikowi dostosowanie wyglądu, koloru akcentu, waluty i innych preferencji
export default function SettingsScreen() {
  const {
    mode,
    colors,
    toggleMode,
    accent,
    setAccent,
    defaultCurrency,
    setDefaultCurrency,
    multiCurrency,
    setMultiCurrency,
  } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const scrollNav = useScrollAwareNavigation();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const isDark = mode === 'dark';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        title="Ustawienia"
        left={
          <Pressable
            onPress={toggleMode}
            accessibilityLabel={isDark ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'}
            hitSlop={8}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.accent} />
          </Pressable>
        }
        right={
          <Pressable
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            accessibilityLabel="Przewiń do informacji o aplikacji"
            hitSlop={8}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} />
          </Pressable>
        }
      />
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: 38 + bottom }]}
        {...scrollNav}
      >
        <Text style={[styles.intro, { color: colors.textMuted }]}>Dostosuj aplikację do swoich preferencji.</Text>

        <Section label="Wygląd">
          <View style={[styles.settingRow, { borderBottomColor: colors.borderGlass }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.text} />
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>Tryb {isDark ? 'ciemny' : 'jasny'}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Motyw dopasowany do pory dnia</Text>
            </View>
            <ToggleSwitch value={isDark} onValueChange={toggleMode} accessibilityLabel="Tryb ciemny" />
          </View>
        </Section>

        <Section label="Kolor akcentu">
          <View style={styles.accentRow}>
            {accentOptions.map((item) => {
              const active = item === accent;
              return (
                <Pressable key={item} accessibilityRole="button" onPress={() => setAccent(item)} style={styles.accentOption}>
                  <View
                    style={[
                      styles.accentDot,
                      { backgroundColor: accentColors[item] },
                      active && { borderWidth: 2, borderColor: colors.text },
                    ]}
                  />
                  <Text
                    style={[
                      styles.accentLabel,
                      { color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section label="Portfele i waluta">
          <View style={[styles.settingBlock, { borderBottomColor: colors.borderGlass }]}>
            <Text style={[styles.title, { color: colors.text }]}>Domyślna waluta</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Pierwsza karta po otwarciu dashboardu</Text>
            <View style={styles.currencyRow}>
              {(['PLN', 'EUR', 'USD'] as Currency[]).map((item) => {
                const active = defaultCurrency === item;
                return (
                  <Pressable key={item} onPress={() => setDefaultCurrency(item)} style={styles.currencyOption}>
                    <Text
                      style={[
                        styles.currencyText,
                        {
                          color: active ? colors.accent : colors.textMuted,
                          borderBottomColor: active ? colors.accent : 'transparent',
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.borderGlass }]}>
            <Ionicons name="layers-outline" size={20} color={colors.text} />
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>Wiele walut</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Włącz zmianę kart między PLN, EUR i USD</Text>
            </View>
            <ToggleSwitch value={multiCurrency} onValueChange={setMultiCurrency} accessibilityLabel="Wiele walut" />
          </View>
        </Section>

        <Section label="O aplikacji">
          <View style={styles.about}>
            <Text style={[styles.title, { color: colors.text }]}>InvestSimulator</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Wersja edukacyjna 1.0</Text>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

// Stylesheet dla komponentu SettingsScreen (ekran "Ustawienia")
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  intro: { fontSize: 15, lineHeight: 22 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingBlock: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  copy: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 4 },
  accentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, paddingVertical: 4 },
  accentOption: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 2 },
  accentDot: { width: 12, height: 12, borderRadius: 6 },
  accentLabel: { fontSize: 12, textTransform: 'capitalize' },
  currencyRow: { flexDirection: 'row', gap: 18, marginTop: 12 },
  currencyOption: { paddingVertical: 2 },
  currencyText: { fontSize: 12, fontWeight: '700', paddingBottom: 4, borderBottomWidth: 2 },
  about: { paddingVertical: 4 },
});
