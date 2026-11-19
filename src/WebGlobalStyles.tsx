/**
 * Globalne style CSS dla wersji webowej aplikacji (hover, fokus, scrollbar).
 *
 * @module src/WebGlobalStyles
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTheme } from './theme';

/** Identyfikator elementu `<style>` wstawianego do `<head>`. */
const STYLE_ELEMENT_ID = 'web-global-styles';

/**
 * Zamienia kolor `#rrggbb` na `rgba(r, g, b, alpha)`.
 *
 * @param hex Kolor w formacie `#rrggbb`.
 * @param alpha Przezroczystość 0–1.
 * @returns Kolor w formacie `rgba(...)`.
 */
function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * Zachowania typowe dla przeglądarki, dodane globalnie do wszystkich klikalnych elementów
 * (react-native-web renderuje każdy Pressable z tabindex="0"):
 * - podświetlenie po najechaniu myszą (tylko urządzenia z kursorem) i przy wciśnięciu,
 * - obwódka fokusu tylko przy nawigacji klawiaturą,
 * - cienki scrollbar w kolorach motywu.
 * Na platformach natywnych komponent nic nie robi.
 *
 * Style są wstawiane do jednego elementu `<style>` i aktualizowane przy każdej
 * zmianie kolorów motywu. Komponent niczego nie renderuje (zwraca `null`).
 */
export function WebGlobalStyles() {
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Nakładka przez background-image nie nadpisuje własnego background-color elementu i respektuje zaokrąglenia
    const hover = withAlpha(colors.text, 0.06);
    const pressed = withAlpha(colors.text, 0.1);
    const interactive = '[tabindex="0"]:not([aria-disabled="true"])';

    const css = `
      @media (hover: hover) {
        ${interactive}:hover { background-image: linear-gradient(${hover}, ${hover}); }
      }
      ${interactive}:active { background-image: linear-gradient(${pressed}, ${pressed}); }
      [tabindex]:focus { outline: none; }
      [tabindex]:focus-visible { outline: 2px solid ${colors.accent}; outline-offset: 2px; }
      /* Pola tekstowe mają własną obwódkę (jak na telefonie); domyślna ramka przeglądarki rysowała się w środku niej */
      input:focus, textarea:focus { outline: none; }
      * { scrollbar-width: thin; scrollbar-color: ${colors.border} transparent; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
    `;

    let element = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!element) {
      element = document.createElement('style');
      element.id = STYLE_ELEMENT_ID;
      document.head.appendChild(element);
    }
    element.textContent = css;
  }, [colors]);

  return null;
}
