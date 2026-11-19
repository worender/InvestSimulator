/**
 * Arkusz ustawiania lub zmiany hasła konta.
 *
 * @module src/components/settings/PasswordSheet
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  hasPassword,
  setPassword,
  verifyPassword,
} from "../../database/passwords";
import { NOTIFICATION_GROUPS, notify } from "../../notificationBus";
import { useTheme } from "../../theme";
import { SettingsSheet } from "./SettingsSheet";

/**
 * Właściwości {@link PasswordSheet}.
 * @inline
 */
type PasswordSheetProps = {
  /** Konto, którego hasło jest zmieniane. */
  userId: number;
  /** Wywoływane przy zamknięciu, także po udanym zapisie. */
  onClose: () => void;
  /** Wywoływane po zapisaniu hasła. */
  onSaved?: () => void;
};

/**
 * Właściwości pola `PasswordField`.
 */
type PasswordFieldProps = {
  /** Etykieta nad polem. */
  label: string;
  /** Wartość. */
  value: string;
  /** Wywoływane przy zmianie tekstu. */
  onChangeText: (value: string) => void;
  /** Podpowiedź w pustym polu. */
  placeholder: string;
};

/**
 * Pole hasła z etykietą i przyciskiem pokazania hasła (bez autokorekty i wielkich liter).
 *
 * @param props Właściwości pola.
 */
function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
}: PasswordFieldProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surfaceMutedGlass,
            borderColor: colors.borderGlass,
          },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={17} color={colors.accent} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: colors.text }]}
        />
        <Pressable
          onPress={() => setVisible((current) => !current)}
          hitSlop={8}
          accessibilityLabel={visible ? "Ukryj hasło" : "Pokaż hasło"}
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Arkusz ustawiania hasła (gdy konto go nie ma) albo zmiany hasła (wymaga
 * podania obecnego).
 *
 * Nowe hasło musi mieć co najmniej 6 znaków i zgadzać się z potwierdzeniem.
 * Hasło jest zapisywane przez `setPassword` (sól + SHA-256). Każdy wynik
 * (błąd walidacji, złe obecne hasło, sukces) jest zgłaszany powiadomieniem.
 *
 * @param props Właściwości komponentu.
 */
export function PasswordSheet({
  userId,
  onClose,
  onSaved,
}: PasswordSheetProps) {
  const { colors } = useTheme();
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    hasPassword(userId)
      .then((value) => {
        if (!active) return;
        setConfigured(value);
        setChecking(false);
      })
      .catch(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = async () => {
    if (newPassword.length < 6) {
      notify({
        variant: "warning",
        title: "Hasło jest za krótkie",
        category: NOTIFICATION_GROUPS.account,
        message: "Ustaw hasło składające się z co najmniej 6 znaków.",
      });
      return;
    }

    if (newPassword !== confirmation) {
      notify({
        variant: "warning",
        title: "Hasła nie są identyczne",
        category: NOTIFICATION_GROUPS.account,
        message: "Wpisz ponownie to samo hasło w obu polach.",
      });
      return;
    }

    setSaving(true);
    try {
      if (configured) {
        const valid = await verifyPassword(userId, currentPassword);
        if (!valid) {
          notify({
            variant: "error",
            title: "Nieprawidłowe hasło",
            category: NOTIFICATION_GROUPS.account,
            message: "Obecne hasło nie jest poprawne. Spróbuj ponownie.",
          });
          return;
        }
      }

      await setPassword(userId, newPassword);
      notify({
        variant: "success",
        title: configured ? "Hasło zmienione" : "Hasło ustawione",
        category: NOTIFICATION_GROUPS.account,
        message: "Od teraz możesz logować się hasłem do swojego konta.",
      });
      onSaved?.();
      onClose();
    } catch {
      notify({
        variant: "error",
        title: "Nie udało się zapisać hasła",
        category: NOTIFICATION_GROUPS.account,
        message: "Spróbuj ponownie za chwilę.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSheet
      title={configured ? "Zmiana hasła" : "Ustaw hasło"}
      subtitle="Autoryzacja"
      height="72%"
      onClose={onClose}
    >
      {checking ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.accentGlass,
                borderColor: colors.borderGlass,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {configured
                ? "Aby ustawić nowe hasło, potwierdź najpierw obecne."
                : "Hasło zabezpieczy dostęp do Twojego konta i ustawień."}
            </Text>
          </View>

          {configured ? (
            <PasswordField
              label="Obecne hasło"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Wpisz obecne hasło"
            />
          ) : null}

          <PasswordField
            label="Nowe hasło"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Minimum 6 znaków"
          />

          <PasswordField
            label="Powtórz nowe hasło"
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Powtórz hasło"
          />

          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: colors.accent,
                opacity: saving ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#ffffff"
                />
                <Text style={styles.saveText}>
                  {configured ? "Zmień hasło" : "Ustaw hasło"}
                </Text>
              </>
            )}
          </Pressable>
        </>
      )}
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 48, alignItems: "center" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  fieldBlock: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 7,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 48,
  },
  input: { flex: 1, fontSize: 14, height: 48 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 8,
  },
  saveText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
});
