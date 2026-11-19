/**
 * Serwer backendu InvestSimulator (Express).
 *
 * Pośredniczy między aplikacją mobilną a Yahoo Finance (`yahoo-finance2`
 * oraz kanały RSS). Wystawia REST API z notowaniami, świecami, danymi
 * finansowymi, trendami i newsami. Odpowiedzi z Yahoo są trzymane w pamięci
 * (cache w obiektach `Map`) przez {@link CACHE_TTL} (newsy i trendy:
 * {@link NEWS_CACHE_TTL} / {@link TRENDS_CACHE_TTL}).
 *
 * ## Uruchomienie
 *
 * ```bash
 * cd backend
 * npm start
 * ```
 *
 * Zmienne środowiskowe (plik `backend/.env`):
 * - `JWT_SECRET` — sekret do podpisywania tokenów JWT (wymagany),
 * - `PORT` — port HTTP, domyślnie `3000`.
 *
 * Przy starcie serwer zapisuje swój adres w sieci lokalnej do pliku
 * `backend/server-address.json` (patrz {@link getLocalIpv4Address}).
 *
 * ## Uwierzytelnianie
 *
 * Aplikacja najpierw wywołuje `POST /api/guest` z identyfikatorem urządzenia
 * i dostaje token JWT ważny 7 dni. Endpointy oznaczone „JWT” wymagają
 * nagłówka `Authorization: Bearer <token>` (patrz {@link authenticateToken}).
 * Brak tokenu → `401`, nieprawidłowy lub wygasły token → `403`.
 *
 * ## Endpointy
 *
 * | Metoda | Ścieżka | JWT | Parametry | Odpowiedź |
 * |---|---|---|---|---|
 * | POST | `/api/guest` | nie | body: `{ deviceId }` | `{ token }` |
 * | GET | `/api/instruments/search` | tak | `q` (min. 2 znaki), `limit` (1–25, domyślnie 20) | tablica `{ symbol, name, exchange, exchangeName, quoteType }` |
 * | GET | `/api/instruments/quote` | tak | `symbol`, `exchange?` | `{ symbol, exchange, marketState, isOpen }` — status giełdy |
 * | GET | `/api/trends` | tak | `category`: `gainers` \| `active` \| `technology` \| `undervalued` | do 10 × `{ symbol, name, exchange, exchangeName, changePercent }` |
 * | GET | `/api/news` | tak | `topic`: `poland` \| `world`, `limit` (1–30, domyślnie 15) | `{ topic, fetchedAt, items[] }` |
 * | GET | `/api/candles` | tak | `symbol`, `exchange?`, `interval` (domyślnie `1d`), `days` (domyślnie 30) | tablica świec `{ timestamp, open, high, low, close }` |
 * | GET | `/api/instruments/financials` | tak | `symbol`, `exchange?` | pełne dane finansowe i wskaźniki instrumentu |
 * | GET | `/api/instruments/performance` | tak | `symbol`, `exchange?` | stopy zwrotu z {@link calculatePerformance} |
 * | GET | `/api/instruments/quote-details` | tak | `symbol`, `exchange?` | szczegóły notowania z {@link mapQuoteToDetails} |
 * | POST | `/api/instruments/quotes` | tak | body: `{ instruments: [{ symbol, exchange? }] }` (maks. 40) | `{ quotes: { "<symbol>_<exchange>": szczegóły \| null } }` |
 * | GET | `/api/quote` | tak | `symbol`, `exchange?` | `{ symbol, currentPrice, change, changePercent }` |
 * | GET | `/api/config` | nie | — | zawartość `server-address.json`: `{ host, port, url }` |
 *
 * Symbol z parametru `symbol` jest zamieniany na symbol Yahoo przez
 * {@link normalizeYahooSymbol} (np. `PKO` → `PKO.WA`). Błędy Yahoo są zwracane
 * jako `{ error: "<komunikat po polsku>" }` ze statusem `5xx`.
 *
 * @module backend/server
 */

require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const YahooFinance = require("yahoo-finance2").default;
const { filterNewsWithContent } = require("./newsQuality");
/** Klient biblioteki `yahoo-finance2` współdzielony przez wszystkie endpointy. */
const yahooFinance = new YahooFinance();

/**
 * Aplikacja Express z włączonym CORS i parsowaniem JSON w body żądań.
 * Wszystkie trasy API są rejestrowane na tym obiekcie.
 */
const app = express();
app.use(cors());
app.use(express.json());

/** Sekret do podpisywania i weryfikacji tokenów JWT (`process.env.JWT_SECRET`). */
const JWT_SECRET = process.env.JWT_SECRET;

/** Port HTTP serwera (`process.env.PORT`, domyślnie `3000`). */
const PORT = Number(process.env.PORT || 3000);

/**
 * Zwraca adres IPv4 komputera w sieci lokalnej.
 *
 * Przegląda interfejsy sieciowe i bierze pierwszy zewnętrzny (nie loopback)
 * adres IPv4. Dzięki temu telefon w tej samej sieci Wi-Fi może połączyć się
 * z backendem uruchomionym na komputerze.
 *
 * @returns {string} Adres IPv4, np. `"192.168.1.20"`, albo `"localhost"`,
 *   gdy nie znaleziono żadnego interfejsu sieciowego.
 */
const getLocalIpv4Address = () => {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    const address = addresses?.find(
      (candidate) => candidate.family === "IPv4" && !candidate.internal,
    );

    if (address) return address.address;
  }

  return "localhost";
};

/** Adres IPv4 serwera w sieci lokalnej, wyliczony raz przy starcie. */
const localAddress = getLocalIpv4Address();

/**
 * Ścieżka do pliku `backend/server-address.json`, do którego przy starcie
 * zapisywany jest adres serwera (`{ host, port, url }`). Plik jest zwracany
 * przez `GET /api/config`.
 */
const serverAddressFile = path.join(__dirname, "server-address.json");

// Zapis adresu serwera do pliku — błąd zapisu nie zatrzymuje startu serwera.
try {
  fs.writeFileSync(
    serverAddressFile,
    `${JSON.stringify({ host: localAddress, port: PORT, url: `http://${localAddress}:${PORT}` }, null, 2)}\n`,
  );
} catch (error) {
  console.warn(
    "Nie udało się zapisać pliku server-address.json:",
    error.message,
  );
}

// MEMORY CACHE
// Każdy cache to Map<klucz, { timestamp: number, data: unknown }>.
// Wpis jest ważny, dopóki `Date.now() - timestamp` jest mniejsze od TTL.

/** Cache świec z `GET /api/candles`, klucz: `"<symbol>_<interval>_<days>"`. */
const stockCache = new Map();
/** Cache danych z `GET /api/instruments/financials`, klucz: `"financials_<symbol>"`. */
const financialsCache = new Map();
/** Cache wyników {@link calculatePerformance}, klucz: `"perf_<symbol>"`. */
const performanceCache = new Map();
/**
 * Cache szczegółów notowań z `GET /api/instruments/quote-details`
 * i `POST /api/instruments/quotes`, klucz: `"quote_details_<symbol>"`.
 */
const quoteDetailsCache = new Map();
/** Cache newsów z `GET /api/news`, klucz: `"news_<topic>_<limit>"`. */
const newsCache = new Map();
/** Cache trendów z `GET /api/trends`, klucz: `"trends_<category>"`. */
const trendsCache = new Map();
/** Czas ważności cache notowań, świec i danych finansowych: 5 minut (w ms). */
const CACHE_TTL = 5 * 60 * 1000; // 5 minut
/** Czas ważności cache newsów: 10 minut (w ms). */
const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minut
/** Czas ważności cache trendów: 10 minut (w ms). */
const TRENDS_CACHE_TTL = 10 * 60 * 1000; // 10 minut

/**
 * Symbole Yahoo, z których kanałów RSS pobierane są newsy dla danego tematu.
 * - `poland` — ETF na polski rynek (EPOL) i duże spółki z GPW,
 * - `world` — główne indeksy USA (S&P 500, Dow Jones, Nasdaq) i ETF-y światowe.
 *
 * Klucze tego obiektu są jedynymi dozwolonymi wartościami parametru `topic`
 * w `GET /api/news`.
 */
const NEWS_FEEDS = {
  poland: ["EPOL", "PKO.WA", "PKN.WA", "PZU.WA", "CDR.WA", "KGH.WA"],
  world: ["^GSPC", "^DJI", "^IXIC", "ACWI", "URTH"],
};

/**
 * Słowa kluczowe (nazwy, indeksy, spółki) rozpoznające newsy o polskim rynku.
 * Potrzebne, bo newsy z kanałów polskich spółek bywają przemieszane z globalnymi.
 */
const POLAND_KEYWORDS =
  /(poland|polish|warsaw|gpw|wig20|wig|polska|polski|polskie|polsce|pko|orlen|pkn|pzu|kgh|kghm|cd projekt|pekao|tauron|pge|dino|allegro|mbank|lpp|cyfrowy polsat|orange polska|bank polski|baltic power|wse:|\.wa\b)/i;

/**
 * Sprawdza, czy news dotyczy polskiego rynku — czy tytuł lub treść zawiera
 * któreś ze słów z {@link POLAND_KEYWORDS}.
 *
 * @param {{title: string, summary: string}} item News z RSS.
 * @returns {boolean} `true`, gdy news dotyczy Polski.
 */
const isRelevantPolandNews = (item) =>
  POLAND_KEYWORDS.test(`${item.title} ${item.summary}`);

/**
 * Dekoduje encje XML/HTML i rozpakowuje sekcje `CDATA` z tekstu RSS.
 *
 * Obsługuje encje liczbowe (`&#39;`, `&#x27;`) oraz nazwane: `&nbsp;`,
 * `&amp;`, `&quot;`, `&apos;`, `&lt;`, `&gt;`.
 *
 * @param {unknown} [value=""] Surowy tekst z XML.
 * @returns {string} Tekst ze zdekodowanymi znakami.
 */
const decodeXmlEntities = (value = "") =>
  String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

/**
 * Zamienia fragment HTML z RSS na czysty tekst.
 *
 * Dekoduje encje ({@link decodeXmlEntities}), usuwa znaczniki HTML
 * i scala białe znaki w pojedyncze spacje.
 *
 * @param {unknown} [value=""] Tekst z możliwymi znacznikami HTML.
 * @returns {string} Czysty tekst bez znaczników.
 */
const stripHtml = (value = "") =>
  decodeXmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Ustala nazwę wydawcy na podstawie adresu artykułu.
 *
 * Używana, gdy element RSS nie ma pola `<source>`. Zwraca domenę bez `www.`;
 * dla `finance.yahoo.com` oraz niepoprawnych adresów zwraca `"Yahoo Finance"`.
 *
 * @param {string} link Adres URL artykułu.
 * @returns {string} Nazwa wydawcy, np. `"reuters.com"` lub `"Yahoo Finance"`.
 */
const publisherFromLink = (link) => {
  try {
    const hostname = new URL(link).hostname.replace(/^www\./, "");
    return hostname === "finance.yahoo.com" ? "Yahoo Finance" : hostname;
  } catch {
    return "Yahoo Finance";
  }
};

/**
 * Parsuje kanał RSS 2.0 Yahoo Finance na listę newsów.
 *
 * Z każdego elementu `<item>` czyta pola `title`, `link`, `description`,
 * `guid`, `pubDate` i `source` (bez zewnętrznego parsera XML — wyrażeniami
 * regularnymi). Elementy bez tytułu lub linku są pomijane. Gdy data publikacji
 * jest niepoprawna, ustawiana jest bieżąca data.
 *
 * @param {string} xml Treść kanału RSS.
 * @returns {Array<{id: string, title: string, summary: string, publisher: string, link: string, publishedAt: string}>}
 *   Lista newsów; `publishedAt` w formacie ISO 8601, `id` to `guid` lub link.
 */
const parseNewsRss = (xml) => {
  const blocks = String(xml).match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  const items = [];

  for (const block of blocks) {
    // Czyta zawartość pierwszego znacznika `<tag>` w elemencie jako czysty tekst
    const pick = (tag) => {
      const match = block.match(
        new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
      );
      return match ? stripHtml(match[1]) : "";
    };

    const title = pick("title");
    const link = pick("link");
    if (!title || !link) continue;

    const publishedAt = new Date(pick("pubDate"));
    const publisher = pick("source") || publisherFromLink(link);

    items.push({
      id: pick("guid") || link,
      title,
      summary: pick("description"),
      publisher,
      link,
      publishedAt: Number.isNaN(publishedAt.getTime())
        ? new Date().toISOString()
        : publishedAt.toISOString(),
    });
  }

  return items;
};

/**
 * Pobiera i scala newsy z wszystkich kanałów RSS jednego tematu.
 *
 * Dla każdego symbolu z {@link NEWS_FEEDS} równolegle pobiera kanał
 * `feeds.finance.yahoo.com` (limit 8 s na kanał). Kanały, które zwróciły błąd,
 * są pomijane. Duplikaty (ten sam link bez parametrów zapytania) są usuwane.
 * Wynik nie jest jeszcze filtrowany pod kątem jakości treści.
 *
 * @param {"poland" | "world"} topic Temat newsów — klucz {@link NEWS_FEEDS}.
 * @returns {Promise<ReturnType<typeof parseNewsRss>>} Newsy posortowane od najnowszego.
 */
const fetchNewsForTopic = async (topic) => {
  const symbols = NEWS_FEEDS[topic];
  const responses = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; InvestSimulator/1.0)",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`RSS ${symbol}: ${response.status}`);
      return parseNewsRss(await response.text());
    }),
  );

  const seen = new Set();
  const merged = [];

  for (const result of responses) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      const key = item.link.split("?")[0].toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  return merged.sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );
};

/**
 * Porządkuje newsy pod kątem tematu.
 *
 * Dla tematu `poland` najpierw zwraca artykuły faktycznie dotyczące polskiego
 * rynku ({@link isRelevantPolandNews}). Jeśli takich jest co najmniej 6,
 * zwraca tylko je; w przeciwnym razie dokłada na koniec pozostałe newsy.
 * Dla innych tematów zwraca listę bez zmian.
 *
 * @template {{title: string, summary: string}} T
 * @param {T[]} items Newsy po filtrze jakości.
 * @param {string} topic Temat newsów.
 * @returns {T[]} Uporządkowana lista newsów.
 */
const orderNewsForTopic = (items, topic) => {
  if (topic !== "poland") return items;
  const relevant = items.filter(isRelevantPolandNews);
  if (relevant.length >= 6) return relevant;
  const rest = items.filter((item) => !isRelevantPolandNews(item));
  return [...relevant, ...rest];
};

/**
 * Znane symbole spółek i ETF-ów z giełd USA.
 *
 * Używane przez {@link normalizeYahooSymbol}: symbol bez sufiksu giełdy,
 * którego nie ma na tej liście, jest traktowany jako spółka z GPW
 * (dostaje sufiks `.WA`).
 */
const KNOWN_US_SYMBOLS = new Set([
  "AAPL",
  "MSFT",
  "GOOGL",
  "GOOG",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
  "NFLX",
  "AMD",
  "INTC",
  "IBM",
  "ORCL",
  "CRM",
  "ADBE",
  "QCOM",
  "TXN",
  "AVGO",
  "CSCO",
  "PYPL",
  "UBER",
  "ABNB",
  "DIS",
  "BA",
  "KO",
  "PEP",
  "MCD",
  "NKE",
  "SBUX",
  "WMT",
  "COST",
  "TGT",
  "JNJ",
  "PFE",
  "MRK",
  "UNH",
  "ABBV",
  "JPM",
  "BAC",
  "WFC",
  "C",
  "GS",
  "MS",
  "V",
  "MA",
  "AXP",
  "XOM",
  "CVX",
  "COP",
  "SLB",
  "EOG",
  "CAT",
  "DE",
  "GE",
  "HON",
  "MMM",
  "LMT",
  "RTX",
  "SPY",
  "QQQ",
  "IWM",
  "DIA",
  "VOO",
  "VTI",
]);

/**
 * Zamienia symbol instrumentu z aplikacji na symbol rozumiany przez Yahoo Finance.
 *
 * Symbol jest zamieniany na wielkie litery i przycinany. Następnie:
 * - giełda `GPW` / `WARSAW` → dodaje sufiks `.WA` (jeśli go nie ma),
 * - `LSE` / `LONDON` → dodaje `.L` (jeśli symbol nie ma kropki),
 * - `EURONEXT_PARIS` / `PARIS` → dodaje `.PA` (jeśli symbol nie ma kropki),
 * - `NASDAQ` / `NYSE` → usuwa ewentualny sufiks `.WA`,
 * - inna podana giełda → symbol bez zmian.
 *
 * Bez giełdy: symbole z `.`, `-`, `=` lub zaczynające się od `^` (indeksy,
 * waluty, kryptowaluty) oraz symbole z {@link KNOWN_US_SYMBOLS} zostają bez
 * zmian, a pozostałe są traktowane jako spółki z GPW (sufiks `.WA`).
 *
 * @param {unknown} value Symbol z aplikacji, np. `"pko"`, `"AAPL"`, `"^GSPC"`.
 * @param {unknown} [exchange] Kod lub nazwa giełdy, np. `"GPW"`, `"NASDAQ"`.
 * @returns {string} Symbol Yahoo, np. `"PKO.WA"`, `"AAPL"`.
 *
 * @example
 * normalizeYahooSymbol("pko");            // "PKO.WA"
 * normalizeYahooSymbol("AAPL");           // "AAPL"
 * normalizeYahooSymbol("VOD", "LSE");     // "VOD.L"
 * normalizeYahooSymbol("CDR.WA", "NYSE"); // "CDR"
 */
const normalizeYahooSymbol = (value, exchange) => {
  const symbol = String(value).trim().toUpperCase();
  if (!symbol) return symbol;

  const normalizedExchange = String(exchange || "")
    .trim()
    .toUpperCase();
  if (normalizedExchange === "GPW" || normalizedExchange === "WARSAW") {
    return symbol.endsWith(".WA") ? symbol : `${symbol}.WA`;
  }
  if (normalizedExchange === "LSE" || normalizedExchange === "LONDON") {
    return symbol.includes(".") ? symbol : `${symbol}.L`;
  }
  if (
    normalizedExchange === "EURONEXT_PARIS" ||
    normalizedExchange === "PARIS"
  ) {
    return symbol.includes(".") ? symbol : `${symbol}.PA`;
  }
  if (normalizedExchange === "NASDAQ" || normalizedExchange === "NYSE") {
    return symbol.replace(/\.WA$/, "");
  }
  if (normalizedExchange) {
    return symbol;
  }
  if (
    symbol.includes(".") ||
    symbol.includes("-") ||
    symbol.includes("=") ||
    symbol.startsWith("^")
  ) {
    return symbol;
  }

  if (KNOWN_US_SYMBOLS.has(symbol)) {
    return symbol;
  }

  return `${symbol}.WA`;
};

/**
 * `POST /api/guest` — wydaje token JWT dla urządzenia (konto gościa).
 *
 * Body: `{ deviceId: string }`. Zwraca `{ token }` — JWT z polem `deviceId`,
 * ważny 7 dni. Brak `deviceId` → `400`. Endpoint nie wymaga uwierzytelnienia.
 */
app.post("/api/guest", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "Brak ID urządzenia" });

  const token = jwt.sign({ deviceId }, JWT_SECRET, { expiresIn: "7d" });
  console.log("Generowanie nowego tokenu JWT:", token);
  res.json({ token });
});

/**
 * Middleware Express sprawdzający token JWT.
 *
 * Czyta token z nagłówka `Authorization: Bearer <token>` i weryfikuje go
 * sekretem `JWT_SECRET` (zmienna środowiskowa). Po poprawnej weryfikacji zapisuje dane z tokenu
 * (`{ deviceId, iat, exp }`) w `req.user` i przekazuje żądanie dalej.
 *
 * @param {import("express").Request & {user?: unknown}} req Żądanie HTTP.
 * @param {import("express").Response} res Odpowiedź HTTP — przy błędzie
 *   `401 { error: "Brak dostępu" }` (brak tokenu) albo
 *   `403 { error: "Token wygasł" }` (token niepoprawny lub wygasły).
 * @param {import("express").NextFunction} next Przejście do kolejnego handlera.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Brak dostępu" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token wygasł" });
    req.user = user;
    next();
  });
};

/**
 * `GET /api/instruments/search?q=<fraza>&limit=<1–25>` — wyszukiwarka instrumentów.
 *
 * Szuka w Yahoo Finance (`search`) instrumentów pasujących do frazy.
 * Fraza krótsza niż 2 znaki zwraca pustą tablicę. Domyślny limit to 20.
 * Zwraca tablicę `{ symbol, name, exchange, exchangeName, quoteType }`.
 * Błąd Yahoo → `502`.
 */
app.get("/api/instruments/search", authenticateToken, async (req, res) => {
  const query = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 25);
  if (query.length < 2) return res.json([]);

  try {
    const result = await yahooFinance.search(query, {
      quotesCount: limit,
      newsCount: 0,
    });
    const instruments = (result.quotes || [])
      .filter((quote) => quote.isYahooFinance !== false && quote.symbol)
      .slice(0, limit)
      .map((quote) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchange || "",
        exchangeName: quote.exchDisp || quote.exchange || "Yahoo Finance",
        quoteType: quote.quoteType || "EQUITY",
      }));

    res.json(instruments);
  } catch (error) {
    console.error("Błąd wyszukiwania instrumentów:", error.message);
    res.status(502).json({ error: "Nie udało się wyszukać instrumentów" });
  }
});

/**
 * `GET /api/instruments/quote?symbol=<symbol>&exchange=<giełda>` — status giełdy instrumentu.
 *
 * Zwraca `{ symbol, exchange, marketState, isOpen }`. `isOpen` jest `true`,
 * gdy `marketState` to sesja regularna lub handel przed/po sesji
 * (`REGULAR`, `PRE`, `POST`, `PREPRE`, `POSTPOST`). Aplikacja używa go m.in.
 * do ostrzeżenia, że rynek jest zamknięty.
 * Brak symbolu → `400`, brak notowania → `404`, błąd Yahoo → `502`.
 */
app.get("/api/instruments/quote", authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || "").trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol)
    return res.status(400).json({ error: "Brak symbolu instrumentu" });

  const symbol = normalizeYahooSymbol(requestedSymbol, exchange);
  try {
    const quote = await yahooFinance.quote(symbol, {}, { validate: false });
    if (!quote)
      return res.status(404).json({ error: "Brak notowania instrumentu" });

    const marketState = quote.marketState || "CLOSED";
    const activeStates = new Set([
      "REGULAR",
      "PRE",
      "POST",
      "PREPRE",
      "POSTPOST",
    ]);
    res.json({
      symbol,
      exchange: quote.fullExchangeName || quote.exchange || "Yahoo Finance",
      marketState,
      isOpen: activeStates.has(marketState),
    });
  } catch (error) {
    console.error(
      `Błąd pobierania statusu giełdy dla ${symbol}:`,
      error.message,
    );
    res.status(502).json({ error: "Nie udało się pobrać statusu giełdy" });
  }
});

/**
 * `GET /api/trends?category=<kategoria>` — lista trendujących instrumentów.
 *
 * Kategorie i odpowiadające im screenery Yahoo:
 * - `gainers` (domyślna) → `day_gainers` — największe wzrosty dnia,
 * - `active` → `most_actives` — największy obrót,
 * - `technology` → `growth_technology_stocks` — spółki technologiczne wzrostowe,
 * - `undervalued` → `undervalued_large_caps` — niedowartościowane duże spółki.
 *
 * Nieznana kategoria jest traktowana jak `gainers`. Zwraca do 10 elementów
 * `{ symbol, name, exchange, exchangeName, changePercent }`. Wynik jest
 * cache'owany przez {@link TRENDS_CACHE_TTL}. Błąd Yahoo → `502`.
 */
app.get("/api/trends", authenticateToken, async (req, res) => {
  const screens = {
    gainers: "day_gainers",
    active: "most_actives",
    technology: "growth_technology_stocks",
    undervalued: "undervalued_large_caps",
  };
  const requestedCategory = String(req.query.category || "gainers");
  const category = screens[requestedCategory] ? requestedCategory : "gainers";
  const screen = screens[category];
  const cacheKey = `trends_${category}`;
  const now = Date.now();

  const cached = trendsCache.get(cacheKey);
  if (cached && now - cached.timestamp < TRENDS_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const result = await yahooFinance.screener(screen, { count: 10 });
    const data = (result.quotes || []).slice(0, 10).map((quote) => ({
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || quote.symbol,
      exchange: quote.exchange || "",
      exchangeName: quote.fullExchangeName || quote.exchange || "Yahoo Finance",
      changePercent: quote.regularMarketChangePercent ?? 0,
    }));

    trendsCache.set(cacheKey, { timestamp: now, data });
    res.json(data);
  } catch (error) {
    console.error(`Błąd pobierania trendów ${category}:`, error.message);
    res
      .status(502)
      .json({ error: "Nie udało się pobrać dynamicznych trendów" });
  }
});

/**
 * `GET /api/news?topic=poland|world&limit=15` — newsy rynkowe z RSS Yahoo.
 *
 * Kolejno: pobiera kanały tematu ({@link fetchNewsForTopic}), odrzuca newsy
 * bez sensownej treści (`filterNewsWithContent` z `backend/newsQuality`),
 * porządkuje je ({@link orderNewsForTopic}) i przycina do `limit` (1–30,
 * domyślnie 15). Zwraca `{ topic, fetchedAt, items }`, gdzie `items` mają
 * kształt `{ id, title, summary, publisher, link, publishedAt }`.
 *
 * Wynik jest cache'owany przez {@link NEWS_CACHE_TTL}.
 * Nieznany temat → `400`, błąd pobierania → `502`.
 */
app.get("/api/news", authenticateToken, async (req, res) => {
  const topic = String(req.query.topic || "world").toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 30);

  if (!NEWS_FEEDS[topic]) {
    return res.status(400).json({ error: "Nieznany temat newsów" });
  }

  const cacheKey = `news_${topic}_${limit}`;
  const now = Date.now();
  if (newsCache.has(cacheKey)) {
    const cached = newsCache.get(cacheKey);
    if (now - cached.timestamp < NEWS_CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    // Filtr przed `slice`, żeby odrzucone newsy nie zmniejszały listy poniżej limitu
    const items = orderNewsForTopic(
      filterNewsWithContent(await fetchNewsForTopic(topic)),
      topic,
    ).slice(0, limit);
    const data = { topic, fetchedAt: new Date(now).toISOString(), items };
    newsCache.set(cacheKey, { timestamp: now, data });
    res.json(data);
  } catch (error) {
    console.error(`Błąd pobierania newsów (${topic}):`, error.message);
    res
      .status(502)
      .json({ error: "Nie udało się pobrać newsów z Yahoo Finance" });
  }
});

/**
 * `GET /api/candles?symbol=<symbol>&exchange=<giełda>&interval=<interwał>&days=<dni>`
 * — świece (OHLC) do wykresu.
 *
 * Pobiera z Yahoo (`chart`) notowania z ostatnich `days` dni (domyślnie 30)
 * w interwale `interval` (domyślnie `1d`; dostępne m.in. `1m`, `5m`, `15m`,
 * `1h`, `1d`, `1wk`). Świece bez ceny otwarcia lub zamknięcia są pomijane,
 * ceny są zaokrąglane do 2 miejsc po przecinku.
 *
 * Zwraca tablicę `{ timestamp, open, high, low, close }` (`timestamp` w ms).
 * Wynik jest cache'owany przez {@link CACHE_TTL}.
 * Brak symbolu → `400`, brak danych → `404`, błąd Yahoo → `500`.
 *
 * @example
 * // GET /api/candles?symbol=PKO
 * // GET /api/candles?symbol=CDR&interval=1h&days=7
 * // GET /api/candles?symbol=KGH&interval=15m&days=2
 */
app.get("/api/candles", authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || "");
  const exchange = req.query.exchange;
  let symbol = requestedSymbol;
  let interval = req.query.interval ? req.query.interval : "1d";
  let days = req.query.days ? req.query.days : 30;
  if (!symbol) return res.status(400).json({ error: "Brak symbolu akcji" });

  symbol = normalizeYahooSymbol(symbol, exchange);
  console.log(
    `Normalizacja symbolu: ${requestedSymbol} [${exchange || "domyślna giełda"}] -> ${symbol}`,
  );

  const cacheKey = `${symbol}_${interval}_${days}`;
  const now = Date.now();

  // Checking cache.
  if (stockCache.has(cacheKey)) {
    const cached = stockCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      console.log(`Zwracam świece z cache: ${cacheKey}`);
      return res.json(cached.data);
    }
  }

  try {
    console.log(`Pobieram świece z giełdy: ${cacheKey}`);

    // Obliczenie daty początkowej (np. 30 dni wstecz)
    const period1 = new Date(now - Number(days) * 24 * 60 * 60 * 1000);

    const result = await yahooFinance.chart(symbol, {
      period1: period1,
      interval: interval, // Dostępne m.in.: '1m', '5m', '15m', '1h', '1d', '1wk'
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      return res
        .status(404)
        .json({ error: "Brak danych dla podanego symbolu" });
    }

    /// Candle formatting data
    const formattedCandles = result.quotes
      .filter((q) => q.open !== null && q.close !== null)
      .map((q) => ({
        timestamp: new Date(q.date).getTime(), // Konwersja daty na timestamp w milisekundach
        open: Math.round(q.open * 100) / 100,
        high: Math.round(q.high * 100) / 100,
        low: Math.round(q.low * 100) / 100,
        close: Math.round(q.close * 100) / 100,
      }));

    // 3. Zapis do cache'u
    stockCache.set(cacheKey, {
      timestamp: now,
      data: formattedCandles,
    });

    res.json(formattedCandles);
  } catch (error) {
    console.error(`Błąd pobierania świec dla ${symbol}:`, error.message);
    res
      .status(500)
      .json({ error: "Błąd podczas pobierania danych historycznych" });
  }
});

/**
 * Oblicza historyczne stopy zwrotu instrumentu z miesięcznych notowań
 * z ostatnich 5 lat.
 *
 * Bazą każdej stopy jest cena zamknięcia sprzed danego okresu, a odniesieniem
 * ostatnia cena zamknięcia:
 * - `performance1Y` / `performance3Y` / `performance5Y` — łączna zmiana ceny
 *   w procentach za 1, 3 i 5 lat (przy krótszej historii bazą jest
 *   najstarsze dostępne notowanie),
 * - `performanceYTD` — zmiana od pierwszego notowania w bieżącym roku,
 * - `oneYearAvgReturn` — to samo co `performance1Y`,
 * - `threeYearAvgReturn` / `fiveYearAvgReturn` — średnioroczna stopa zwrotu
 *   (CAGR): `((1 + zwrot) ^ (1 / lata) - 1) * 100`; `0`, gdy strata ≥ 100%.
 *
 * Wszystkie wartości w procentach, zaokrąglone do 2 miejsc. Wynik jest
 * cache'owany przez {@link CACHE_TTL}. Funkcja nie rzuca wyjątków.
 *
 * @param {string} symbol Symbol Yahoo (po {@link normalizeYahooSymbol}).
 * @returns {Promise<{
 *   performance1Y: number, performance3Y: number, performance5Y: number,
 *   performanceYTD: number, oneYearAvgReturn: number,
 *   threeYearAvgReturn: number, fiveYearAvgReturn: number
 * } | null>} Stopy zwrotu albo `null`, gdy brak notowań lub wystąpił błąd.
 */
const calculatePerformance = async (symbol) => {
  const cacheKey = `perf_${symbol}`;
  const now = Date.now();
  if (performanceCache.has(cacheKey)) {
    const cached = performanceCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const nowObj = new Date();
    const fiveYearsAgo = new Date(
      nowObj.getFullYear() - 5,
      nowObj.getMonth(),
      nowObj.getDate(),
    );
    const chart = await yahooFinance.chart(
      symbol,
      { period1: fiveYearsAgo, interval: "1mo" },
      { validate: false },
    );
    const quotes = (chart?.quotes || []).filter((q) => q && q.close != null);
    if (!quotes.length) return null;

    const currentPrice = quotes[quotes.length - 1].close;
    const nowYear = nowObj.getFullYear();
    const ytdQuote =
      quotes.find((q) => new Date(q.date).getFullYear() === nowYear) ||
      quotes[quotes.length - 1];
    const q1Y = quotes.length >= 13 ? quotes[quotes.length - 13] : quotes[0];
    const q3Y = quotes.length >= 37 ? quotes[quotes.length - 37] : quotes[0];
    const q5Y = quotes[0];

    // Zmiana ceny w % względem notowania bazowego (0, gdy brak ceny bazowej)
    const calcRet = (base) =>
      base && base.close ? ((currentPrice - base.close) / base.close) * 100 : 0;
    const p1Y = calcRet(q1Y);
    const p3Y = calcRet(q3Y);
    const p5Y = calcRet(q5Y);
    const pYTD = calcRet(ytdQuote);

    const perfData = {
      performance1Y: Math.round(p1Y * 100) / 100,
      performance3Y: Math.round(p3Y * 100) / 100,
      performance5Y: Math.round(p5Y * 100) / 100,
      performanceYTD: Math.round(pYTD * 100) / 100,
      oneYearAvgReturn: Math.round(p1Y * 100) / 100,
      threeYearAvgReturn:
        p3Y > -100
          ? Math.round(
              (Math.pow(Math.max(0.001, 1 + p3Y / 100), 1 / 3) - 1) * 10000,
            ) / 100
          : 0,
      fiveYearAvgReturn:
        p5Y > -100
          ? Math.round(
              (Math.pow(Math.max(0.001, 1 + p5Y / 100), 1 / 5) - 1) * 10000,
            ) / 100
          : 0,
    };

    performanceCache.set(cacheKey, { timestamp: now, data: perfData });
    return perfData;
  } catch (error) {
    console.warn(
      `Nie udało się obliczyć wyników historycznych dla ${symbol}:`,
      error.message,
    );
    return null;
  }
};

/**
 * `GET /api/instruments/financials?symbol=<symbol>&exchange=<giełda>` — pełne
 * dane finansowe instrumentu do ekranu szczegółów.
 *
 * Równolegle pobiera z Yahoo `quoteSummary` (moduły `summaryDetail`,
 * `defaultKeyStatistics`, `financialData`, `price`), `quote` oraz stopy
 * zwrotu z {@link calculatePerformance}. Każde z tych źródeł może zawieść
 * niezależnie — brakujące pola są uzupełniane z pozostałych źródeł albo
 * wartością `0`.
 *
 * Zwracane pola (w `symbol` jest symbol z żądania, nie symbol Yahoo):
 * - cena: `currency`, `price`, `change`, `changePercent`, `volume`, `averageVolume`,
 * - wielkość: `marketCap`, `sharesOutstanding`, `floatShares`, `enterpriseValue`, `bookValue`,
 * - dywidenda: `dividendRate`, `dividendYield`, `exDividendDate`, `payoutRatio`,
 *   `fiveYearAvgDividendYield`,
 * - wskaźniki: `beta`, `trailingPE`, `forwardPE`, `priceToBook`, `priceToSales`,
 *   `enterpriseValueToRevenue`, `enterpriseValueToEbitda`, `priceToFreeCashFlow`,
 *   `profitMargins`,
 * - krótka sprzedaż: `sharesShort`, `shortRatio`, `shortPercentOfFloat`,
 * - split: `lastSplitFactor`, `lastSplitDate`,
 * - wyniki: `performance1Y`, `performance3Y`, `performance5Y`, `performanceYTD`,
 *   `oneYearAvgReturn`, `threeYearAvgReturn`, `fiveYearAvgReturn`.
 *
 * Procenty (dywidenda, marże, short) są zwracane w skali 0–100. Daty w ISO 8601.
 * Wynik jest cache'owany przez {@link CACHE_TTL}.
 * Brak symbolu → `400`, brak danych z obu źródeł → `404`, inny błąd → `500`.
 */
app.get("/api/instruments/financials", authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || "").trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol)
    return res.status(400).json({ error: "Brak symbolu akcji" });

  const symbol = normalizeYahooSymbol(requestedSymbol, exchange);
  const cacheKey = `financials_${symbol}`;
  const now = Date.now();

  if (financialsCache.has(cacheKey)) {
    const cached = financialsCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    const [quoteSummary, quote, perf] = await Promise.all([
      yahooFinance
        .quoteSummary(
          symbol,
          {
            modules: [
              "summaryDetail",
              "defaultKeyStatistics",
              "financialData",
              "price",
            ],
          },
          { validate: false },
        )
        .catch((err) => {
          console.warn(`Błąd quoteSummary dla ${symbol}:`, err.message);
          return null;
        }),
      yahooFinance.quote(symbol, {}, { validate: false }).catch((err) => {
        console.warn(`Błąd quote dla ${symbol}:`, err.message);
        return null;
      }),
      calculatePerformance(symbol).catch(() => null),
    ]);

    if (!quoteSummary && !quote) {
      return res
        .status(404)
        .json({ error: "Brak danych finansowych dla podanego symbolu" });
    }

    const price = quoteSummary?.price || {};
    const summaryDetail = quoteSummary?.summaryDetail || {};
    const defaultKeyStatistics = quoteSummary?.defaultKeyStatistics || {};
    const finData = quoteSummary?.financialData || {};

    // Yahoo zwraca procenty raz jako ułamek (0.05), raz jako procent (5).
    // Wartości z przedziału [-1, 1] traktujemy jako ułamek i mnożymy przez 100.
    const normalizePercent = (val) => {
      if (val === undefined || val === null || Number.isNaN(val))
        return undefined;
      return Math.abs(val) <= 1 ? val * 100 : val;
    };

    const regularMarketPrice =
      quote?.regularMarketPrice ??
      price?.regularMarketPrice ??
      finData?.currentPrice ??
      0;
    const regularMarketChange =
      quote?.regularMarketChange ?? price?.regularMarketChange ?? 0;
    const regularMarketChangePercent =
      quote?.regularMarketChangePercent != null
        ? quote.regularMarketChangePercent
        : price?.regularMarketChangePercent != null
          ? price.regularMarketChangePercent * 100
          : 0;

    const dividendYieldRaw =
      summaryDetail?.dividendYield ?? quote?.dividendYield;
    const dividendYield =
      dividendYieldRaw != null ? normalizePercent(dividendYieldRaw) : undefined;

    const payoutRatioRaw = summaryDetail?.payoutRatio;
    const payoutRatio =
      payoutRatioRaw != null ? normalizePercent(payoutRatioRaw) : undefined;

    const fiveYearAvgDividendYieldRaw = summaryDetail?.fiveYearAvgDividendYield;
    const fiveYearAvgDividendYield =
      fiveYearAvgDividendYieldRaw != null
        ? normalizePercent(fiveYearAvgDividendYieldRaw)
        : undefined;

    const profitMarginsRaw = finData?.profitMargins;
    const profitMargins =
      profitMarginsRaw != null ? normalizePercent(profitMarginsRaw) : undefined;

    const shortPercentOfFloatRaw = defaultKeyStatistics?.shortPercentOfFloat;
    const shortPercentOfFloat =
      shortPercentOfFloatRaw != null
        ? normalizePercent(shortPercentOfFloatRaw)
        : undefined;

    const marketCapVal =
      summaryDetail?.marketCap ?? price?.marketCap ?? quote?.marketCap;
    const freeCashflowVal = finData?.freeCashflow;
    const priceToFreeCashFlow =
      freeCashflowVal && marketCapVal
        ? marketCapVal / freeCashflowVal
        : undefined;

    const lastSplitDateVal = defaultKeyStatistics?.lastSplitDate;
    const lastSplitDate = lastSplitDateVal
      ? typeof lastSplitDateVal === "number"
        ? new Date(lastSplitDateVal * 1000).toISOString()
        : new Date(lastSplitDateVal).toISOString()
      : undefined;

    const exDividendDateVal = summaryDetail?.exDividendDate;
    const exDividendDate = exDividendDateVal
      ? typeof exDividendDateVal === "number"
        ? new Date(exDividendDateVal * 1000).toISOString()
        : new Date(exDividendDateVal).toISOString()
      : undefined;

    const perf1Y =
      perf?.performance1Y ??
      (quote?.fiftyTwoWeekChangePercent != null
        ? quote.fiftyTwoWeekChangePercent
        : defaultKeyStatistics?.["52WeekChange"] != null
          ? defaultKeyStatistics["52WeekChange"] * 100
          : undefined);

    const result = {
      symbol: requestedSymbol,
      currency: price?.currency || quote?.currency || "USD",
      price: regularMarketPrice,
      change: regularMarketChange,
      changePercent: regularMarketChangePercent,
      volume:
        quote?.regularMarketVolume ??
        price?.regularMarketVolume ??
        summaryDetail?.regularMarketVolume ??
        0,
      averageVolume:
        summaryDetail?.averageDailyVolume10Day ??
        summaryDetail?.averageVolume10days ??
        quote?.averageDailyVolume10Day ??
        0,
      marketCap: marketCapVal ?? 0,
      sharesOutstanding:
        defaultKeyStatistics?.sharesOutstanding ??
        quote?.sharesOutstanding ??
        0,
      bookValue: defaultKeyStatistics?.bookValue ?? quote?.bookValue ?? 0,
      dividendRate: summaryDetail?.dividendRate ?? quote?.dividendRate ?? 0,
      dividendYield: dividendYield ?? 0,
      exDividendDate: exDividendDate,
      payoutRatio: payoutRatio ?? 0,
      fiveYearAvgDividendYield: fiveYearAvgDividendYield ?? 0,
      beta: summaryDetail?.beta ?? defaultKeyStatistics?.beta ?? 0,
      trailingPE: summaryDetail?.trailingPE ?? quote?.trailingPE ?? 0,
      forwardPE:
        summaryDetail?.forwardPE ??
        quote?.forwardPE ??
        defaultKeyStatistics?.forwardPE ??
        0,
      priceToBook: defaultKeyStatistics?.priceToBook ?? quote?.priceToBook ?? 0,
      priceToSales: summaryDetail?.priceToSalesTrailing12Months ?? 0,
      enterpriseValue: defaultKeyStatistics?.enterpriseValue ?? 0,
      enterpriseValueToRevenue: defaultKeyStatistics?.enterpriseToRevenue ?? 0,
      enterpriseValueToEbitda: defaultKeyStatistics?.enterpriseToEbitda ?? 0,
      priceToFreeCashFlow: priceToFreeCashFlow ?? 0,
      profitMargins: profitMargins ?? 0,
      floatShares: defaultKeyStatistics?.floatShares ?? 0,
      sharesShort: defaultKeyStatistics?.sharesShort ?? 0,
      shortRatio: defaultKeyStatistics?.shortRatio ?? 0,
      shortPercentOfFloat: shortPercentOfFloat ?? 0,
      lastSplitFactor: defaultKeyStatistics?.lastSplitFactor || "",
      lastSplitDate: lastSplitDate,
      fiveYearAvgReturn: perf?.fiveYearAvgReturn ?? 0,
      threeYearAvgReturn: perf?.threeYearAvgReturn ?? 0,
      oneYearAvgReturn: perf?.oneYearAvgReturn ?? 0,
      performance1Y: perf1Y,
      performance3Y: perf?.performance3Y,
      performance5Y: perf?.performance5Y,
      performanceYTD: perf?.performanceYTD,
    };

    financialsCache.set(cacheKey, { timestamp: now, data: result });
    res.json(result);
  } catch (error) {
    console.error(
      `Błąd pobierania danych finansowych dla ${symbol}:`,
      error.message,
    );
    res
      .status(500)
      .json({ error: "Błąd podczas pobierania danych finansowych" });
  }
});

/**
 * `GET /api/instruments/performance?symbol=<symbol>&exchange=<giełda>` —
 * historyczne stopy zwrotu instrumentu.
 *
 * Zwraca wynik {@link calculatePerformance} (1Y, 3Y, 5Y, YTD i średnioroczne).
 * Brak symbolu → `400`, brak danych → `404`, błąd → `500`.
 */
app.get("/api/instruments/performance", authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || "").trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol)
    return res.status(400).json({ error: "Brak symbolu akcji" });

  const symbol = normalizeYahooSymbol(requestedSymbol, exchange);
  try {
    const perf = await calculatePerformance(symbol);
    if (!perf) {
      return res
        .status(404)
        .json({ error: "Brak danych o wynikach historycznych" });
    }
    res.json(perf);
  } catch (error) {
    console.error(`Błąd pobierania wyników dla ${symbol}:`, error.message);
    res.status(500).json({ error: "Błąd pobierania wyników historycznych" });
  }
});

/**
 * Mapuje notowanie z `yahooFinance.quote` na skrócony obiekt szczegółów
 * instrumentu używany przez aplikację (listy, karty, obserwowane).
 *
 * Brakujące wartości liczbowe są zastępowane `0`, a brak waluty — `"USD"`.
 * Średni wolumen to średnia 10-dniowa (lub 3-miesięczna), a dywidenda —
 * bieżąca (lub z ostatnich 12 miesięcy).
 *
 * @param {Record<string, any>} quote Notowanie zwrócone przez Yahoo Finance.
 * @param {string} requestedSymbol Symbol z żądania aplikacji — trafia do pola `symbol`.
 * @returns {{
 *   symbol: string, currency: string, price: number, change: number,
 *   changePercent: number, volume: number, averageVolume: number,
 *   marketCap: number, trailingPE: number, forwardPE: number,
 *   priceToBook: number, sharesOutstanding: number, bookValue: number,
 *   dividendRate: number, dividendYield: number, fiftyTwoWeekHigh: number,
 *   fiftyTwoWeekLow: number, fiftyTwoWeekChangePercent: number
 * }} Szczegóły notowania.
 */
const mapQuoteToDetails = (quote, requestedSymbol) => ({
  symbol: requestedSymbol,
  currency: quote.currency || "USD",
  price: quote.regularMarketPrice ?? 0,
  change: quote.regularMarketChange ?? 0,
  changePercent: quote.regularMarketChangePercent ?? 0,
  volume: quote.regularMarketVolume ?? 0,
  averageVolume:
    quote.averageDailyVolume10Day ?? quote.averageDailyVolume3Month ?? 0,
  marketCap: quote.marketCap ?? 0,
  trailingPE: quote.trailingPE ?? 0,
  forwardPE: quote.forwardPE ?? 0,
  priceToBook: quote.priceToBook ?? 0,
  sharesOutstanding: quote.sharesOutstanding ?? 0,
  bookValue: quote.bookValue ?? 0,
  dividendRate: quote.dividendRate ?? quote.trailingAnnualDividendRate ?? 0,
  dividendYield: quote.dividendYield ?? quote.trailingAnnualDividendYield ?? 0,
  fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
  fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
  fiftyTwoWeekChangePercent: quote.fiftyTwoWeekChangePercent ?? 0,
});

/**
 * `GET /api/instruments/quote-details?symbol=<symbol>&exchange=<giełda>` —
 * szczegóły notowania jednego instrumentu.
 *
 * Zwraca obiekt z {@link mapQuoteToDetails}. Wynik jest cache'owany przez
 * {@link CACHE_TTL} we wspólnym cache z `POST /api/instruments/quotes`.
 * Brak symbolu → `400`, brak notowania → `404`, błąd Yahoo → `500`.
 */
app.get(
  "/api/instruments/quote-details",
  authenticateToken,
  async (req, res) => {
    const requestedSymbol = String(req.query.symbol || "").trim();
    const exchange = req.query.exchange;
    if (!requestedSymbol)
      return res.status(400).json({ error: "Brak symbolu akcji" });

    const symbol = normalizeYahooSymbol(requestedSymbol, exchange);
    const cacheKey = `quote_details_${symbol}`;
    const now = Date.now();

    if (quoteDetailsCache.has(cacheKey)) {
      const cached = quoteDetailsCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    try {
      const quote = await yahooFinance.quote(symbol, {}, { validate: false });
      if (!quote) {
        return res.status(404).json({ error: "Brak szczegółów notowania" });
      }

      const data = mapQuoteToDetails(quote, requestedSymbol);

      quoteDetailsCache.set(cacheKey, { timestamp: now, data });
      res.json(data);
    } catch (error) {
      console.error(
        `Błąd pobierania szczegółów notowania dla ${symbol}:`,
        error.message,
      );
      res.status(500).json({ error: "Błąd pobierania szczegółów notowania" });
    }
  },
);

/**
 * `POST /api/instruments/quotes` — notowania wielu instrumentów naraz.
 *
 * Body: `{ instruments: [{ symbol, exchange? }] }` — branych jest maks. 40
 * pierwszych pozycji, puste symbole są pomijane (pusta lista → `400`).
 *
 * Działanie:
 * 1. instrumenty z ważnym wpisem w cache są zwracane od razu,
 * 2. pozostałe są pobierane jednym zapytaniem wsadowym `yahooFinance.quote([...])`,
 * 3. symbole, których brakuje w odpowiedzi wsadowej, są dociągane pojedynczo,
 * 4. pobrane notowania trafiają do cache (wspólnego z `quote-details`).
 *
 * Zwraca `{ quotes }`, gdzie kluczem jest `"<symbol>_<exchange>"` (z żądania,
 * pusty `exchange` → `"<symbol>_"`), a wartością obiekt z
 * {@link mapQuoteToDetails} albo `null`, gdy notowania nie udało się pobrać.
 * Endpoint zawsze odpowiada `200` dla niepustej listy.
 */
app.post("/api/instruments/quotes", authenticateToken, async (req, res) => {
  const rawInstruments = Array.isArray(req.body?.instruments)
    ? req.body.instruments
    : [];
  const instruments = rawInstruments
    .slice(0, 40)
    .map((item) => ({
      symbol: String(item?.symbol || "").trim(),
      exchange: item?.exchange ? String(item.exchange) : undefined,
    }))
    .filter((item) => item.symbol);

  if (instruments.length === 0) {
    return res.status(400).json({ error: "Brak instrumentów" });
  }

  const now = Date.now();
  const quotes = {};
  const pending = [];

  for (const instrument of instruments) {
    const key = `${instrument.symbol}_${instrument.exchange || ""}`;
    const yahooSymbol = normalizeYahooSymbol(
      instrument.symbol,
      instrument.exchange,
    );
    const cacheKey = `quote_details_${yahooSymbol}`;
    const cached = quoteDetailsCache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL) {
      quotes[key] = cached.data;
    } else {
      pending.push({ ...instrument, key, yahooSymbol, cacheKey });
    }
  }

  if (pending.length > 0) {
    const fetched = new Map();

    try {
      const result = await yahooFinance.quote(
        pending.map((item) => item.yahooSymbol),
        {},
        { validate: false },
      );
      for (const quote of Array.isArray(result) ? result : [result]) {
        if (quote?.symbol) fetched.set(quote.symbol.toUpperCase(), quote);
      }
    } catch (error) {
      console.warn("Błąd wsadowego pobierania notowań:", error.message);
    }

    const missing = pending.filter(
      (item) => !fetched.has(item.yahooSymbol.toUpperCase()),
    );
    if (missing.length > 0) {
      await Promise.allSettled(
        missing.map(async (item) => {
          try {
            const quote = await yahooFinance.quote(
              item.yahooSymbol,
              {},
              { validate: false },
            );
            if (quote?.symbol) fetched.set(quote.symbol.toUpperCase(), quote);
          } catch (error) {
            console.warn(
              `Błąd pobierania notowania ${item.yahooSymbol}:`,
              error.message,
            );
          }
        }),
      );
    }

    for (const item of pending) {
      const quote = fetched.get(item.yahooSymbol.toUpperCase());
      if (!quote) {
        quotes[item.key] = null;
        continue;
      }
      const data = mapQuoteToDetails(quote, item.symbol);
      quoteDetailsCache.set(item.cacheKey, { timestamp: now, data });
      quotes[item.key] = data;
    }
  }

  res.json({ quotes });
});

/**
 * `GET /api/quote?symbol=<symbol>&exchange=<giełda>` — bieżąca cena instrumentu.
 *
 * Zwraca `{ symbol, currentPrice, change, changePercent }` (brakujące
 * wartości → `0`). Bez cache. Brak symbolu → `400`, błąd Yahoo → `500`.
 */
app.get("/api/quote", authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || "").trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol) return res.status(400).json({ error: "Brak symbolu" });

  const symbol = normalizeYahooSymbol(requestedSymbol, exchange);
  try {
    const quote = await yahooFinance.quote(symbol, {}, { validate: false });
    res.json({
      symbol: requestedSymbol,
      currentPrice: quote?.regularMarketPrice ?? 0,
      change: quote?.regularMarketChange ?? 0,
      changePercent: quote?.regularMarketChangePercent ?? 0,
    });
  } catch (error) {
    console.error(`Błąd pobierania notowania dla ${symbol}:`, error.message);
    res.status(500).json({ error: "Błąd notowania" });
  }
});

/**
 * `GET /api/config` — adres serwera w sieci lokalnej.
 *
 * Zwraca zawartość pliku {@link serverAddressFile}: `{ host, port, url }`.
 * Nie wymaga uwierzytelnienia. Brak lub błąd odczytu pliku → `500`.
 */
app.get("/api/config", (req, res) => {
  try {
    const config = fs.readFileSync(serverAddressFile, "utf8");
    res.json(JSON.parse(config));
  } catch (error) {
    console.error("Błąd pobierania konfiguracji API:", error.message);
    res.status(500).json({ error: "Nie udało się pobrać konfiguracji API" });
  }
});

// Start serwera na wszystkich interfejsach, aby był dostępny z telefonu w sieci lokalnej
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend działa pod adresem http://${localAddress}:${PORT}`);
  console.log(`Adres zapisano w pliku ${serverAddressFile}`);
});

// Eksport na potrzeby dokumentacji TypeDoc (pokazuje tylko eksportowane symbole).
// Nie zmienia działania serwera — `npm start` nadal uruchamia go przez `node server.js`.
module.exports = {
  app,
  PORT,
  CACHE_TTL,
  NEWS_CACHE_TTL,
  TRENDS_CACHE_TTL,
  NEWS_FEEDS,
  POLAND_KEYWORDS,
  KNOWN_US_SYMBOLS,
  serverAddressFile,
  getLocalIpv4Address,
  isRelevantPolandNews,
  decodeXmlEntities,
  stripHtml,
  publisherFromLink,
  parseNewsRss,
  fetchNewsForTopic,
  orderNewsForTopic,
  normalizeYahooSymbol,
  authenticateToken,
  calculatePerformance,
  mapQuoteToDetails,
};
