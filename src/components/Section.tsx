import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

type SectionProps = PropsWithChildren<{
  label?: string;
  first?: boolean;
}>;

// Komponent sekcji z opcjonalnym nagłówkiem, używany do grupowania elementów w interfejsie użytkownika
export function Section({ label, first = false, children }: SectionProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, first && styles.first]}>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginBottom: 8 },
  first: { marginTop: 0 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
});
