import { StyleSheet } from "react-native";

// Skalowanie czcionek całej aplikacji
let currentScale = 1;

export function setGlobalFontScale(scale: number) {
  currentScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
}

StyleSheet.setStyleAttributePreprocessor("fontSize", (value) => {
  if (typeof value !== "number") return value;
  return value * currentScale;
});

StyleSheet.setStyleAttributePreprocessor("lineHeight", (value) => {
  if (typeof value !== "number") return value;
  return value * currentScale;
});
