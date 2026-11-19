/**
 * Sekcja z opcjonalnym nagłówkiem.
 *
 * @module src/components/Section
 */

import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

/**
 * Właściwości {@link Section}.
 * @inline
 */
type SectionProps = PropsWithChildren<{
  /** Nagłówek sekcji; brak — sekcja bez nagłówka. */
  label?: string;
  /** Pierwsza sekcja na ekranie — bez górnego odstępu (domyślnie `false`). */
  first?: boolean;
}>;

/**
 * Sekcja z opcjonalnym nagłówkiem, używana do grupowania elementów interfejsu.
 *
 * @param props Właściwości komponentu.
 */
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
