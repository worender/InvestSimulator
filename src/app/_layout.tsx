import { Stack } from "expo-router";
import { animateTransformToValues } from "react-native-reanimated/lib/typescript/layoutReanimation";

export default function RootLayout() {
  return (
    
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
       
      </Stack>
    
  );
}
