import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { LoadingScreen } from "../components/LoadingScreen";

// Główny komponent aplikacji, który ustawia kontekst motywu, widoczności nawigacji i powiadomień. Zawiera również stos ekranów (Stack) dla nawigacji w aplikacji.
function AppStack() {
  const { mode, loggedIn } = useTheme();
  const [loadingPromises, setLoadingPromises] = useState<
    readonly Promise<unknown>[]
  >(() => (loggedIn ? [preloadMarketData()] : []));

  const finishLoading = useCallback(() => {
    setLoadingPromises([]);
  }, []);


  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <WebGlobalStyles />
      {loggedIn ? (
        <Stack
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
      {loadingPromises.length > 0 && (
        <View style={styles.loadingOverlay}>
          <LoadingScreen
            promises={loadingPromises}
            onFinished={finishLoading}
            timeoutMs={3_000}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
});

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
