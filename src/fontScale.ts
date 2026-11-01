import { Platform, StyleSheet } from "react-native";

// Skalowanie czcionek całej aplikacji
let currentScale = 1;

function applyWebScale(scale: number) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const root = document.getElementById("root") ?? document.body;
  if (root) {
    // react-native-web nie ma preprocesora stylów, więc na webie skalujemy
    // cały interfejs natywnym mechanizmem przeglądarki
    root.style.zoom = String(scale);
  }
}

export function setGlobalFontScale(scale: number) {
  currentScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  applyWebScale(currentScale);
}

//  Na natywnych platformach skalujemy fontSize i lineHeight jeszcze przed przekazaniem stylów
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
