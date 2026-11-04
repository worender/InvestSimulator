
export function normalizeAndValidateSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();

  // Przykłady: PKO.WA, BRK-B, ^GSPC, EURUSD=X
  if (
    symbol.length === 0 ||
    symbol.length > 20 ||
    !/^[A-Z0-9^][A-Z0-9.-]{0,18}(?:=[A-Z])?$/.test(symbol)
  ) {
    throw new Error("Nieprawidłowy symbol instrumentu");
  }

  return symbol;
}

export function ValidateUserName(value: string): string {
  const userName = value.trim(); 

  if (userName.length === 0 || userName.length > 30) {
    throw new Error("Nieprawidłowa nazwa użytkownika");
  }else if (!/^[a-zA-Z0-9._-]+$/.test(userName)) {
    throw new Error("Nazwa użytkownika może zawierać tylko litery, cyfry, kropki, podkreślenia i myślniki");
  }

  return userName;
}

export function ValidateAvatarUrl(value: string): string {
  const avatarUrl = value.trim();
  const allowedProtocols = ["http:", "https:", "file:", "content:"];

  if (avatarUrl.length === 0 || avatarUrl.length > 500) {
    throw new Error("Nieprawidłowy URL avatara");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(avatarUrl);
  } catch {
    throw new Error("Nieprawidłowy URL avatara");
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new Error("Nieobsługiwany typ adresu zdjęcia");
  }

  return avatarUrl;
}