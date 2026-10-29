import '../webIsolation';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationVisibilityProvider } from '../navigationVisibility';
import { NotificationProvider } from '../notifications';
import { ThemeProvider, useTheme } from '../theme';
import { WebGlobalStyles } from '../WebGlobalStyles';




// Główny komponent aplikacji, który ustawia kontekst motywu, widoczności nawigacji i powiadomień. Zawiera również stos ekranów (Stack) dla nawigacji w aplikacji.
function AppStack() {
  const { mode } = useTheme();


  
  
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <WebGlobalStyles />
      <Stack screenOptions={{ gestureEnabled: true, fullScreenGestureEnabled: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationVisibilityProvider>
          <NotificationProvider>
            <AppStack />
          </NotificationProvider>
        </NavigationVisibilityProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
