import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

export default function SettingsScreen() {
  const { mode, colors, toggleMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.intro, { color: colors.textMuted }]}>Dostosuj aplikację do swoich preferencji.</Text>
      <Text style={[styles.section, { color: colors.textMuted }]}>WYGLĄD</Text>
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={19} color={colors.text} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>Tryb {isDark ? 'ciemny' : 'jasny'}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Motyw GitHub dopasowany do pory dnia</Text>
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: isDark }} onPress={toggleMode} style={[styles.switch, { backgroundColor: isDark ? colors.accent : colors.surfaceMuted }]}>
          <View style={[styles.thumb, { backgroundColor: isDark ? '#ffffff' : colors.textMuted, transform: [{ translateX: isDark ? 18 : 2 }] }]} />
        </Pressable>
      </View>
      <Text style={[styles.section, { color: colors.textMuted }]}>O APLIKACJI</Text>
      <View style={[styles.about, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>InvestSimulator</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Wersja edukacyjna 1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 28 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 8, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 12 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 4 },
  switch: { width: 40, height: 24, borderRadius: 12, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10 },
  about: { borderTopWidth: 1, paddingTop: 16 },
});
