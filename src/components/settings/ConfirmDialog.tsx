import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Anuluj",
  icon = "help-circle-outline",
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { colors, mode, accent } = useTheme();
  const isDark = mode === "dark";
  const tone = destructive ? colors.negative : accent;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView
          intensity={isDark ? 50 : 35}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark
                ? "rgba(24, 28, 38, 0.96)"
                : "rgba(255, 255, 255, 0.98)",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(0, 0, 0, 0.08)",
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: destructive
                  ? colors.negativeGlass
                  : colors.accentGlass,
              },
            ]}
          >
            <Ionicons name={icon} size={30} color={tone} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancel,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.05)",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirm,
                {
                  backgroundColor: destructive ? colors.negative : accent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },
  cancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelText: { fontSize: 13, fontWeight: "600" },
  confirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
});
