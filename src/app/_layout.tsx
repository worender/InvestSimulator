import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { preloadMarketData } from "../api/marketService";
import { LoginScreen } from '../components/settings/LoginScreen';
import { InteractionLockProvider } from '../interactionLock';
import { NavigationVisibilityProvider } from '../navigationVisibility';
import { NotificationProvider } from '../notifications';
import { SavedArticlesProvider } from '../savedArticles';
import { ThemeProvider, useTheme } from '../theme';
import { WatchlistProvider } from '../watchlist';




// Główny komponent aplikacji, który ustawia kontekst motywu, widoczności nawigacji i powiadomień. Zawiera również stos ekranów (Stack) dla nawigacji w aplikacji.
function AppStack() {
  const { mode, loggedIn, fontSizePreference } = useTheme();

  useEffect(() => {
    if (loggedIn) {
      void preloadMarketData();
    }
  }, [loggedIn]);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {loggedIn ? (
        <Stack
          key={`app-${fontSizePreference}`}
          screenOptions={{ gestureEnabled: true, fullScreenGestureEnabled: true }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      ) : (
        <LoginScreen />
      )}
    </>
  );
}

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
