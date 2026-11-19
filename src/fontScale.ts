/**
 * Globalne skalowanie czcionek całej aplikacji (ustawienie „Rozmiar czcionki”).
 *
 * - Na platformach natywnych moduł przy imporcie rejestruje preprocesor stylów
 *   `StyleSheet`, który mnoży `fontSize` i `lineHeight` przez bieżącą skalę.
 * - Na webie (react-native-web nie ma preprocesora) skalowany jest cały interfejs
 *   przez CSS `zoom` na elemencie `#root` (lub `body`).
 *
 * Skalę ustawia `ThemeProvider` przez {@link setGlobalFontScale}.
 *
 * @module src/fontScale
 */
import { Platform, StyleSheet } from "react-native";

/** Bieżący mnożnik czcionek (1 = rozmiar domyślny). */
let currentScale = 1;

/**
 * Na webie ustawia CSS `zoom` elementu `#root` (lub `body`); na innych platformach nic nie robi.
 *
 * @param scale Mnożnik rozmiaru interfejsu.
 */
function applyWebScale(scale: number) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const root = document.getElementById("root") ?? document.body;
  if (root) {
    // react-native-web nie ma preprocesora stylów, więc na webie skalujemy
    // cały interfejs natywnym mechanizmem przeglądarki
    root.style.zoom = String(scale);
  }
}

/**
 * Ustawia globalny mnożnik czcionek.
 *
 * Niepoprawna wartość (nieskończona, zero lub ujemna) jest zamieniana na 1.
 * Na natywnych platformach nowa skala obejmuje style tworzone i przetwarzane
 * po wywołaniu; na webie zmiana jest natychmiastowa.
 *
 * @param scale Mnożnik, np. `0.88`, `1` lub `1.14`.
 */
export function setGlobalFontScale(scale: number) {
  currentScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  applyWebScale(currentScale);
}

/**
 * `StyleSheet` z opcjonalną (niepubliczną) metodą `setStyleAttributePreprocessor`.
 * Na natywnych platformach służy do skalowania `fontSize` i `lineHeight`,
 * zanim style trafią do widoku.
 */
const styleSheetWithPreprocessor = StyleSheet as typeof StyleSheet & {
  setStyleAttributePreprocessor?: (
    property: string,
    preprocessor: (value: unknown) => unknown,
  ) => void;
};

if (
  typeof styleSheetWithPreprocessor.setStyleAttributePreprocessor === "function"
) {
  styleSheetWithPreprocessor.setStyleAttributePreprocessor(
    "fontSize",
    (value) => {
      if (typeof value !== "number") return value;
      return value * currentScale;
    },
  );

  styleSheetWithPreprocessor.setStyleAttributePreprocessor(
    "lineHeight",
    (value) => {
      if (typeof value !== "number") return value;
      return value * currentScale;
    },
  );
}
