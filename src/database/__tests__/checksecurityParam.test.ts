import { describe, expect, it } from "@jest/globals";

import {
  normalizeAndValidateSymbol,
  validateAvatarUrl,
  validateCurrencyCode,
  validateDate,
  validateIconWallet,
  validateNumberReal,
  validateUserName,
  validateWalletName,
} from "../checkSecurityParam";

describe("normalizeAndValidateSymbol", () => {
  it("normalizuje symbol", () => {
    expect(normalizeAndValidateSymbol(" pko.wa ")).toBe("PKO.WA");
  });

  it.each(["", "A".repeat(21), "PKO WA", "PKO; DROP TABLE users;--"])(
    "odrzuca niepoprawny symbol: %s",
    (value) => {
      expect(() => normalizeAndValidateSymbol(value)).toThrow();
    },
  );

  it("akceptuje poprawne symbole giełdowe", () => {
    expect(normalizeAndValidateSymbol("BRK-B")).toBe("BRK-B");
    expect(normalizeAndValidateSymbol("^GSPC")).toBe("^GSPC");
    expect(normalizeAndValidateSymbol("EURUSD=X")).toBe("EURUSD=X");
  });
});

describe("validateUserName", () => {
  it("usuwa spacje", () => {
    expect(validateUserName(" Jan Kowalski ")).toBe("Jan Kowalski");
  });

  it.each([
    "",
    " ".repeat(3),
    "a".repeat(31),
    "Jan'; DROP TABLE users;--",
    "Jan<script>alert(1)</script>",
  ])("odrzuca niepoprawną nazwę: %s", (value) => {
    expect(() => validateUserName(value)).toThrow();
  });
});

describe("validateWalletName", () => {
  it("usuwa spacje", () => {
    expect(validateWalletName(" Portfel testowy ")).toBe("Portfel testowy");
  });

  it.each([
    "",
    "a".repeat(31),
    "Portfel'; DROP TABLE wallet;--",
    "Portfel<script>",
  ])("odrzuca niepoprawną nazwę: %s", (value) => {
    expect(() => validateWalletName(value)).toThrow();
  });
});

describe("validateAvatarUrl", () => {
  it.each([
    "https://example.com/avatar.png",
    "http://example.com/avatar.png",
    "file:///avatar.png",
    "content://media/avatar",
  ])("akceptuje poprawny URL: %s", (value) => {
    expect(validateAvatarUrl(value)).toBe(value);
  });

  it.each([
    "",
    "not-a-url",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://example.com/' OR '1'='1",
  ])("odrzuca niepoprawny lub niebezpieczny URL: %s", (value) => {
    expect(() => validateAvatarUrl(value)).toThrow();
  });
});

describe("validateNumberReal", () => {
  it("akceptuje liczby skończone", () => {
    expect(validateNumberReal(0)).toBe(0);
    expect(validateNumberReal(-10.5)).toBe(-10.5);
  });

  it.each([NaN, Infinity, -Infinity])(
    "odrzuca niepoprawną liczbę: %s",
    (value) => {
      expect(() => validateNumberReal(value)).toThrow();
    },
  );
});

describe("validateCurrencyCode", () => {
  it("normalizuje kod waluty", () => {
    expect(validateCurrencyCode(" pln ")).toBe("PLN");
  });

  it.each([
    "",
    "PL",
    "PLNX",
    "123",
    "PL'; DROP TABLE wallet;--",
    "P L",
  ])("odrzuca niepoprawny kod: %s", (value) => {
    expect(() => validateCurrencyCode(value)).toThrow();
  });
});

describe("validateIconWallet", () => {
  it("akceptuje poprawną nazwę ikony", () => {
    expect(validateIconWallet("wallet-outline")).toBe("wallet-outline");
  });

  it.each([
    "",
    "WalletOutline",
    "wallet_outline",
    "wallet outline",
    "wallet'; DROP TABLE wallet;--",
    "a".repeat(51),
  ])("odrzuca niepoprawną ikonę: %s", (value) => {
    expect(() => validateIconWallet(value)).toThrow();
  });
});

describe("validateDate", () => {
  it("akceptuje poprawne daty jako timestamp", () => {
    expect(validateDate(0)).toBe(0);
    expect(validateDate(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it.each([NaN, Infinity, -Infinity, -1])(
    "odrzuca niepoprawną datę: %s",
    (value) => {
      expect(() => validateDate(value)).toThrow();
    },
  );
});