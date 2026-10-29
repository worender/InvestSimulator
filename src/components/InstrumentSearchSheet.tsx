import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { InstrumentSearchResult, searchInstruments } from '../api/marketService';
import { useTheme } from '../theme';
import { Skeleton } from './Skeleton';

interface InstrumentSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (instrument: InstrumentSearchResult) => void;
}

const SEARCH_DEBOUNCE_MS = 280;

/**
 * Overlay do wyszukiwania i wyboru instrumentu, który ma zostać dodany do portfela.
 * Współdzielony przez zieloną kartę w siatce oraz pozycję "Dodaj instrument" w menu headera.
 */
export function InstrumentSearchSheet({ visible, onClose, onSelect }: InstrumentSearchSheetProps) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const { height } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstrumentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Wyszukiwanie z opóźnieniem, aby nie odpytywać API po każdym znaku.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let active = true;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchInstruments(trimmed);
        if (active) setResults(found);
      } catch (error) {
        console.error('Błąd wyszukiwania instrumentów:', error);
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const showPrompt = trimmedQuery.length < 2;
  const visibleResults = showPrompt ? [] : results;
  const isSearching = !showPrompt && loading;

  // Wybór instrumentu zamyka klawiaturę i przekazuje wynik do ekranu nadrzędnego.
  const handleSelect = (instrument: InstrumentSearchResult) => {
    Keyboard.dismiss();
    onSelect(instrument);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Rozmyte tło overlayu */}
        <BlurView
          intensity={isDark ? 45 : 30}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(5, 8, 12, 0.55)' : 'rgba(0, 0, 0, 0.22)' },
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Zamknij wyszukiwanie instrumentów"
        />

        <View
          style={[
            styles.card,
            {
              maxHeight: Math.min(height * 0.7, 520),
              backgroundColor: isDark ? 'rgba(22, 27, 34, 0.96)' : 'rgba(255, 255, 255, 0.97)',
              borderColor: colors.borderGlass,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Dodaj instrument</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Szukaj po nazwie lub tickerze
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Zamknij"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Pole wyszukiwania */}
          <View
            style={[
              styles.searchField,
              { borderColor: colors.borderGlass, backgroundColor: colors.surfaceMutedGlass },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.accent} />
            <TextInput
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                if (value.trim().length < 2) {
                  setResults([]);
                  setLoading(false);
                }
              }}
              placeholder="Nazwa lub ticker, np. Apple"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={10}
                accessibilityLabel="Wyczyść wyszukiwanie"
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {showPrompt ? (
              <View style={styles.state}>
                <Ionicons name="search-outline" size={30} color={colors.textMuted} />
                <Text style={[styles.stateTitle, { color: colors.text }]}>Zacznij pisać</Text>
                <Text style={[styles.stateCopy, { color: colors.textMuted }]}>
                  Wpisz co najmniej 2 znaki, aby zobaczyć instrumenty.
                </Text>
              </View>
            ) : isSearching ? (
              <View style={styles.skeletons}>
                {[0, 1, 2].map((item) => (
                  <View key={item} style={styles.skeletonRow}>
                    <Skeleton width="55%" height={14} />
                    <Skeleton width="32%" height={10} style={styles.skeletonSubline} />
                  </View>
                ))}
              </View>
            ) : visibleResults.length === 0 ? (
              <View style={styles.state}>
                <Ionicons name="alert-circle-outline" size={30} color={colors.textMuted} />
                <Text style={[styles.stateTitle, { color: colors.text }]}>Brak wyników</Text>
                <Text style={[styles.stateCopy, { color: colors.textMuted }]}>
                  Spróbuj innego tickera lub nazwy spółki.
                </Text>
              </View>
            ) : (
              visibleResults.map((result) => (
                <Pressable
                  key={`${result.symbol}-${result.exchange}`}
                  onPress={() => handleSelect(result)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    {
                      borderBottomColor: colors.borderGlass,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <View style={styles.resultCopy}>
                    <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                      {result.name}
                    </Text>
                    <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                      {result.symbol} · {result.exchangeName}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: 'hidden',
    flexShrink: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  searchField: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
    paddingVertical: 0,
  },
  list: {
    marginTop: 8,
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: 4,
  },
  state: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 6,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  stateCopy: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  skeletons: {
    paddingTop: 6,
  },
  skeletonRow: {
    paddingVertical: 12,
  },
  skeletonSubline: {
    marginTop: 7,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultCopy: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultMeta: {
    fontSize: 11,
    marginTop: 3,
  },
});
