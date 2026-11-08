
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

export function validateUserName(value: string): string {
  const userName = value.trim(); 

  if (userName.length === 0 || userName.length > 30) {
    throw new Error("Nieprawidłowa nazwa użytkownika");
  }else if (!/^[a-zA-Z0-9._ -]+$/.test(userName)) {
    throw new Error("Nazwa użytkownika może zawierać tylko litery, cyfry, kropki, podkreślenia i myślniki");
  }

  return userName;
}

export function validateWalletName(value: string): string {
  const userName = value.trim(); 

  if (userName.length === 0 || userName.length > 30) {
    throw new Error("Nieprawidłowa nazwa portfela");
  }else if (!/^[a-zA-Z0-9._ -]+$/.test(userName)) {
    throw new Error("Nazwa portfela może zawierać tylko litery, cyfry, kropki, podkreślenia i myślniki");
  }

  return userName;
}

export function validateAvatarUrl(value: string): string {
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

export function validateNumberReal(value: number): number {
  if (isNaN(value) || !isFinite(value)) {
    throw new Error("Nieprawidłowa liczba");
  }

  return value;
}

export function validateCurrencyCode(value: string): string {
  const currencyCode = value.trim().toUpperCase();
  
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error("Nieprawidłowy kod waluty");
  }

  return currencyCode;
}

export function validateIconWallet(value: string): string {
  const iconWallet = value.trim();

  if (
    iconWallet.length === 0 ||
    iconWallet.length > 50 ||
    !/^[a-z0-9-]+$/.test(iconWallet)
  ) {
    throw new Error("Nieprawidłowa nazwa ikony portfela");
  }

  return iconWallet;
}

export function validateDate(value: number): number {
  if (isNaN(value) || !isFinite(value) || value < 0) {
    throw new Error("Nieprawidłowa data");
  }

  return value;
}