import * as SecureStore from "expo-secure-store";

const ACTIVE_ACCOUNT_KEY = "investsimulator.activeAccountId";
const LOGGED_IN_KEY = "investsimulator.loggedIn";

// SecureStore nie jest dostępny na każdej platformie (np. web), dlatego każde
// wywołanie ma bezpieczny fallback - aplikacja nadal działa na koncie domyślnym.
async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Brak magazynu bezpiecznego nie powinien blokować ustawień.
  }
}

export async function getActiveAccountId(): Promise<number> {
  const stored = await safeGet(ACTIVE_ACCOUNT_KEY);
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function setActiveAccountId(userId: number): Promise<void> {
  await safeSet(ACTIVE_ACCOUNT_KEY, String(userId));
}

export async function getLoggedIn(): Promise<boolean> {
  const stored = await safeGet(LOGGED_IN_KEY);
  return stored !== "0";
}

export async function setLoggedIn(value: boolean): Promise<void> {
  await safeSet(LOGGED_IN_KEY, value ? "1" : "0");
}
