import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SearchableInstrument } from '../database/mockSearchableInstruments';
import { useTheme } from '../theme';

interface MarketClosedNoticeModalProps {
  visible: boolean;
  instrument: SearchableInstrument | null;
  orderType: 'BUY' | 'SELL';
  quantity: number;
  totalCost: number;
  onConfirmPendingOrder: () => void;
  onClose: () => void;
}

export function MarketClosedNoticeModal({
  visible,
  instrument,
  orderType,
  quantity,
  totalCost,
  onConfirmPendingOrder,
  onClose,
}: MarketClosedNoticeModalProps) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  if (!instrument) return null;

  const isBuy = orderType === 'BUY';
  const actionLabel = isBuy ? 'Kupno' : 'Sprzedaż';
  const formatNumber = (val: number) =>
    val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Rozmyte tło */}
        <BlurView
          intensity={isDark ? 50 : 35}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Wyśrodkowana karta powiadomienia modalnego */}
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? 'rgba(24, 28, 38, 0.94)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {/* Ikona ostrzeżenia o zamkniętym rynku */}
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={32} color="#f59e0b" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Rynek jest obecnie zamknięty</Text>

          <Text style={[styles.description, { color: colors.textMuted }]}>
            Giełda dla instrumentu <Text style={{ fontWeight: '700', color: colors.text }}>{instrument.symbol} ({instrument.exchange})</Text> aktualnie nie prowadzi sesji handlowej.
          </Text>

          {/* Kiedy zakup będzie mógł zostać dokonany */}
          <View
            style={[
              styles.openTimeBox,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.10)',
                borderColor: '#f59e0b44',
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
            <Text style={[styles.openTimeText, { color: colors.text }]}>
              {instrument.marketOpenTimeInfo || 'Sesja rozpocznie się w kolejnym dniu roboczym.'}
            </Text>
          </View>

          {/* Podsumowanie zlecenia oczekującego */}
          <View
            style={[
              styles.summaryContainer,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Typ dyspozycji:</Text>
              <Text style={[styles.summaryValue, { color: isBuy ? '#10b981' : '#ef4444' }]}>
                {actionLabel} (Zlecenie z limitem)
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Wielkość:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {quantity} szt.
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Szacowana wartość:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatNumber(totalCost)} {instrument.currency}
              </Text>
            </View>
          </View>

          <Text style={[styles.noticeFootnote, { color: colors.textMuted }]}>
            Zostanie utworzone <Text style={{ fontWeight: '600', color: colors.text }}>zlecenie oczekujące</Text>, które zrealizuje się po otwarciu rynku.
          </Text>

          {/* Przyciski akcji */}
          <View style={styles.actionsCol}>
            <Pressable
              onPress={onConfirmPendingOrder}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.confirmBtnText}>Złóż zlecenie oczekujące</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Anuluj</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  openTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 14,
  },
  openTimeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  summaryContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  noticeFootnote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  actionsCol: {
    width: '100%',
    gap: 8,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelBtn: {
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

