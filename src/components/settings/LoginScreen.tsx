import Ionicons from "@expo/vector-icons/Ionicons";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hasPassword, verifyPassword } from "../../database/passwords";
import { useTheme } from "../../theme";
import { AccountAvatar } from "./AccountAvatar";

export function LoginScreen() {
  const { colors, accounts, activeAccount, switchAccount, login } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState(
    () => activeAccount?.id ?? accounts[0]?.id ?? 1,
  );
  const [protectedAccount, setProtectedAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedAccount =
    accounts.find((account) => account.id === selectedId) ?? accounts[0];

  useEffect(() => {
    let active = true;
    if (!selectedAccount) return;
    hasPassword(selectedAccount.id).then((value) => {
      if (active) setProtectedAccount(value);
    });
    return () => {
      active = false;
    };
  }, [selectedAccount]);

  const finishLogin = async () => {
    if (!selectedAccount) return;
    if (selectedAccount.id !== activeAccount?.id) {
      await switchAccount(selectedAccount.id);
    }
    await login();
  };

  const signIn = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);

    try {
      if (protectedAccount) {
        const valid = await verifyPassword(selectedAccount.id, password);
        if (!valid) {
          setError("Nieprawidłowe hasło. Spróbuj ponownie.");
          return;
        }
      }
      await finishLogin();
    } finally {
      setLoading(false);
    }
  };

  const signInWithBiometrics = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);

    try {
      const available = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!available || !enrolled) {
        setError("Biometria nie jest dostępna na tym urządzeniu.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Zaloguj się do InvestSimulator",
        cancelLabel: "Anuluj",
      });

      if (!result.success) {
        setError("Nie udało się potwierdzić tożsamości.");
        return;
      }

      await finishLogin();
    } finally {
      setLoading(false);
    }
  };

  if (!selectedAccount) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: top + 34, paddingBottom: bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.logo, { backgroundColor: colors.accentGlass }]}
        >
          <Ionicons name="trending-up" size={28} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Witaj ponownie
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Wybierz konto i zaloguj się do InvestSimulator.
        </Text>

        <View
          style={[
            styles.accountList,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderGlass,
            },
          ]}
        >
          {accounts.map((account, index) => {
            const selected = account.id === selectedAccount.id;
            return (
              <Pressable
                key={account.id}
                onPress={() => {
                  setSelectedId(account.id);
                  setPassword("");
                  setError(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.accountRow,
                  {
                    borderBottomWidth:
                      index < accounts.length - 1
                        ? StyleSheet.hairlineWidth
                        : 0,
                    borderBottomColor: colors.borderGlass,
                    backgroundColor: selected
                      ? colors.accentGlass
                      : "transparent",
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <AccountAvatar
                  uri={account.avatar_uri}
                  name={account.username}
                  size={38}
                />
                <Text
                  style={[
                    styles.accountName,
                    { color: selected ? colors.accent : colors.text },
                  ]}
                >
                  {account.username}
                </Text>
                {selected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={colors.accent}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {protectedAccount ? (
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.surfaceMutedGlass,
                borderColor: colors.borderGlass,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.accent}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Hasło do konta"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: colors.text }]}
              onSubmitEditing={signIn}
            />
          </View>
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: colors.negative }]}>{error}</Text>
        ) : null}

        <Pressable
          onPress={signIn}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.accent,
              opacity: loading ? 0.6 : pressed ? 0.8 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons
                name="log-in-outline"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.primaryText}>
                {protectedAccount ? "Zaloguj się" : "Kontynuuj"}
              </Text>
            </>
          )}
        </Pressable>

        {selectedAccount.biometric_enabled === 1 ? (
          <Pressable
            onPress={signInWithBiometrics}
            disabled={loading}
            style={({ pressed }) => [
              styles.biometricButton,
              {
                borderColor: colors.borderGlass,
                backgroundColor: colors.surfaceMutedGlass,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="finger-print-outline"
              size={21}
              color={colors.accent}
            />
            <Text style={[styles.biometricText, { color: colors.text }]}>
              Zaloguj się biometrią
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center" },
  content: {
    paddingHorizontal: 24,
    alignItems: "stretch",
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 24,
  },
  accountList: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 16,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  accountName: { flex: 1, fontSize: 14, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  input: { flex: 1, height: 50, fontSize: 14 },
  error: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  biometricText: { fontSize: 14, fontWeight: "700" },
});
