import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LineChart } from 'react-native-wagmi-charts';
import { searchInstruments } from '../api/marketService';
import { MockPortfolio, PortfolioAssetItem } from '../database/mockPortfolioData';
import {
  InstrumentFilterCategory,
  SEARCHABLE_INSTRUMENTS,
  SearchableInstrument,
} from '../database/mockSearchableInstruments';
import { notify } from '../notificationBus';
import { useTheme } from '../theme';

interface TradeInstrumentViewProps {
  portfolio: MockPortfolio;
  initialAsset?: PortfolioAssetItem | null;
  onMarketClosedAlert: (
    instrument: SearchableInstrument,
    orderType: 'BUY' | 'SELL',
    quantity: number,
    total: number,
  ) => void;
}

const FILTER_CATEGORIES: {
  key: InstrumentFilterCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'ALL', label: 'Wszystkie', icon: 'apps-outline' },
  { key: 'STOCKS', label: 'Akcje', icon: 'trending-up-outline' },
  { key: 'BONDS', label: 'Obligacje', icon: 'document-text-outline' },
  { key: 'CFD', label: 'CFD', icon: 'swap-horizontal-outline' },
  { key: 'CRYPTO', label: 'Krypto', icon: 'logo-bitcoin' },
];

type InputMode = 'quantity' | 'amount';

export function TradeInstrumentView({
  portfolio,
  initialAsset,
  onMarketClosedAlert,
}: TradeInstrumentViewProps) {
  const { colors, mode } = useTheme();
  const { width } = useWindowDimensions();
  const isDark = mode === 'dark';

  // Wyszukiwarka i filtr
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InstrumentFilterCategory>('ALL');
  const [yahooResults, setYahooResults] = useState<SearchableInstrument[]>([]);
  const [isSearchingYahoo, setIsSearchingYahoo] = useState(false);

  // Wybrany aktywny instrument do transakcji (nadpisany przez wybór użytkownika)
  const [selectedInstrumentOverride, setSelectedInstrumentOverride] =
    useState<SearchableInstrument | null>(null);

  const activeInstrument = useMemo(() => {
    if (selectedInstrumentOverride) return selectedInstrumentOverride;
    if (initialAsset) {
      const match = SEARCHABLE_INSTRUMENTS.find((i) => i.symbol === initialAsset.symbol);
      if (match) return match;
    }
    return SEARCHABLE_INSTRUMENTS[0];
  }, [selectedInstrumentOverride, initialAsset]);

  // Widok transakcji jest teraz zamontowany na stałe (pager zakładek), więc gdy
  // w szczegółach zmienimy instrument, ręczny wybór w tym widoku przestaje obowiązywać.
  const [lastInitialSymbol, setLastInitialSymbol] = useState<string | null>(
    initialAsset?.symbol ?? null,
  );
  const initialSymbol = initialAsset?.symbol ?? null;
  if (initialSymbol !== lastInitialSymbol) {
    setLastInitialSymbol(initialSymbol);
    if (selectedInstrumentOverride) {
      setSelectedInstrumentOverride(null);
    }
  }

  // Wartość pola wyboru ilości / kwoty
  const isCrypto = activeInstrument.category === 'CRYPTO';
  const [inputMode, setInputMode] = useState<InputMode>('quantity');
  const [quantityStr, setQuantityStr] = useState('1');
  const [amountStr, setAmountStr] = useState('');

  // Animacja strzałki zmieniającej tryb wprowadzania
  const modeRotation = useSharedValue(0);
  const modeRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${modeRotation.value}deg` }],
  }));

  // Pobieranie wyników z Yahoo Search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingYahoo(true);
        const results = await searchInstruments(q);
        if (!isMounted) return;

        const mapped: SearchableInstrument[] = results.slice(0, 4).map((r, idx) => ({
          id: `yahoo-${r.symbol}-${idx}`,
          symbol: r.symbol,
          name: r.name || r.symbol,
          category: 'STOCKS',
          categoryLabel: `${r.exchangeName || r.exchange || 'Giełda'} (Yahoo)`,
          exchange: r.exchange || 'GLOBAL',
          currency: portfolio.currency,
          price: 100.0 + (idx + 1) * 24.5,
          changePercent: 1.25,
          isMarketOpen: false,
          marketOpenTimeInfo: 'Rynek zagraniczny otworzy się w godzinach kolejnej sesji.',
          chartPoints: [
            { timestamp: 1, value: 95 },
            { timestamp: 2, value: 98 },
            { timestamp: 3, value: 103 },
            { timestamp: 4, value: 101 },
            { timestamp: 5, value: 124 },
          ],
        }));

        setYahooResults(mapped);
      } catch {
        // błąd obsłużony cicho
      } finally {
        if (isMounted) setIsSearchingYahoo(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, portfolio.currency]);

  // Filtrowanie instrumentów
  const filteredInstruments = useMemo(() => {
    const isQueryValid = searchQuery.trim().length >= 2;
    const combined = [...SEARCHABLE_INSTRUMENTS, ...(isQueryValid ? yahooResults : [])];
    const q = searchQuery.trim().toLowerCase();

    return combined.filter((inst) => {
      const matchesCategory =
        selectedCategory === 'ALL' || inst.category === selectedCategory;
      const matchesQuery =
        !q ||
        inst.symbol.toLowerCase().includes(q) ||
        inst.name.toLowerCase().includes(q) ||
        inst.categoryLabel.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery, yahooResults]);

  // Sprawdzenie ile jednostek użytkownik aktualnie posiada w tym portfelu
  const ownedQuantity = useMemo(() => {
    for (const cat of portfolio.categories) {
      const found = cat.items.find((it) => it.symbol === activeInstrument.symbol);
      if (found) return found.ownedQuantity;
    }
    return 0;
  }, [portfolio, activeInstrument]);

  // Obliczenia ilości i kosztów
  const parseNumber = (value: string) => parseFloat(value.replace(',', '.')) || 0;

  // Tryb za kwotę
  const parsedAmount = parseNumber(amountStr);
  const amountDerivedQuantity =
    activeInstrument.price > 0
      ? Math.floor((parsedAmount / activeInstrument.price) * 100) / 100
      : 0;
  const parsedQuantity = inputMode === 'amount' ? amountDerivedQuantity : parseNumber(quantityStr);
  const totalCost = parsedQuantity * activeInstrument.price;

  // Walidacje
  const hasEnoughCash = totalCost <= portfolio.cashBalance && parsedQuantity > 0;
  const hasEnoughUnits = ownedQuantity >= parsedQuantity && parsedQuantity > 0 && ownedQuantity > 0;

  const formatNumber = (num: number, maxDecimals = 2) =>
    num.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });

  const handleStepQuantity = (delta: number) => {
    if (inputMode === 'amount') {
      const next = Math.max(0, parsedAmount + delta * 100);
      setAmountStr(next.toFixed(2));
      return;
    }
    const step = isCrypto ? (delta > 0 ? 0.05 : -0.05) : delta;
    const nextVal = Math.max(0, parsedQuantity + step);
    setQuantityStr(isCrypto ? nextVal.toFixed(2) : Math.round(nextVal).toString());
  };

  // Zmiana trybu: za ilość <-> za kwotę
  const handleToggleInputMode = () => {
    modeRotation.value = withTiming(modeRotation.value + 180, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });

    if (inputMode === 'quantity') {
      setAmountStr((parsedQuantity * activeInstrument.price).toFixed(2));
      setInputMode('amount');
    } else {
      setQuantityStr(parsedQuantity.toFixed(2));
      setInputMode('quantity');
    }
  };

  const handleSetMaxForBuy = () => {
    if (activeInstrument.price <= 0) return;

    if (inputMode === 'amount') {
      setAmountStr(portfolio.cashBalance.toFixed(2));
      return;
    }

    const maxQty = portfolio.cashBalance / activeInstrument.price;
    setQuantityStr(isCrypto ? (Math.floor(maxQty * 100) / 100).toFixed(2) : Math.floor(maxQty).toString());
  };

  const handleSetMaxForSell = () => {
    if (inputMode === 'amount') {
      setAmountStr((ownedQuantity * activeInstrument.price).toFixed(2));
      return;
    }
    setQuantityStr(isCrypto ? ownedQuantity.toFixed(3) : ownedQuantity.toString());
  };

  const handleExecuteBuy = () => {
    if (!hasEnoughCash) {
      notify({
        variant: 'warning',
        title: 'Brak środków',
        message: 'Nie posiadasz wystarczających środków na zakup tej ilości.',
      });
      return;
    }

    if (!activeInstrument.isMarketOpen) {
      onMarketClosedAlert(activeInstrument, 'BUY', parsedQuantity, totalCost);
      return;
    }

    notify({
      variant: 'success',
      title: 'Zlecenie zrealizowane',
      message: `Pomyślnie kupiono ${parsedQuantity} szt. ${activeInstrument.symbol} za ${formatNumber(totalCost)} ${activeInstrument.currency}.`,
    });
  };

  const handleExecuteSell = () => {
    if (!hasEnoughUnits) {
      notify({
        variant: 'warning',
        title: 'Brak jednostek',
        message: 'Nie posiadasz wystarczającej liczby jednostek do sprzedaży.',
      });
      return;
    }

    if (!activeInstrument.isMarketOpen) {
      onMarketClosedAlert(activeInstrument, 'SELL', parsedQuantity, totalCost);
      return;
    }

    notify({
      variant: 'success',
      title: 'Zlecenie sprzedaży zrealizowane',
      message: `Pomyślnie sprzedano ${parsedQuantity} szt. ${activeInstrument.symbol} za ${formatNumber(totalCost)} ${activeInstrument.currency}.`,
    });
  };

  const chartWidth = Math.max(width - 56, 260);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Pasek wyszukiwania */}
      <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Szukaj (Yahoo, GPW, Krypto, Obligacje)..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {isSearchingYahoo ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Filtry kategorii */}
      <View style={styles.filtersHeader}>
        <Text style={[styles.filtersLabel, { color: colors.textMuted }]}>FILTR KATEGORII</Text>
        <Text style={[styles.filtersCount, { color: colors.textMuted }]}>
          {filteredInstruments.length} wyników
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPillsContainer}
      >
        {FILTER_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive
                    ? colors.accent
                    : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isActive ? colors.accent : colors.border,
                },
              ]}
            >
              <Ionicons
                name={cat.icon}
                size={13}
                color={isActive ? '#ffffff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.filterPillText,
                  { color: isActive ? '#ffffff' : colors.text },
                  isActive && styles.filterPillTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Horyzontalna lista instrumentów */}
      {filteredInstruments.length === 0 && (
        <Text style={[styles.emptyResults, { color: colors.textMuted }]}>
          Brak instrumentów dla wybranych filtrów.
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.resultsList}
      >
        {filteredInstruments.map((item) => {
          const isSelected = activeInstrument.symbol === item.symbol;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedInstrumentOverride(item)}
              style={[
                styles.instrumentChip,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(59, 130, 246, 0.25)'
                      : 'rgba(59, 130, 246, 0.12)'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipSymbol, { color: isSelected ? colors.accent : colors.text }]}>
                {item.symbol}
              </Text>
              <Text style={[styles.chipPrice, { color: colors.textMuted }]}>
                {formatNumber(item.price)} {item.currency}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Aktywny instrument */}
      <View style={styles.instrumentSection}>
        <View style={styles.instrumentMetaRow}>
          <View>
            <View style={styles.symbolBadgeRow}>
              <Text style={[styles.activeSymbol, { color: colors.text }]}>
                {activeInstrument.symbol}
              </Text>
              <Text style={[styles.categoryBadge, { color: colors.accent, borderColor: colors.accent }]}>
                {activeInstrument.categoryLabel}
              </Text>
            </View>
            <Text style={[styles.activeName, { color: colors.textMuted }]} numberOfLines={1}>
              {activeInstrument.name}
            </Text>
          </View>

          <View style={styles.activePriceCol}>
            <Text style={[styles.activePrice, { color: colors.text }]}>
              {formatNumber(activeInstrument.price)} {activeInstrument.currency}
            </Text>
            <View style={styles.marketStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: activeInstrument.isMarketOpen ? '#10b981' : '#ef4444' },
                ]}
              />
              <Text
                style={[
                  styles.marketStatusText,
                  { color: activeInstrument.isMarketOpen ? '#10b981' : '#ef4444' },
                ]}
              >
                {activeInstrument.isMarketOpen ? 'Otwarty' : 'Zamknięty'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pomniejszony wykres*/}
        <View style={styles.chartWrapper}>
          <LineChart.Provider data={activeInstrument.chartPoints}>
            <LineChart height={84} width={chartWidth}>
              <LineChart.Path color={colors.accent} width={2.2} />
            </LineChart>
          </LineChart.Provider>
        </View>

        {/* Informacja o posiadanych jednostkach i wolnych środkach */}
        <View style={[styles.portfolioStatusRow, { borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.statusMiniLabel, { color: colors.textMuted }]}>Posiadasz:</Text>
            <Text style={[styles.statusMiniVal, { color: colors.text }]}>
              {ownedQuantity} szt.
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.statusMiniLabel, { color: colors.textMuted }]}>Wolne środki:</Text>
            <Text style={[styles.statusMiniVal, { color: colors.text }]}>
              {formatNumber(portfolio.cashBalance)} {portfolio.currencySymbol}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tradeControls}>
        <View style={styles.quantitySelectorRow}>
          <Pressable
            onPress={handleToggleInputMode}
            accessibilityRole="button"
            accessibilityLabel={
              inputMode === 'quantity'
                ? 'Przełącz na kupowanie za kwotę'
                : 'Przełącz na kupowanie za ilość'
            }
            hitSlop={8}
            style={({ pressed }) => [styles.modeToggle, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Reanimated.View style={modeRotationStyle}>
              <Ionicons name="sync-outline" size={17} color={colors.accent} />
            </Reanimated.View>
          </Pressable>

          <Pressable
            onPress={() => handleStepQuantity(-1)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </Pressable>

          <View style={[styles.quantityInputWrapper, { borderColor: colors.accent }]}>
            <TextInput
              value={inputMode === 'quantity' ? quantityStr : amountStr}
              onChangeText={inputMode === 'quantity' ? setQuantityStr : setAmountStr}
              keyboardType="numeric"
              style={[styles.quantityInput, { color: colors.text }]}
              textAlign="center"
            />
            <Text style={[styles.quantityUnit, { color: colors.textMuted }]}>
              {inputMode === 'quantity' ? 'szt.' : activeInstrument.currency}
            </Text>
          </View>

          <Pressable
            onPress={() => handleStepQuantity(1)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* W trybie kwoty pokazujemy, ile jednostek zostanie kupionych */}
        {inputMode === 'amount' && (
          <Text style={[styles.derivedQuantity, { color: colors.textMuted }]}>
            Otrzymasz: <Text style={{ color: colors.text, fontWeight: '700' }}>
              {parsedQuantity.toFixed(2)} szt.
            </Text>
          </Text>
        )}

        <View style={styles.quickShortcutsRow}>
          <Pressable
            onPress={handleSetMaxForBuy}
            style={[styles.shortcutBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.shortcutBtnText, { color: colors.accent }]}>Maks. kupno</Text>
          </Pressable>
          {ownedQuantity > 0 && (
            <Pressable
              onPress={handleSetMaxForSell}
              style={[styles.shortcutBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.shortcutBtnText, { color: colors.accent }]}>Całość ({ownedQuantity})</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.totalCalcRow}>
          <Text style={[styles.totalCalcLabel, { color: colors.textMuted }]}>
            {inputMode === 'quantity' ? 'Łącznie:' : 'Kwota:'}
          </Text>
          <Text style={[styles.totalCalcVal, { color: colors.text }]}>
            {formatNumber(totalCost)} {activeInstrument.currency}
          </Text>
        </View>

        {/* Przyciski Kup i Sprzedaj */}
        <View style={styles.actionButtonsCol}>
          <Pressable
            onPress={handleExecuteBuy}
            disabled={!hasEnoughCash}
            style={({ pressed }) => [
              styles.tradeBtn,
              {
                backgroundColor: hasEnoughCash ? '#10b981' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                opacity: !hasEnoughCash ? 0.45 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.tradeBtnText, { color: hasEnoughCash ? '#ffffff' : colors.textMuted }]}>
              Kup (za {formatNumber(totalCost)} {activeInstrument.currency})
            </Text>
          </Pressable>

          {!hasEnoughCash && parsedQuantity > 0 && (
            <Text style={[styles.validationWarning, { color: '#ef4444' }]}>
              Brak wystarczających środków ({formatNumber(Math.max(0, totalCost - portfolio.cashBalance))} {portfolio.currencySymbol}).
            </Text>
          )}

          <Pressable
            onPress={handleExecuteSell}
            disabled={!hasEnoughUnits}
            style={({ pressed }) => [
              styles.tradeBtn,
              {
                backgroundColor: hasEnoughUnits ? '#ef4444' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                opacity: !hasEnoughUnits ? 0.45 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.tradeBtnText, { color: hasEnoughUnits ? '#ffffff' : colors.textMuted }]}>
              Sprzedaj (za {formatNumber(totalCost)} {activeInstrument.currency})
            </Text>
          </Pressable>

          {!hasEnoughUnits && (
            <Text style={[styles.validationWarning, { color: colors.textMuted }]}>
              {ownedQuantity === 0
                ? 'Brak pozycji w portfelu.'
                : `Dostępne do sprzedaży: ${ownedQuantity} szt.`}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// StyleSheet dla komponentu TradeInstrumentView
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filtersLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  filtersCount: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyResults: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterPillTextActive: {
    fontWeight: '700',
  },
  resultsList: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  instrumentChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  chipSymbol: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipPrice: {
    fontSize: 10,
    marginTop: 1,
  },
  instrumentSection: {
    marginBottom: 18,
  },
  instrumentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  symbolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeSymbol: {
    fontSize: 19,
    fontWeight: '800',
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 0.8,
  },
  activeName: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  activePriceCol: {
    alignItems: 'flex-end',
  },
  activePrice: {
    fontSize: 17,
    fontWeight: '700',
  },
  marketStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  marketStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  chartWrapper: {
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginVertical: 4,
  },
  portfolioStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusMiniLabel: {
    fontSize: 10,
    fontWeight: '400',
  },
  statusMiniVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  tradeControls: {
    paddingTop: 6,
  },
  modeToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  derivedQuantity: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: -2,
    marginBottom: 10,
  },
  quantitySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.2,
    paddingHorizontal: 10,
  },
  quantityInput: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 44,
  },
  quantityUnit: {
    fontSize: 12,
    marginLeft: 4,
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shortcutBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  shortcutBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  totalCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  totalCalcLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  totalCalcVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonsCol: {
    gap: 8,
  },
  tradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tradeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  validationWarning: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: -2,
    marginBottom: 2,
  },
});
