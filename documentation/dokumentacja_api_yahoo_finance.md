# Dokumentacja integracji z API Yahoo Finance (`yahoo-finance2`)

Niniejszy dokument opisuje architekturę, zakres pobieranych danych, mechanizmy wyszukiwania i normalizacji oraz ograniczenia techniczne wynikające z wykorzystania biblioteki `yahoo-finance2` w aplikacji.

### Słowa kluczowe

ticker - krótki symbol papieru wartościowego, który identyfikuje daną spółkę lub instrument na giełdzie.


## 1. Jak korzystamy z API (Architektura i technologia)

Aplikacja kliencka (React Native / Expo) nie komunikuje się bezpośrednio z serwerami Yahoo Finance. Zastosowano architekturę **Proxy Backend z warstwą pamięci podręcznej (In-Memory Cache)**, co chroni system przed blokadami adresów IP, ukrywa logikę parsowania oraz ujednolica format danych przesyłanych na frontend.

```
[Klient: MarketService.ts (Expo)] <---> (REST API + JWT) <---> [Serwer: Express.js + Cache] <---> [Yahoo Finance API]
```

### Warstwa serwerowa (Backend)
* **Środowisko i framework:** Node.js + Express.js (`cors`, `dotenv`).
* **Klient danych rynkowych:** `yahoo-finance2` (v3.x) – Biblioteka automatycznie zarządza sesją Yahoo, wymaganymi ciasteczkami (cookies).
* **Autoryzacja (JWT):** Dostęp do wszystkich endpointów rynkowych jest chroniony przez middleware `authenticateToken`. Klient uzyskuje bezstanowy token JWT (ważny przez **7 dni**) poprzez rejestrację unikalnego identyfikatora urządzenia.
* **Pamięć podręczna (In-Memory Cache):** Wykorzystuje natywną strukturę `Map` (`stockCache`) dla zasobożernych zapytań o dane historyczne (`/api/candles`). Klucz cache'u ma postać `${symbol}_${interval}_${days}`, a czas życia danych (**TTL**) wynosi **5 minut** (`300 000 ms`).
* **Automatyczna detekcja sieci lokalnej:** Przy starcie serwer skanuje interfejsy sieciowe (`os.networkInterfaces()`), wykrywa lokalny adres IPv4 i zapisuje konfigurację do pliku `server-address.json`, nasłuchując na porcie 3000.

### Warstwa kliencka (`MarketService.ts`)
* **Automatyczne wykrywanie adresu serwera (`getApiBaseUrl`):** Klient odczytuje zmienną `EXPO_PUBLIC_API_URL`, a w przypadku jej braku na urządzeniach mobilnych dynamicznie pobiera adres IP komputera deweloperskiego z `Constants.expoConfig.hostUri`.
* **Bezpieczne przechowywanie sesji:** Token JWT oraz wygenerowane `deviceId` (`uuidv4`) są zapisywane w `expo-secure-store` (na iOS/Android) lub w `localStorage` (na platformie Web).
* **Automatyczne odświeżanie tokenu (Auto-Retry):** W przypadku zwrócenia przez serwer błędu `401 Unauthorized` lub `403 Forbidden` (wygasły token), klient automatycznie usuwa stary klucz z pamięci, generuje nowy token i ponawia zapytanie w tle.

---

## 2. Jakie dane pobieramy z API (Endpointy i struktury danych)

Serwer wystawia 4 dedykowane endpointy rynkowe, które korzystają z czterech różnych modułów biblioteki `yahoo-finance2`: `chart()`, `search()`, `quote()` oraz `screener()`.

### 2.1. Dane świecowe OHLC (`GET /api/candles`)
* **Metoda biblioteki:** `yahooFinance.chart(symbol, { period1, interval })`
* **Przetwarzanie:** Serwer odrzuca puste rekordy (`open !== null && close !== null`), konwertuje datę na znacznik czasu w milisekundach i zaokrągla ceny do dwóch miejsc po przecinku (`Math.round(val * 100) / 100`).
* **Zwracany interfejs (`CandleData[]`):**

| Pole | Typ | Opis |
| :--- | :--- | :--- |
| `timestamp` | `number` | Czas otwarcia świecy w milisekundach. |
| `open` | `number` | Cena otwarcia w danym interwale. |
| `high` | `number` | Najwyższa cena (szczyt knota świecy). |
| `low` | `number` | Najniższa cena (dół knota świecy). |
| `close` | `number` | Cena zamknięcia w danym interwale. |

### 2.2. Status rynku i notowania (`GET /api/instruments/quote`)
* **Metoda biblioteki:** `yahooFinance.quote(symbol, {}, { validate: false })`
* **Przetwarzanie:** Sprawdza pole `marketState` z Yahoo i weryfikuje, czy znajduje się ono w zbiorze stanów aktywnych (`REGULAR`, `PRE`, `POST`, `PREPRE`, `POSTPOST`).
* **Zwracany interfejs (`InstrumentQuote`):**

| Pole | Typ | Opis |
| :--- | :--- | :--- |
| `symbol` | `string` | Znormalizowany ticker instrumentu (np. `PKO.WA`, `AAPL`). |
| `exchange` | `string` | Pełna nazwa giełdy (np. `Warsaw Stock Exchange`, `NasdaqGS`). |
| `marketState` | `string` | Surowy stan sesji giełdowej (np. `REGULAR`, `CLOSED`, `PRE`). |
| `isOpen` | `boolean` | Flaga informująca, czy handel na instrumencie aktualnie trwa. |

### 2.3. Wyszukiwarka instrumentów (`GET /api/instruments/search`)
* **Metoda biblioteki:** `yahooFinance.search(query, { quotesCount: limit, newsCount: 0 })`
* **Zwracany interfejs (`InstrumentSearchResult[]`):**

| Pole | Typ | Opis |
| :--- | :--- | :--- |
| `symbol` | `string` | Unikalny ticker Yahoo Finance. |
| `name` | `string` | Pełna lub skrócona nazwa spółki / instrumentu (`longname` / `shortname`). |
| `exchange` | `string` | Kod giełdy (np. `WSE`, `NMS`). |
| `exchangeName` | `string` | Czytelna nazwa giełdy do wyświetlenia w UI. |
| `quoteType` | `string` | Klasa aktywa (np. `EQUITY`, `ETF`, `CRYPTOCURRENCY`, `INDEX`, `CURRENCY`). |

### 2.4. Dynamiczne trendy rynkowe (`GET /api/trends`)
* **Metoda biblioteki:** `yahooFinance.screener(screen, { count: 5 })`
* **Dostępne kategorie (`category`):**
  * `gainers` $\rightarrow$ `day_gainers` (największe dzienne wzrosty)
  * `active` $\rightarrow$ `most_actives` (najbardziej aktywne walory pod względem wolumenu)
  * `technology` $\rightarrow$ `growth_technology_stocks` (wzrostowe spółki technologiczne)
  * `undervalued` $\rightarrow$ `undervalued_large_caps` (niedowartościowane duże spółki)
* **Zwracany interfejs (`DynamicTrendAsset[]`):** `symbol`, `name`, `exchange`, `exchangeName` oraz `changePercent` (dzienna zmiana procentowa kursu).

---

## 3. Wyszukiwanie i normalizacja konkretnych stocków oraz tickerów

Pobieranie danych o konkretnym instrumencie odbywa się dwuetapowo: poprzez **wyszukiwanie tekstowe** lub poprzez **automatyczną normalizację symbolu** w funkcji `normalizeYahooSymbol(value, exchange)`.

### 3.1. Jak działa wyszukiwarka (`searchInstruments`)
1. Użytkownik wpisuje frazę (minimum 2 znaki, np. `"Orlen"`, `"Apple"`, `"Bitcoin"`).
2. Endpoint `/api/instruments/search?q=...&limit=20` odpytuje katalog Yahoo Finance (maksymalny limit wynikzabezpieczony na serwerze to 25 wyników).
3. Filtr `quote.isYahooFinance !== false && quote.symbol` odrzuca artykuły prasowe i uszkodzone rekordy, zwracając wyłącznie grywalne instrumenty wraz z ich dokładnym tickerem i kodem giełdy.

### 3.2. Reguły normalizacji tickerów (`normalizeYahooSymbol`)
Aby ułatwić odpytywanie o spółki, serwer przekształca przekazany `symbol` oraz opcjonalny parametr `exchange` według ściśle określonych reguł:

| Przekazany parametr `exchange` | Działanie funkcji `normalizeYahooSymbol` | Przykład wejścia $\rightarrow$ Wyjścia |
| :--- | :--- | :--- |
| `GPW` lub `WARSAW` | Wymusza dodanie sufiksu **`.WA`** (jeśli go brak). | `PKO` $\rightarrow$ `PKO.WA` |
| `LSE` lub `LONDON` | Dodaje sufiks giełdy londyńskiej **`.L`**. | `VOD` $\rightarrow$ `VOD.L` |
| `EURONEXT_PARIS` lub `PARIS` | Dodaje sufiks giełdy paryskiej **`.PA`**. | `AIR` $\rightarrow$ `AIR.PA` |
| `NASDAQ` lub `NYSE` | Usuwa ewentualny polski sufiks `.WA`, pozostawiając czysty ticker USA. | `AAPL.WA` $\rightarrow$ `AAPL` |
| *Brak parametru `exchange`* | Rozpoznaje typ po znakach specjalnych (`.`, `-`, `=`, `^`). Jeśli brak znaków specjalnych – **domyślnie traktuje symbol jako spółkę z GPW (`.WA`)**. | `BTC-USD` $\rightarrow$ `BTC-USD`<br>`PLN=X` $\rightarrow$ `PLN=X`<br>`CDR` $\rightarrow$ `CDR.WA` |

> **Ważna uwaga dla giełdy USA:** Odpytując o amerykańskie spółki bez kropki w tickerze (np. `AAPL`, `MSFT`, `NVDA`), klient powinien zawsze przekazać parametr `exchange` (np. `exchange="NASDAQ"` lub kod giełdy pobrany z wyszukiwarki `NMS`), aby uniknąć domyślnego przypisania sufiksu `.WA`.

---

## 4. Ograniczenia techniczne API

1. **Nieoficjalny charakter API i limity zapytań (Rate Limiting – HTTP 429):**
   Biblioteka `yahoo-finance2` korzysta z publicznych endpointów webowych Yahoo. Przekroczenie bezpiecznego progu zapytań z jednego adresu IP skutkuje tymczasową blokadą. Zastosowany na serwerze 5-minutowy `stockCache` chroni endpoint `/api/candles`, jednak endpointy `/api/instruments/search`, `/api/instruments/quote` oraz `/api/trends` odpytują Yahoo w czasie rzeczywistym.
2. **Opóźnienie notowań (Delayed Data):**
   * **GPW (`.WA`) i większość giełd europejskich:** Notowania i świece są opóźnione o **15 minut** ze względu na regulacje licencyjne poszczególnych giełd.
   * **Giełda USA (NASDAQ / NYSE) oraz Kryptowaluty:** Dane są dostarczane w czasie zbliżonym do rzeczywistego.
3. **Ograniczenia zakresu historii dla małych interwałów (Intraday):**
   Yahoo Finance ogranicza maksymalny czas wstecz (`days`), dla jakiego można pobrać szczegółowe świece:
   * Interwał **`1m`**: maksymalnie **7 dni** wstecz (w wybranych przypadkach do 30 dni).
   * Interwały **`5m`, `15m`**: maksymalnie **60 dni** wstecz.
   * Interwał **`1h`**: maksymalnie **730 dni** (2 lata) wstecz.
   * Interwały **`1d`, `1wk`**: pełna wieloletnia historia.
4. **Dziury czasowe na wykresach poza godzinami sesji:**
   Tradycyjne giełdy pracują wyłącznie w dni robocze w określonych godzinach (np. GPW 9:00–17:00 CET, USA 15:30–22:00 CET). W nocy oraz w weekendy API nie generuje świec, co przy odpytywaniu o `days=1` w weekend dla interwałów minutowych/godzinowych może zwrócić pustą tablicę (`404 Brak danych`).
5. **Niska płynność na mniejszych walorach (np. GlobalConnect):**
   Jeżeli w danym oknie czasowym (np. przez 15 minut) na akcjach nie zawarto żadnej transakcji, Yahoo zwraca obiekt z wartościami `null`. Serwer odfiltrowuje takie rekordy, przez co wykres mało płynnych spółek składa się z mniejszej liczby punktów.
6. **Zasięg modułu `screener` (`/api/trends`):**
   Predefiniowane screenery Yahoo (`day_gainers`, `most_actives` itp.) domyślnie analizują **rynek amerykański (US Market)** i nie zwracają rankingów lokalnych spółek z GPW.

---

## 5. Dostępność danych

### Do jakich instrumentów MAMY pełny dostęp:
* **Akcje giełdowe (Equities):** Wszystkie spółki z głównego parkietu GPW w Warszawie (`.WA`), giełd amerykańskich (NYSE, NASDAQ) oraz głównych parkietów światowych (Londyn `.L`, Paryż `.PA`, Frankfurt `.DE` itd.).
* **Fundusze ETF (Exchange-Traded Funds):** Zarówno amerykańskie (`SPY`, `QQQ`), europejskie UCITS (`IWDA.AS`), jak i polskie ETF-y notowane na GPW (np. `BETAW20TR.WA`).
* **Kryptowaluty:** Setki par kryptowalutowych (np. `BTC-USD`, `ETH-USD`, `BTC-PLN`), które są notowane w trybie 24/7.
* **Rynek walutowy (Forex):** Kursy wymiany walut z sufiksem `=X` (np. `PLN=X` dla USD/PLN, `EURPLN=X`, `EURUSD=X`).
* **Surowce (Kontrakty Futures):** Notowania złota (`GC=F`), srebra (`SI=F`), ropy naftowej (`CL=F`), miedzi (`HG=F`) czy gazu ziemnego (`NG=F`).
* **Indeksy giełdowe:** Światowe i lokalne indeksy z prefiksem `^` lub sufiksem giełdowym (np. `^IXIC` – NASDAQ, `WIG20.WA`).

###  Do jakich danych NIE MAMY dostępu (Ograniczenia poza giełdowe):

1. **Polskie Obligacje Skarbowe (Detaliczne i Hurtowe) oraz rynek Catalyst:**
   * **Obligacje detaliczne:** Nie są instrumentami giełdowymi. Kupuje się je bezpośrednio u agenta emisji (PKO BP / Pekao), nie posiadają kursu rynkowego OHLC, a ich wycena zależy od stałej marży oraz wskaźników inflacji GUS. Nie istnieją w bazie Yahoo Finance.
   * **Obligacje korporacyjne i skarbowe na GPW Catalyst:** Yahoo Finance nie indeksuje polskiego rynku długu Catalyst.
   * *Co można zaoferować w zamian:* Wyłącznie fundusze ETF na obligacje (np. `TLT`, `TBSP.WA`) lub indeksy rentowności obligacji rządu USA (np. `^TNX` – 10-Year US Treasury Yield).
2. **Większość spółek z rynku NewConnect:**
   Mimo że NewConnect jest prowadzony przez GPW, Yahoo Finance pokrywa głównie Główny Rynek (Main Market). Małe spółki z alternatywnego parkietu NewConnect w większości nie są wyszukiwalne lub nie posiadają danych świecowych.
3. **Otwarte Fundusze Inwestycyjne (TFI), PPK oraz OFE:**
   Jednostki uczestnictwa w tradycyjnych polskich funduszach inwestycyjnych (np. PKO TFI, Pekao TFI, Goldman Sachs TFI), które nie są notowane na giełdzie jako ETF, są wyceniane raz dziennie przez towarzystwa funduszy i nie są dostępne w API Yahoo.
4. **Instrumenty rynku OTC (Over-The-Counter), CFD i produkty bankowe:**
   * Wewnętrzne kontrakty różnicowe (CFD) specyficzne dla konkretnych brokerów (np. XTB, Plus500).
   * Lokaty bankowe, konta oszczędnościowe, stopy procentowe NBP (WIBOR / WIRON) oraz transakcje na rynku prywatnym (Private Equity).