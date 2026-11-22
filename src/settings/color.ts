/**
 * Operacje na kolorach dla wyboru własnego koloru akcentu.
 *
 * @module src/settings/color
 */

/** Kolor w modelu HSV: odcień `h` w stopniach 0–360, nasycenie `s` i jasność `v` w zakresie 0–1. */
export type HsvColor = {
  /** Odcień w stopniach 0–360. */
  h: number;
  /** Nasycenie 0–1. */
  s: number;
  /** Jasność 0–1. */
  v: number;
};

/** Maksymalna liczba własnych kolorów motywu zapisywanych na konto. */
export const MAX_CUSTOM_ACCENTS = 3;

/**
 * Ogranicza liczbę do przedziału.
 *
 * @param value Liczba.
 * @param min Dolna granica.
 * @param max Górna granica.
 * @returns Liczba z przedziału `[min, max]`.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sprawdza i normalizuje kolor w formacie `#RRGGBB`.
 *
 * @param value Dowolna wartość.
 * @returns Kolor wielkimi literami (np. `"#58A6FF"`) albo `null`, gdy wartość nie jest
 * sześciocyfrowym kolorem hex z `#` (format skrócony `#abc` nie jest akceptowany).
 */
export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : null;
}

/**
 * Zamienia kolor HSV na `#RRGGBB`.
 *
 * @param h Odcień w stopniach (dowolna liczba, sprowadzana do 0–360).
 * @param s Nasycenie 0–1 (wartości spoza zakresu są przycinane).
 * @param v Jasność 0–1 (wartości spoza zakresu są przycinane).
 * @returns Kolor hex wielkimi literami.
 *
 * @example
 * hsvToHex(0, 1, 1);   // "#FF0000"
 * hsvToHex(120, 1, 1); // "#00FF00"
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);

  const c = value * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Zamienia kolor `#RRGGBB` (lub bez `#`) na HSV.
 *
 * @param hex Kolor hex.
 * @returns Kolor HSV; dla niepoprawnego koloru `{ h: 210, s: 0.7, v: 0.9 }` (niebieski).
 */
export function hexToHsv(hex: string): HsvColor {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return { h: 210, s: 0.7, v: 0.9 };
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;

  return {
    h: hue,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

/**
 * Dobiera czytelny kolor tekstu na tle o danym kolorze.
 *
 * Liczy jasność tła (`0.299 R + 0.587 G + 0.114 B`) i dla jasnego tła
 * (powyżej 0.6) zwraca prawie czarny, a dla ciemnego biały.
 *
 * @param hex Kolor tła `#RRGGBB`.
 * @returns `"#111827"` albo `"#ffffff"` (także dla niepoprawnego koloru).
 */
export function readableTextColor(hex: string): string {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#ffffff";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}
