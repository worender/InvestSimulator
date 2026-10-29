# Wygląd aplikacji webowej (wzór: xStation XTB)

Zasady:
- Style (kolory, typografia, komponenty, motyw jasny/ciemny, akcent) identyczne jak na mobile — wspólny `src/theme.tsx`.
- Web nie pokazuje więcej danych niż mobile — tylko lepiej je układa.
- Układ responsywny: < 768px = układ mobilny (dolny pasek), ≥ 1024px = sidebar + panele obok siebie.
- Interakcje natywne dla webu: brak swipe'a zakładek, hover + kursor, osobny scroll w panelach, skróty klawiszowe.
- Każde zadanie weryfikowane zrzutami ekranu (390 / 768 / 1440 px, jasny i ciemny motyw).

## Zadania

- [x] 1. Uruchomienie webu: nagłówki COOP/COEP dla expo-sqlite w `metro.config.js`, sprawdzenie, że wszystkie zakładki ładują się w przeglądarce bez błędów; skrypt do zrzutów ekranu (Playwright poza repo).
- [x] 2. Hook `useLayoutMode()` (mobile / tablet / desktop na podstawie `useWindowDimensions` + `Platform.OS === 'web'`) — jedno źródło prawdy dla breakpointów.
- [x] 3. Sidebar desktopowy (≥ 1024px) zamiast dolnego paska: logo, saldo konta, nawigacja z ikonami, aktywna pozycja jak w xStation; wyłączenie swipe'a zakładek i chowania paska przy scrollu na webie.
- [x] 4. Interakcje webowe we wspólnych komponentach: hover, `cursor: pointer`, focus ring, cienki scrollbar w ciemnym/jasnym motywie.
- [x] 5. Ekran Start (desktop): karta portfela na górze, pod nią siatka 2 kolumn (wykres | trendy) z ograniczoną maks. szerokością treści.
- [x] 6. Ekran Rynek (desktop): układ panelowy — lista instrumentów (tabela: symbol, zmiana %, cena) | wykres wybranego instrumentu zamiast modala; każdy panel scrolluje się osobno.
- [ ] 7. Szczegóły instrumentu (desktop): dane z `ModalChartView` pokazane w panelu/siatce obok wykresu zamiast pełnoekranowego modala; modal zostaje na mobile.
- [ ] 8. Ekran Portfolio (desktop): tabela pozycji z kolumnami zamiast listy kart; pusty stan jak w xStation.
- [ ] 9. Ekrany Nauka i Ustawienia (desktop): wyśrodkowana kolumna z maks. szerokością, ustawienia w 2 kolumnach sekcji.
- [ ] 10. Skróty klawiszowe: `/` — wyszukiwanie instrumentów, `Esc` — zamknięcie modala/panelu, strzałki w liście instrumentów.
- [ ] 11. Przegląd końcowy: zrzuty wszystkich ekranów we wszystkich breakpointach i motywach, poprawki niespójności z mobile.
