/**
 * Główny układ aplikacji (Expo Router): dostawcy kontekstów i stos ekranów.
 *
 * Kolejność dostawców (od zewnątrz): `GestureHandlerRootView` → `ThemeProvider`
 * → `WatchlistProvider` → `SavedArticlesProvider` → `InteractionLockProvider`
 * → `NavigationVisibilityProvider` → `NotificationProvider`. Import
 * `webIsolation` wymusza izolację strony na webie (wymaganą przez `expo-sqlite`).
 *
 * @module src/app/_layout
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { preloadMarketData } from "../api/marketService";
import { LoginScreen } from "../components/settings/LoginScreen";
import { InteractionLockProvider } from "../interactionLock";
import { NavigationVisibilityProvider } from "../navigationVisibility";
import { NotificationProvider } from "../notifications";
import { SavedArticlesProvider } from "../savedArticles";
import { ThemeProvider, useTheme } from "../theme";
import { WatchlistProvider } from "../watchlist";
import { WebGlobalStyles } from "../WebGlobalStyles";
import "../webIsolation";

/**
 * Zawartość aplikacji wewnątrz dostawców.
 *
 * Zalogowany użytkownik widzi stos ekranów z zakładkami `(tabs)`, a niezalogowany
 * — `LoginScreen`. Po zalogowaniu wstępnie pobiera dane rynkowe
 * (`preloadMarketData`). Pasek stanu dopasowuje się do motywu, a zmiana
 * rozmiaru czcionki przebudowuje stos (`key`), żeby nowe style objęły wszystkie ekrany.
 */
function AppStack() {
  const { mode, loggedIn, fontSizePreference } = useTheme();

  useEffect(() => {
    if (loggedIn) {
      void preloadMarketData();
    }
  }, [loggedIn]);

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <WebGlobalStyles />
      {loggedIn ? (
        <Stack
          key={`app-${fontSizePreference}`}
          screenOptions={{
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      ) : (
        <LoginScreen />
      )}
    </>
  );
}

/**
 * Główny układ: owija aplikację we wszystkie dostawcy kontekstów.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <WatchlistProvider>
          <SavedArticlesProvider>
            <InteractionLockProvider>
              <NavigationVisibilityProvider>
                <NotificationProvider>
                  <AppStack />
                </NotificationProvider>
              </NavigationVisibilityProvider>
            </InteractionLockProvider>
          </SavedArticlesProvider>
        </WatchlistProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
