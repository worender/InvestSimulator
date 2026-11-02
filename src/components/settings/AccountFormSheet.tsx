import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { pickAvatar } from "../../settings/avatars";
import { useTheme } from "../../theme";
import { AccountAvatar } from "./AccountAvatar";
import { SettingsSheet } from "./SettingsSheet";

type AccountFormSheetProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  initialName?: string;
  initialAvatar?: string | null;
  onClose: () => void;
  onSaved: (input: { name: string; avatarUri: string | null }) => Promise<void>;
};

export function AccountFormSheet({
  title,
  subtitle,
  submitLabel,
  initialName = "",
  initialAvatar = null,
  onClose,
  onSaved,
}: AccountFormSheetProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(initialName);
  const [avatarUri, setAvatarUri] = useState<string | null>(initialAvatar);
  const [saving, setSaving] = useState(false);

  const chooseAvatar = async () => {
    const picked = await pickAvatar();
    if (picked) setAvatarUri(picked);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      await onSaved({ name: trimmed, avatarUri });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSheet
      title={title}
      subtitle={subtitle}
      height="68%"
      onClose={onClose}
    >
      <View style={styles.avatarBlock}>
        <AccountAvatar uri={avatarUri} name={name || "Konto"} size={88} accentBorder />
        <View style={styles.avatarActions}>
          <Pressable
            onPress={chooseAvatar}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.avatarButton,
              {
                backgroundColor: colors.accentGlass,
                borderColor: colors.borderGlass,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="image-outline" size={17} color={colors.accent} />
            <Text style={[styles.avatarButtonText, { color: colors.accent }]}>
              Wybierz zdjęcie
            </Text>
          </Pressable>

          {avatarUri ? (
            <Pressable
              onPress={() => setAvatarUri(null)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.avatarButton,
                {
                  backgroundColor: colors.negativeGlass,
                  borderColor: colors.borderGlass,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={colors.negative}
              />
              <Text
                style={[styles.avatarButtonText, { color: colors.negative }]}
              >
                Usuń
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>
        NAZWA KONTA
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="np. Konto inwestora"
        placeholderTextColor={colors.textMuted}
        maxLength={32}
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surfaceMutedGlass,
            borderColor: colors.borderGlass,
          },
        ]}
      />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Nazwa będzie widoczna na górze ustawień i na ekranie logowania.
      </Text>

      <Pressable
        onPress={save}
        disabled={!name.trim() || saving}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: colors.accent,
            opacity: !name.trim() || saving ? 0.45 : pressed ? 0.8 : 1,
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
            <Text style={styles.saveText}>{submitLabel}</Text>
          </>
        )}
      </Pressable>
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  avatarBlock: { alignItems: "center", marginBottom: 22 },
  avatarActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
  },
  avatarButtonText: { fontSize: 12, fontWeight: "700" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 7,
    marginLeft: 2,
  },
  input: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "600",
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  saveText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
});
