import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

// Konfiguracja zachowania powiadomień w pierwszym planie (foreground)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type PushRegistrationResult = {
  success: boolean;
  status: Notifications.PermissionStatus | "granted" | "denied" | "undetermined";
  token?: string;
  error?: string;
};

/**
 * Rejestruje kanał powiadomień (Android) i prosi użytkownika o uprawnienia do powiadomień push.
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await window.Notification.requestPermission();
      return {
        success: permission === "granted",
        status: permission === "granted" ? "granted" : "denied",
      };
    }
    return {
      success: true,
      status: "granted",
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Powiadomienia główne",
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#208AEF",
    });
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return {
        success: false,
        status: finalStatus,
        error: "Brak uprawnień do wyświetlania powiadomień",
      };
    }

    let token: string | undefined;
    if (Device.isDevice) {
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        token = tokenResponse.data;
      } catch (tokenError) {
        console.warn("Nie udało się pobrać Expo push token:", tokenError);
      }
    }

    return {
      success: true,
      status: finalStatus,
      token,
    };
  } catch (err) {
    return {
      success: false,
      status: "denied",
      error: err instanceof Error ? err.message : "Błąd rejestracji powiadomień push",
    };
  }
}

/**
 * Wysyła natychmiastowe powiadomienie lokalne/systemowe (push).
 */
export async function sendLocalPushNotificationAsync(
  title: string,
  body?: string,
  data?: Record<string, unknown>,
): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
      new window.Notification(title, { body });
      return "web-notification";
    }
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body ?? undefined,
        data,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("Błąd wysyłania lokalnego powiadomienia push:", error);
    return null;
  }
}
