import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurTargetView } from "expo-blur";
import Constants from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PANEL_HEADER_HEIGHT, PanelHeader } from "../../components/PanelHeader";
import { AccentColorPicker } from "../../components/settings/AccentColorPicker";
import { AccountFormSheet } from "../../components/settings/AccountFormSheet";
import { AccountSwitcher } from "../../components/settings/AccountSwitcher";
import {
  ChoiceSlider,
  type ChoiceOption,
} from "../../components/settings/ChoiceSlider";
import { ColorPickerSheet } from "../../components/settings/ColorPickerSheet";
import { ConfirmDialog } from "../../components/settings/ConfirmDialog";
import { PasswordSheet } from "../../components/settings/PasswordSheet";
import {
  SettingsCategory,
  SettingsRow,
} from "../../components/settings/SettingsPrimitives";
import { SettingsToggle } from "../../components/settings/SettingsToggle";
import { hasPassword } from "../../database/passwords";
import { displayRateLabel } from "../../displayCurrency";
import { notify } from "../../notificationBus";
import { pickAvatar } from "../../settings/avatars";
import { NOTIFICATION_CATEGORY_OPTIONS } from "../../settings/notificationSettings";
import {
  useTheme,
  type Currency,
  type FontSizePreference,
  type ThemeMode,
} from "../../theme";
import { useScrollAwareNavigation } from "../../useScrollAwareNavigation";

const THEME_OPTIONS: ChoiceOption<ThemeMode>[] = [
  { key: "light", label: "Jasny" },
  { key: "dark", label: "Ciemny" },
];

const FONT_OPTIONS: ChoiceOption<FontSizePreference>[] = [
  { key: "small", label: "S" },
  { key: "medium", label: "M" },
  { key: "large", label: "L" },
];

const CURRENCY_OPTIONS: ChoiceOption<Currency>[] = [
  { key: "PLN", label: "PLN" },
  { key: "EUR", label: "EUR" },
  { key: "USD", label: "USD" },
];

export default function SettingsScreen() {
  const {
    mode,
    colors,
    setMode,
    toggleMode,
    accent,
    setAccent,
    defaultCurrency,
    setDefaultCurrency,
    multiCurrency,
    setMultiCurrency,
    fontSizePreference,
    setFontSizePreference,
    accounts,
    activeAccount,
    switchAccount,
    addAccount,
    updateAccount,
    notificationsEnabled,
    setNotificationsEnabled,
    notificationCategories,
    setNotificationCategory,
    biometricEnabled,
    setBiometricEnabled,
    loggedIn,
    logout,
    rates,
    ratesUpdatedAt,
    ratesLoading,
    refreshRates,
  } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const isDark = mode === "dark";
  const appName = Constants.expoConfig?.name ?? "InvestSimulator";

  const [accountListOpen, setAccountListOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!activeAccount) return;

    hasPassword(activeAccount.id).then((value) => {
      if (active) setPasswordConfigured(value);
    });

    return () => {
      active = false;
    };
  }, [activeAccount]);

  const changeAvatar = async () => {
    const avatarUri = await pickAvatar();
    if (!avatarUri) return;

    await updateAccount({ avatar_uri: avatarUri });
    notify({
      variant: "success",
      title: "Zdjęcie profilowe zmienione",
      message: "Nowe zdjęcie jest już widoczne na Twoim koncie.",
    });
  };

  const toggleBiometrics = async (enabled: boolean) => {
    if (!enabled) {
      await setBiometricEnabled(false);
      return;
    }

    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hardware || !enrolled) {
      notify({
        variant: "warning",
        title: "Biometria niedostępna",
        message:
          "To urządzenie nie ma skonfigurowanego odcisku palca ani rozpoznawania twarzy.",
      });
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Włącz logowanie biometryczne",
      cancelLabel: "Anuluj",
    });

    if (!result.success) {
      notify({
        variant: "info",
        title: "Biometria nie została włączona",
        message: "Potwierdź tożsamość, aby korzystać z logowania biometrią.",
      });
      return;
    }

    await setBiometricEnabled(true);
    notify({
      variant: "success",
      title: "Biometria włączona",
      message: "Możesz logować się do aplikacji odciskiem palca lub twarzą.",
    });
  };

  const confirmLeave = () => {
    setLeaveOpen(false);
    if (Platform.OS === "android") {
      BackHandler.exitApp();
      return;
    }
    notify({
      variant: "info",
      title: "Do zobaczenia!",
      message: `Możesz teraz zamknąć ${appName}.`,
    });
  };

  const customAccent = /^#[0-9a-f]{6}$/i.test(accent)
    ? accent
    : mode === "dark"
      ? "#58a6ff"
      : "#0969da";

  const ratesDescription = `${displayRateLabel("EUR", rates)} · ${displayRateLabel(
    "USD",
    rates,
  )}${
    ratesUpdatedAt
      ? ` · ${new Date(ratesUpdatedAt).toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : ""
  }`;

  if (!loggedIn) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        blurTarget={blurTargetRef}
        title="Ustawienia"
        left={
          <Pressable
            onPress={() => {
              void toggleMode();
            }}
            accessibilityLabel={
              isDark ? "Włącz tryb jasny" : "Włącz tryb ciemny"
            }
            hitSlop={8}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={22}
              color={colors.accent}
            />
          </Pressable>
        }
        right={
          <Pressable
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            accessibilityLabel="Przewiń do akcji konta"
            hitSlop={8}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.textMuted}
            />
          </Pressable>
        }
      />

      <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
        <ScrollView
          ref={scrollRef}
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: 38 + bottom,
              paddingTop: top + PANEL_HEADER_HEIGHT + 8,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollNav}
        >
          <AccountSwitcher
            accounts={accounts}
            activeAccountId={activeAccount?.id}
            expanded={accountListOpen}
            onToggle={() => setAccountListOpen((current) => !current)}
            onSelect={(account) => {
              setAccountListOpen(false);
              if (account.id !== activeAccount?.id) {
                void switchAccount(account.id);
              }
            }}
            onAdd={() => {
              setAccountListOpen(false);
              setAddAccountOpen(true);
            }}
          />

          <SettingsCategory title="Wygląd">
            <SettingsRow
              icon={isDark ? "moon-outline" : "sunny-outline"}
              title="Tryb aplikacji"
              subtitle={
                isDark
                  ? "Ciemny motyw dopasowany do wieczoru"
                  : "Jasny motyw do pracy w dzień"
              }
              right={
                <ChoiceSlider
                  options={THEME_OPTIONS}
                  value={mode}
                  onChange={(next) => {
                    if (next !== mode) void setMode(next);
                  }}
                />
              }
            />

            <SettingsRow
              icon="text-outline"
              title="Rozmiar czcionki"
              subtitle="Skaluje tekst w całej aplikacji"
              right={
                <ChoiceSlider
                  options={FONT_OPTIONS}
                  value={fontSizePreference}
                  onChange={(next) => {
                    if (next !== fontSizePreference) {
                      void setFontSizePreference(next);
                    }
                  }}
                />
              }
            />

            <SettingsRow
              icon="color-palette-outline"
              title="Kolor akcentu"
              subtitle="Przyciski, ikony i aktywne elementy"
              last
            />
            <View
              style={[
                styles.swatchArea,
                { borderTopColor: colors.borderGlass },
              ]}
            >
              <AccentColorPicker
                accent={accent}
                onChange={(next) => {
                  void setAccent(next);
                }}
                onAddCustom={() => setColorPickerOpen(true)}
              />
            </View>
          </SettingsCategory>

          <SettingsCategory title="Autoryzacja">
            <SettingsRow
              icon="person-outline"
              title="Nazwa konta"
              subtitle={activeAccount?.username}
              right={
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              }
              onPress={() => setEditAccountOpen(true)}
            />

            <SettingsRow
              icon="lock-closed-outline"
              title="Hasło"
              subtitle={
                passwordConfigured
                  ? "Zmień hasło do swojego konta"
                  : "Ustaw hasło, aby zabezpieczyć konto"
              }
              right={
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              }
              onPress={() => setPasswordOpen(true)}
            />

            <SettingsRow
              icon="image-outline"
              title="Zdjęcie profilowe"
              subtitle={
                activeAccount?.avatar_uri
                  ? "Zmień lub usuń obecne zdjęcie"
                  : "Dodaj zdjęcie do swojego konta"
              }
              right={
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              }
              onPress={() => {
                void changeAvatar();
              }}
            />

            <SettingsRow
              icon="finger-print-outline"
              title="Logowanie biometrią"
              subtitle={
                biometricEnabled
                  ? "Odcisk palca lub rozpoznawanie twarzy"
                  : "Włącz szybsze logowanie bez hasła"
              }
              right={
                <SettingsToggle
                  value={biometricEnabled}
                  onChange={(value) => {
                    void toggleBiometrics(value);
                  }}
                  accessibilityLabel="Logowanie biometrią"
                />
              }
              last
            />
          </SettingsCategory>

          <SettingsCategory title="Powiadomienia">
            <SettingsRow
              icon="notifications-outline"
              title="Powiadomienia"
              subtitle={
                notificationsEnabled
                  ? "Włączone — wybierz interesujące Cię kategorie"
                  : "Wyłączone — nie będziesz otrzymywać alertów"
              }
              right={
                <SettingsToggle
                  value={notificationsEnabled}
                  onChange={(value) => {
                    void setNotificationsEnabled(value);
                  }}
                  accessibilityLabel="Powiadomienia"
                />
              }
            />

            {notificationsEnabled
              ? NOTIFICATION_CATEGORY_OPTIONS.map((option) => (
                  <SettingsRow
                    key={option.key}
                    icon={option.icon}
                    title={option.label}
                    subtitle={option.description}
                    right={
                      <SettingsToggle
                        value={notificationCategories[option.key]}
                        onChange={(value) => {
                          void setNotificationCategory(option.key, value);
                        }}
                        accessibilityLabel={`Powiadomienia: ${option.label}`}
                      />
                    }
                  />
                ))
              : null}

            <SettingsRow
              icon="phone-portrait-outline"
              title="Powiadomienia push"
              subtitle="Niedostępne w tej wersji aplikacji"
              right={
                <SettingsToggle
                  value={false}
                  onChange={() => undefined}
                  disabled
                  accessibilityLabel="Powiadomienia push — niedostępne"
                />
              }
              last
            />
          </SettingsCategory>

          <SettingsCategory title="Rynek">
            <SettingsRow
              icon="layers-outline"
              title="Wiele walut"
              subtitle={
                multiCurrency
                  ? "Ceny pokazywane są w walucie instrumentu"
                  : "Wszystkie ceny przeliczane na wybraną walutę"
              }
              right={
                <SettingsToggle
                  value={multiCurrency}
                  onChange={(value) => {
                    void setMultiCurrency(value);
                  }}
                  accessibilityLabel="Wiele walut"
                />
              }
              last={multiCurrency}
            />

            {!multiCurrency ? (
              <SettingsRow
                icon="cash-outline"
                title="Waluta rozliczeniowa"
                subtitle="Kurs przeliczany na bieżąco"
                right={
                  <ChoiceSlider
                    options={CURRENCY_OPTIONS}
                    value={defaultCurrency}
                    onChange={(next) => {
                      if (next !== defaultCurrency) {
                        void setDefaultCurrency(next);
                      }
                    }}
                  />
                }
                last
              />
            ) : null}

            <SettingsRow
              icon="refresh-outline"
              title="Kursy walut"
              subtitle={
                ratesLoading ? "Aktualizowanie kursów..." : ratesDescription
              }
              right={
                ratesLoading ? (
                  <Ionicons name="sync" size={18} color={colors.accent} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                  />
                )
              }
              onPress={() => {
                void refreshRates();
              }}
              last
            />
          </SettingsCategory>

          <View style={styles.accountActions}>
            <Pressable
              onPress={() => setLogoutOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Wyloguj"
              style={({ pressed }) => [
                styles.logoutButton,
                {
                  borderColor: colors.negative,
                  backgroundColor: pressed
                    ? colors.negativeGlass
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={colors.negative}
              />
              <Text style={[styles.logoutText, { color: colors.negative }]}>
                Wyloguj
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLeaveOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Opuść ${appName}`}
              style={({ pressed }) => [
                styles.leaveButton,
                {
                  backgroundColor: colors.negative,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="exit-outline" size={20} color="#ffffff" />
              <Text style={styles.leaveText}>Opuść {appName}</Text>
            </Pressable>
          </View>

          <View>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 24,
              }}
            >
              {appName} v{Constants.expoConfig?.version ?? "?.?.?"}
            </Text>
          </View>
        </ScrollView>
      </BlurTargetView>

      {addAccountOpen ? (
        <AccountFormSheet
          title="Nowe konto"
          subtitle="Dodaj konto"
          submitLabel="Utwórz konto"
          onClose={() => setAddAccountOpen(false)}
          onSaved={async ({ name, avatarUri }) => {
            await addAccount({ username: name, avatarUri });
            notify({
              variant: "success",
              title: "Konto utworzone",
              message: `${name} jest teraz aktywnym kontem.`,
            });
          }}
        />
      ) : null}

      {editAccountOpen ? (
        <AccountFormSheet
          title="Edytuj konto"
          subtitle="Profil"
          submitLabel="Zapisz zmiany"
          initialName={activeAccount?.username ?? ""}
          initialAvatar={activeAccount?.avatar_uri ?? null}
          onClose={() => setEditAccountOpen(false)}
          onSaved={async ({ name, avatarUri }) => {
            await updateAccount({ username: name, avatar_uri: avatarUri });
            notify({
              variant: "success",
              title: "Profil zaktualizowany",
              message: "Zmiany zostały zapisane.",
            });
          }}
        />
      ) : null}

      {passwordOpen && activeAccount ? (
        <PasswordSheet
          userId={activeAccount.id}
          onClose={() => setPasswordOpen(false)}
          onSaved={() => setPasswordConfigured(true)}
        />
      ) : null}

      {colorPickerOpen ? (
        <ColorPickerSheet
          initialColor={customAccent}
          onClose={() => setColorPickerOpen(false)}
          onSelect={(color) => {
            void setAccent(color);
            setColorPickerOpen(false);
          }}
        />
      ) : null}

      {logoutOpen ? (
        <ConfirmDialog
          title="Wylogować się?"
          message={`Zostaniesz wylogowany z konta ${activeAccount?.username ?? ""}. Twoje dane pozostaną zapisane na urządzeniu.`}
          confirmLabel="Wyloguj"
          icon="log-out-outline"
          destructive
          onConfirm={() => {
            setLogoutOpen(false);
            void logout();
          }}
          onClose={() => setLogoutOpen(false)}
        />
      ) : null}

      {leaveOpen ? (
        <ConfirmDialog
          title={`Opuścić ${appName}?`}
          message="Niedokończone zmiany w ustawieniach są już zapisane. Do zobaczenia!"
          confirmLabel="Opuść aplikację"
          icon="exit-outline"
          destructive
          onConfirm={confirmLeave}
          onClose={() => setLeaveOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blurTarget: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  swatchArea: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accountActions: {
    marginTop: 48,
    marginBottom: 8,
    gap: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  logoutText: {
    fontSize: 14,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  leaveText: {
    color: "#ffffff",
    fontSize: 14,
  },
});
