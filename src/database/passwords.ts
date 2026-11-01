import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const passwordKey = (userId: number) => `investsimulator.password.${userId}`;

async function hash(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

export async function hasPassword(userId: number): Promise<boolean> {
  try {
    return Boolean(await SecureStore.getItemAsync(passwordKey(userId)));
  } catch {
    return false;
  }
}

export async function setPassword(
  userId: number,
  password: string,
): Promise<void> {
  const salt = Crypto.randomUUID();
  const digest = await hash(password, salt);
  await SecureStore.setItemAsync(passwordKey(userId), `${salt}:${digest}`);
}

export async function verifyPassword(
  userId: number,
  password: string,
): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(passwordKey(userId));
    if (!stored) return true;

    const [salt, digest] = stored.split(":");
    if (!salt || !digest) return false;

    const candidate = await hash(password, salt);
    return candidate === digest;
  } catch {
    return false;
  }
}

export async function clearPassword(userId: number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(passwordKey(userId));
  } catch {
    // Brak magazynu bezpiecznego
  }
}
