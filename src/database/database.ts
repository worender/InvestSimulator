/**
 * Lokalna baza danych aplikacji (SQLite przez `expo-sqlite`, plik `invest-simulator.db`).
 *
 * Moduł zawiera schemat bazy i wszystkie operacje na danych: konta
 * użytkowników, ustawienia, portfele, kategorie aktywów, pozycje (partie
 * zakupu), transakcje, dzienne migawki wartości portfela, ulubione aktywa
 * oraz artykuły edukacyjne i zakładki.
 *
 * Przed każdą operacją baza jest otwierana i inicjalizowana
 * ({@link initializeDatabase}) — wywołujący nie musi tego robić sam.
 * Dane wejściowe są walidowane funkcjami z `checkSecurityParam`, a zapytania
 * używają wyłącznie parametrów `?` (bez sklejania SQL z danych użytkownika).
 *
 * Konwencje:
 * - wartości logiczne są zapisywane jako `0` / `1`,
 * - daty jako znaczniki czasu w ms (`Date.now()`),
 * - konto domyślne ma `id = 1` i jest tworzone przy pierwszym uruchomieniu.
 *
 * @module src/database/database
 */
import { Platform } from "expo";
import * as SQLite from "expo-sqlite";
import { MAX_CUSTOM_ACCENTS, normalizeHexColor } from "../settings/color";
import {
  normalizeAndValidateSymbol,
  validateAvatarUrl,
  validateCurrencyCode,
  validateDate,
  validateIconWallet,
  validateNumberReal,
  validateId,
  validateUserId,
  validateUserName,
  validateWalletId,
  validateWalletName,
  validateBoolean,
} from "./checkSecurityParam";
import { acquireDbLock } from "./dbLock";
import {
  ARTICLE_PARAGRAPH_SEPARATOR,
  EDUCATIONAL_ARTICLE_SEED,
  estimateReadMinutes,
  type ArticleSource,
  type EducationalArticle,
} from "./educationalArticles";

/**
 * Otwarte połączenie z bazą — współdzielone przez cały moduł.
 */
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
/**
 * Trwająca lub zakończona inicjalizacja bazy — wykonywana raz na uruchomienie.
 */
let initializationPromise: Promise<void> | null = null;

/**
 * Zwraca połączenie z bazą `invest-simulator.db`, otwierając ją przy pierwszym wywołaniu.
 *
 * Na webie najpierw przejmuje blokadę bazy (`acquireDbLock`), bo baza
 * może być otwarta tylko w jednej karcie przeglądarki. Nie tworzy tabel —
 * do zwykłych operacji używaj funkcji modułu, które wywołują {@link initializeDatabase}.
 *
 * @returns Połączenie z bazą SQLite.
 * @throws `Error("DB_OPEN_IN_OTHER_TAB")`, gdy na webie baza jest otwarta w innej karcie.
 */
export async function getDatabase() {
  if (Platform.OS === "web") {
    const ok = await acquireDbLock();
    if (!ok) throw new Error("DB_OPEN_IN_OTHER_TAB");
  }
  databasePromise ??= SQLite.openDatabaseAsync("invest-simulator.db");
  return databasePromise;
}

// function getDatabase(): Promise<SQLite.SQLiteDatabase> {
//   databasePromise ??= SQLite.openDatabaseAsync("invest-simulator.db");
//   return databasePromise;
// }

/**
 * Typ transakcji: `BUY` — kupno, `SELL` — sprzedaż.
 */
export type TransactionType = "BUY" | "SELL";

/**
 * Konto użytkownika (tabela `users`).
 */
export interface UserProfile {
  /** Identyfikator konta; konto domyślne ma `1`. */
  id: number;
  /** Unikalna nazwa konta. */
  username: string;
  /** Nieużywane — hasła są w SecureStore (`src/database/passwords`). */
  pass_hash: string | null;
  /** Adres zdjęcia profilowego albo `null`. */
  avatar_uri: string | null;
  /** Czy konto jest aktywne (`1`/`0`). */
  active: number;
  /** Data utworzenia (ms). */
  created_at: number;
}

/**
 * Zapis transakcji kupna lub sprzedaży (tabela `transactions`).
 */
export interface Transaction {
  /** Identyfikator transakcji. */
  id: number;
  /** Symbol instrumentu (wielkie litery). */
  symbol: string;
  /** Kupno lub sprzedaż. */
  type: TransactionType;
  /** Liczba jednostek. */
  quantity: number;
  /** Cena jednostkowa. */
  price: number;
  /** Data transakcji (ms). */
  created_at: number;
  /** Portfel, którego dotyczy transakcja. */
  id_wallet: number;
}

/**
 * Zagregowana pozycja w portfelu — wynik {@link getPortfolio}.
 */
export interface PortfolioItem {
  /** Symbol instrumentu. */
  symbol: string;
  /** Posiadana liczba jednostek (kupione minus sprzedane). */
  quantity: number;
  /** Średnia ważona cena zakupu. */
  average_price: number;
}

/**
 * Portfel użytkownika z wolną gotówką (tabela `wallet`).
 */
export interface Wallet {
  /** Identyfikator portfela. */
  id: number;
  /** Wolna gotówka (domyślnie 10 000). */
  balance: number;
  /** Kod waluty portfela, np. `"PLN"`. */
  currency: string;
  /** Właściciel portfela. */
  id_user: number;
  /** Nazwa portfela. */
  name: string;
  /** Nazwa ikony Ionicons, domyślnie `"wallet-outline"`. */
  icon: string;
}

/**
 * Kategoria aktywów w portfelu, np. „Akcje” (tabela `category_assets`).
 */
export interface AssetCategory {
  /** Identyfikator kategorii. */
  id: number;
  /** Nazwa kategorii. */
  name: string;
  /** Portfel, do którego należy kategoria. */
  wallet_id: number;
}

/**
 * Aktywo obserwowane przez użytkownika wraz z licznikiem odwiedzin (tabela `favorite_assets`).
 */
export interface FavoriteAsset {
  /** Identyfikator wpisu. */
  id: number;
  /** Użytkownik. */
  user_id: number;
  /** Symbol instrumentu. */
  symbol: string;
  /** Licznik odwiedzin lub interakcji z aktywem. */
  counter: number;
  /** `1` — ulubione, `0` — tylko odwiedzane. */
  favorite: number;
}

/**
 * Partia zakupu aktywa (tabela `positions`).
 *
 * Każde kupno tworzy nową pozycję. Sprzedaż zmniejsza `remaining_quantity`
 * pozycji od najstarszej (FIFO) — patrz {@link createTransaction}.
 */
export interface Position {
  /** Identyfikator pozycji. */
  id: number;
  /** Kategoria aktywów (przez nią pozycja należy do portfela). */
  category_id: number;
  /** Symbol instrumentu. */
  symbol: string;
  /** Liczba jednostek kupiona w tej partii. */
  initial_quantity: number;
  /** Liczba jednostek z tej partii, która jeszcze nie została sprzedana. */
  remaining_quantity: number;
  /** Cena zakupu jednostki. */
  buy_price: number;
  /** Data zakupu (ms). */
  opened_at: number;
}

/**
 * Dzienna migawka wartości portfela do wykresów historii (tabela `portfolio_snapshots`).
 */
export interface PortfolioSnapshot {
  /** Portfel. */
  wallet_id: number;
  /** Numer dnia od 1970-01-01 (UTC); w bazie zapisany jako liczba całkowita. */
  snapshot_date: string;
  /** Wolna gotówka w danym dniu. */
  cash_balance: number;
  /** Rynkowa wartość wszystkich aktywów w danym dniu. */
  assets_value: number;
}

/**
 * Dane nowego portfela dla {@link createWallet}.
 */
export interface CreateWalletInput {
  /** Nazwa portfela (1–30 znaków). */
  name: string;
  /** Kod waluty (3 litery). */
  currency: string;
  /** Początkowa gotówka; domyślnie 10 000. */
  balance?: number;
  /** Nazwa ikony; domyślnie `"wallet-outline"`. */
  icon?: string;
}

/**
 * Dane nowej kategorii aktywów dla {@link createCategory}.
 */
export interface CreateCategoryInput {
  /** Nazwa kategorii (1–50 znaków). */
  name: string;
}

/**
 * Dane nowej pozycji dla {@link createPosition} (tylko do testów).
 */
export interface CreatePositionInput {
  /** Kategoria aktywów. */
  category_id: number;
  /** Symbol instrumentu. */
  symbol: string;
  /** Liczba jednostek (> 0). */
  quantity: number;
  /** Cena zakupu (> 0). */
  buy_price: number;
  /** Data zakupu (ms); domyślnie teraz. */
  opened_at?: number;
}

/**
 * Zmiany pozycji dla {@link updatePosition} (tylko do testów).
 */
export interface UpdatePositionInput {
  /** Nowa pozostała liczba jednostek (≥ 0). */
  remaining_quantity?: number;
}

/**
 * Dane migawki portfela dla {@link createPortfolioSnapshot}.
 */
export interface CreateSnapshotInput {
  /** Portfel. */
  wallet_id: number;
  /** Wolna gotówka (≥ 0). */
  cash_balance: number;
  /** Wartość aktywów (≥ 0). */
  assets_value: number;
}

/**
 * Dane transakcji dla {@link createTransaction}.
 */
export interface CreateTransactionInput {
  /** Symbol instrumentu. */
  symbol: string;
  /** Kupno lub sprzedaż. */
  type: TransactionType;
  /** Liczba jednostek (> 0). */
  quantity: number;
  /** Cena jednostkowa (> 0). */
  price: number;
  /** Data transakcji (ms); domyślnie teraz. */
  createdAt?: number;
  /** Portfel. */
  id_wallet: number;
  /** Kategoria aktywów — wymagana przy kupnie, ignorowana przy sprzedaży. */
  category_id?: number;
}

/**
 * Ustawienia wyglądu i działania aplikacji dla konta (tabela `settings`).
 */
export interface Settings {
  /** Identyfikator wpisu. */
  id: number;
  /** Użytkownik (jeden wpis na konto). */
  user_id: number;
  /** Ciemny motyw (`1`/`0`). */
  dark_mode: number;
  /** Kolor akcentu: klucz gotowego koloru (domyślnie `"default"`) albo kolor HEX. */
  color_mode: string;
  /** Wyświetlanie wielu walut (`1`/`0`). */
  multi_currency: number;
  /** Rozmiar czcionki: `"small"`, `"medium"` lub `"large"`. */
  font_size: string;
  /** Logowanie biometryczne (`1`/`0`). */
  biometric_enabled: number;
  /** Waluta wyświetlania, domyślnie `"PLN"`. */
  currency: string;
}

/**
 * Własny kolor akcentu zapisany na koncie (tabela `custom_accent_colors`).
 */
export interface CustomAccentColor {
  /** Identyfikator koloru. */
  id: number;
  /** Użytkownik. */
  user_id: number;
  /** Kolor w formacie HEX (znormalizowany). */
  color: string;
  /** Kolejność na liście kolorów. */
  position: number;
}

/**
 * Ustawienia powiadomień dla konta (tabela `notification_settings`). Wszystkie flagi to `1`/`0`.
 */
export interface NotificationSettings {
  /** Identyfikator wpisu. */
  id: number;
  /** Użytkownik (jeden wpis na konto). */
  user_id: number;
  /** Główny przełącznik powiadomień w aplikacji. */
  notifications_enabled: number;
  /** Powiadomienia push. */
  push_notifications_enabled: number;
  /** Powiadomienia o portfelu. */
  portfolio: number;
  /** Powiadomienia rynkowe. */
  market: number;
  /** Powiadomienia o newsach. */
  news: number;
  /** Powiadomienia o transakcjach. */
  transactions: number;
  /** Przypomnienia. */
  reminders: number;
}

/**
 * Wycena jednego portfela dla {@link createDailySnapshots}.
 */
export interface DailySnapshotValue {
  /** Portfel. */
  wallet_id: number;
  /** Wolna gotówka. */
  cash_balance: number;
  /** Wartość aktywów. */
  assets_value: number;
}

/**
 * Tworzy tabele (jeśli nie istnieją), dane domyślne i synchronizuje artykuły edukacyjne.
 *
 * Wykonywana raz na uruchomienie aplikacji — kolejne wywołania zwracają tę
 * samą obietnicę. Tabele: `users`, `wallet`, `category_assets`,
 * `positions`, `portfolio_snapshots`, `transactions`, `favorite_assets`,
 * `notification_settings`, `settings`, `custom_accent_colors`,
 * `category_article`, `article`, `source`, `article_source`, `saved_article`.
 * Włącza też sprawdzanie kluczy obcych (`PRAGMA foreign_keys = ON`).
 */
export async function initializeDatabase(): Promise<void> {
  initializationPromise ??= (async () => {
    const database = await getDatabase();

    await database.execAsync(`
    PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          username TEXT NOT NULL UNIQUE DEFAULT 'Investor',
          pass_hash TEXT,
          avatar_uri TEXT,
          active INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        );

      



        CREATE TABLE IF NOT EXISTS wallet (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          balance REAL NOT NULL DEFAULT 10000,
          currency TEXT,
          id_user INTEGER ,
          name TEXT,
          icon TEXT DEFAULT 'wallet-outline',
          FOREIGN KEY (id_user) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS category_assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          name TEXT,
          wallet_id INTEGER,
          FOREIGN KEY (wallet_id) REFERENCES wallet (id)
        );

        CREATE TABLE IF NOT EXISTS positions (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          category_id INTEGER NOT NULL,     -- Jedyny klucz obcy (brak wallet_id!)
          symbol TEXT NOT NULL,
          initial_quantity REAL NOT NULL,   -- Ile kupiono na początku w tej paczce
          remaining_quantity REAL NOT NULL, -- Ile z tej paczki zostało
          buy_price REAL NOT NULL,          -- Dokładna cena zakupu
          opened_at INTEGER NOT NULL,
          FOREIGN KEY (category_id) REFERENCES category_assets (id)
        );

        CREATE TABLE IF NOT EXISTS portfolio_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          wallet_id INTEGER NOT NULL,
          snapshot_date INTEGER NOT NULL,  -- numer dnia od 1970-01-01 (np. 2023-08-15 = 19600)
          cash_balance REAL NOT NULL,  -- Stan gotówki w danym dniu
          assets_value REAL NOT NULL,  -- Rynkowa wartość wszystkich aktywów w danym dniu
          FOREIGN KEY (wallet_id) REFERENCES wallet (id),
          UNIQUE(wallet_id, snapshot_date) -- Zapobiega dublom z tego samego dnia
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          symbol TEXT NOT NULL,
          type TEXT NOT NULL,
          quantity REAL NOT NULL,
          price REAL NOT NULL,
          created_at INTEGER NOT NULL,
          id_wallet INTEGER,
          FOREIGN KEY (id_wallet) REFERENCES wallet (id)
        );

        CREATE TABLE IF NOT EXISTS favorite_assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id INTEGER NOT NULL,
          symbol TEXT NOT NULL,
          counter INTEGER, -- Licznik odwiedzin lub interakcji z danym aktywem
          favorite INTEGER DEFAULT 0, -- 0 = nie ulubione, 1 = ulubione
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS notification_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id INTEGER NOT NULL UNIQUE,
          notifications_enabled INTEGER DEFAULT 0,
          push_notifications_enabled INTEGER DEFAULT 0,
          portfolio INTEGER DEFAULT 0,
          market INTEGER DEFAULT 0,
          news INTEGER DEFAULT 0,
          transactions INTEGER DEFAULT 0,
          reminders INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id INTEGER NOT NULL UNIQUE,
          dark_mode INTEGER DEFAULT '1',
          color_mode TEXT DEFAULT 'default',
          multi_currency INTEGER DEFAULT '0',
          font_size TEXT DEFAULT 'medium',
          biometric_enabled INTEGER DEFAULT '0',
          currency TEXT DEFAULT 'PLN',
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS custom_accent_colors (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id INTEGER NOT NULL,
          color TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          UNIQUE (user_id, color),
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS category_article (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          category TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS article (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          title TEXT,
          text TEXT,              -- Treść; akapity rozdzielone pustą linią
          category_id INTEGER,
          slug TEXT NOT NULL UNIQUE, -- Stały identyfikator artykułu (np. 'edu-01')
          summary TEXT,           -- Krótkie podsumowanie wyświetlane na liście
          read_minutes INTEGER,   -- Szacowany czas czytania w minutach
          language TEXT DEFAULT 'pl',
          author TEXT,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (category_id) REFERENCES category_article (id)
        );

        -- Literatura i dokumenty cytowane w artykułach (każda pozycja raz)
        CREATE TABLE IF NOT EXISTS source (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          author TEXT NOT NULL,     -- Autor książki / instytucja, nie autor artykułu
          title TEXT NOT NULL,      -- Tytuł książki lub dokumentu
          publisher TEXT NOT NULL,
          year INTEGER NOT NULL,
          url TEXT,
          UNIQUE (author, title, year)
        );

        -- Powiązanie artykułu ze źródłami (relacja wiele do wielu)
        CREATE TABLE IF NOT EXISTS article_source (
          article_id INTEGER NOT NULL,
          source_id INTEGER NOT NULL,
          position INTEGER NOT NULL DEFAULT 0, -- Kolejność źródeł w artykule
          PRIMARY KEY (article_id, source_id),
          FOREIGN KEY (article_id) REFERENCES article (id),
          FOREIGN KEY (source_id) REFERENCES source (id)
        );

        CREATE TABLE IF NOT EXISTS saved_article (
          user_id INTEGER NOT NULL,
          saved_article_id INTEGER NOT NULL,
          PRIMARY KEY (user_id, saved_article_id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (saved_article_id) REFERENCES article (id)
        );
  `);
    await seedDefaultData(database);
    await syncEducationalArticles(database);
  })();

  return initializationPromise;
}

/**
 * Tworzy konto domyślne (`id = 1`, „Investor”) z portfelem „Główny portfel”
 * (10 000 PLN), domyślnymi ustawieniami i ustawieniami powiadomień.
 * Używa `INSERT OR IGNORE`, więc istniejące dane nie są nadpisywane.
 *
 * @param database Otwarta baza danych.
 */
async function seedDefaultData(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.runAsync(
    `INSERT OR IGNORE INTO users
      (id, username, pass_hash, avatar_uri, active, created_at)
     VALUES (1, 'Investor', NULL, NULL, 1, ?)`,
    Date.now(),
  );

  await database.runAsync(
    `INSERT OR IGNORE INTO wallet
      (id_user, balance, currency, name)
     VALUES (1, 10000, 'PLN', 'Główny portfel')`,
  );

  await database.runAsync(
    `INSERT OR IGNORE INTO settings
      (user_id, dark_mode, color_mode, multi_currency, font_size,
       biometric_enabled, currency)
     VALUES (1, 1, 'default', 0, 'medium', 0, 'PLN')`,
  );

  await database.runAsync(
    `INSERT OR IGNORE INTO notification_settings
      (user_id, notifications_enabled, push_notifications_enabled,
       portfolio, market, news, transactions, reminders)
     VALUES (1, 0, 0, 0, 0, 0, 0, 0)`,
  );
}

/**
 * Zapisuje artykuły edukacyjne dostarczane z aplikacją (`EDUCATIONAL_ARTICLE_SEED`)
 * do tabel `category_article`, `article`, `source` i `article_source`.
 *
 * Artykuły są dopasowywane po `slug`, więc ich `id` (i zapisane zakładki)
 * się nie zmienia. Artykuły usunięte z aplikacji znikają z bazy razem ze
 * źródłami i zakładkami, a źródła, których nie cytuje już żaden artykuł, są
 * usuwane. Całość wykonuje się w jednej transakcji.
 *
 * @param database Otwarta baza danych.
 */
async function syncEducationalArticles(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    for (const category of new Set(
      EDUCATIONAL_ARTICLE_SEED.map((article) => article.category),
    )) {
      await database.runAsync(
        "INSERT OR IGNORE INTO category_article (category) VALUES (?)",
        category,
      );
    }

    for (const [index, article] of EDUCATIONAL_ARTICLE_SEED.entries()) {
      await database.runAsync(
        `INSERT INTO article
           (slug, title, text, summary, read_minutes, language, author,
            sort_order, category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?,
           (SELECT id FROM category_article WHERE category = ?))
         ON CONFLICT(slug) DO UPDATE SET
           title = excluded.title,
           text = excluded.text,
           summary = excluded.summary,
           read_minutes = excluded.read_minutes,
           language = excluded.language,
           author = excluded.author,
           sort_order = excluded.sort_order,
           category_id = excluded.category_id`,
        article.id,
        article.title,
        article.content.join(ARTICLE_PARAGRAPH_SEPARATOR),
        article.summary,
        estimateReadMinutes(article),
        article.language,
        article.author,
        index,
        article.category,
      );

      const row = await database.getFirstAsync<{ id: number }>(
        "SELECT id FROM article WHERE slug = ?",
        article.id,
      );
      if (!row) throw new Error(`Nie udało się zapisać artykułu ${article.id}`);

      await database.runAsync(
        "DELETE FROM article_source WHERE article_id = ?",
        row.id,
      );
      for (const [position, source] of article.sources.entries()) {
        await database.runAsync(
          `INSERT INTO source (author, title, publisher, year, url)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(author, title, year) DO UPDATE SET
             publisher = excluded.publisher,
             url = excluded.url`,
          source.author,
          source.title,
          source.publisher,
          source.year,
          source.url ?? null,
        );
        await database.runAsync(
          `INSERT INTO article_source (article_id, source_id, position)
           SELECT ?, id, ? FROM source
           WHERE author = ? AND title = ? AND year = ?`,
          row.id,
          position,
          source.author,
          source.title,
          source.year,
        );
      }
    }

    // Usuwa artykuły wycofane z aplikacji (najpierw rekordy zależne).
    // Lista do usunięcia liczona w JS, aby każde zapytanie miało tylko parametry `?`.
    const currentSlugs = new Set(
      EDUCATIONAL_ARTICLE_SEED.map((article) => article.id),
    );
    const storedArticles = await database.getAllAsync<{
      id: number;
      slug: string;
    }>("SELECT id, slug FROM article");

    for (const { id, slug } of storedArticles) {
      if (currentSlugs.has(slug)) continue;
      await database.runAsync(
        "DELETE FROM saved_article WHERE saved_article_id = ?",
        id,
      );
      await database.runAsync(
        "DELETE FROM article_source WHERE article_id = ?",
        id,
      );
      await database.runAsync("DELETE FROM article WHERE id = ?", id);
    }

    // Źródła, których nie cytuje już żaden artykuł
    await database.runAsync(
      `DELETE FROM source
       WHERE id NOT IN (SELECT source_id FROM article_source)`,
    );
  });
}

/**
 * Zwraca bazę po inicjalizacji ({@link initializeDatabase}) — używana przez wszystkie operacje modułu.
 *
 * @returns Połączenie z gotową bazą.
 */
async function getReadyDatabase(): Promise<SQLite.SQLiteDatabase> {
  await initializeDatabase();
  return getDatabase();
}

/**
 * Zwraca posiadane instrumenty wyliczone z historii transakcji.
 *
 * Dla każdego symbolu liczy ilość (kupione minus sprzedane) i średnią ważoną
 * cenę zakupu (tylko z transakcji `BUY`). Pomija symbole z ilością ≤ 0.
 * Uwzględnia transakcje ze wszystkich portfeli.
 *
 * @returns Pozycje posortowane alfabetycznie po symbolu.
 */
export async function getPortfolio(): Promise<PortfolioItem[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<PortfolioItem>(
    `SELECT
       symbol,
       SUM(CASE WHEN type = 'BUY' THEN quantity ELSE -quantity END) AS quantity,
       SUM(CASE WHEN type = 'BUY' THEN quantity * price ELSE 0 END)
         / NULLIF(SUM(CASE WHEN type = 'BUY' THEN quantity ELSE 0 END), 0)
         AS average_price
     FROM transactions
     GROUP BY symbol
     HAVING quantity > 0
     ORDER BY symbol`,
  );
}

/**
 * Zwraca profil użytkownika.
 *
 * @param userId Identyfikator użytkownika (domyślnie 1).
 * @returns Profil albo `null`, gdy nie istnieje.
 * @throws Gdy identyfikator jest niepoprawny.
 */
export async function getUserProfile(userId = 1): Promise<UserProfile | null> {
  validateUserId(userId);

  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<UserProfile>(
      `SELECT id, username, pass_hash, avatar_uri, active, created_at
     FROM users
     WHERE id = ?`,
      userId,
    )) ?? null
  );
}

/**
 * Zwraca wszystkie konta zapisane na urządzeniu (np. do przełącznika kont).
 *
 * @returns Profile posortowane po identyfikatorze.
 */
export async function getUserProfiles(): Promise<UserProfile[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<UserProfile>(
    `SELECT id, username, pass_hash ,avatar_uri, active, created_at
     FROM users
     ORDER BY id ASC`,
  );
}

/**
 * Tworzy nowe konto wraz z portfelem „Główny portfel” (10 000 PLN), domyślnymi
 * ustawieniami i ustawieniami powiadomień — wszystko w jednej transakcji.
 *
 * @param input Dane konta.
 * @param input.username Nazwa konta (patrz `validateUserName`); musi być unikalna.
 * @param input.avatar_uri Opcjonalny adres zdjęcia profilowego.
 * @returns Utworzony profil.
 * @throws Gdy nazwa lub adres zdjęcia są niepoprawne albo nazwa jest zajęta.
 */
export async function createUserProfile(input: {
  username: string;
  avatar_uri?: string | null;
}): Promise<UserProfile> {
  if (!input.username) throw new Error("Nazwa konta jest wymagana");

  const username = validateUserName(input.username);
  const avatar_uri = input.avatar_uri
    ? validateAvatarUrl(input.avatar_uri)
    : null;
  const database = await getReadyDatabase();
  console.log("Tworzenie profilu użytkownika:", username, avatar_uri);

  let userId: number = 0;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `INSERT INTO users (username, avatar_uri, created_at)
       VALUES (?, ?, ?)`,
      username,
      avatar_uri ?? null,
      Date.now(),
    );

    userId = result.lastInsertRowId;

    await database.runAsync(
      `INSERT INTO wallet (id_user, balance, name, currency, icon)
       VALUES (?, ?, ?, ?, ?)`,
      userId,
      10000,
      "Główny portfel",
      "PLN",
      "wallet-outline",
    );

    await database.runAsync(
      `INSERT INTO settings
       (user_id, dark_mode, color_mode, multi_currency, font_size,
        biometric_enabled, currency)
       VALUES (?, 1, 'default', 0, 'medium', 0, 'PLN')`,
      userId,
    );

    await database.runAsync(
      `INSERT INTO notification_settings
       (user_id, notifications_enabled, push_notifications_enabled,
        portfolio, market, news, transactions, reminders)
       VALUES (?, 0, 0, 0, 0, 0, 0, 0)`,
      userId,
    );

    // return userId;
  });

  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("Nie udało się utworzyć konta");
  }

  return profile;
}

/**
 * Zmienia nazwę lub zdjęcie profilowe konta.
 *
 * Pola nieobecne w `changes` zostają bez zmian. Zmieniane są tylko
 * `username` i `avatar_uri`; `avatar_uri: null` nie usuwa zdjęcia
 * (zostaje dotychczasowe).
 *
 * @param changes Pola do zmiany.
 * @param userId Identyfikator użytkownika (domyślnie 1).
 * @returns Zaktualizowany profil.
 * @throws Gdy konto nie istnieje lub dane są niepoprawne.
 */
export async function updateUserProfile(
  changes: Partial<Omit<UserProfile, "id">>,
  userId = 1,
): Promise<UserProfile> {
  validateUserId(userId);
  const database = await getReadyDatabase();
  const current = await getUserProfile(userId);
  if (!current) throw new Error("Nie znaleziono profilu użytkownika");

  const validatedUserName =
    changes.username !== undefined
      ? validateUserName(changes.username)
      : current.username;
  const validatedAvatarUrl =
    changes.avatar_uri !== undefined && changes.avatar_uri !== null
      ? validateAvatarUrl(changes.avatar_uri)
      : current.avatar_uri;

  const next = {
    username: validatedUserName,
    avatarUri: validatedAvatarUrl,
  };

  await database.runAsync(
    `UPDATE users
     SET username = ?, avatar_uri = ?
     WHERE id = ?`,
    next.username,
    next.avatarUri,
    userId,
  );

  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("Nie udało się odczytać zaktualizowanego profilu");
  }

  return profile;
}

/**
 * Zapisuje zmienione ustawienia konta.
 *
 * Pola nieobecne w `settings` zachowują obecną wartość (lub domyślną).
 * Pole `user_id` jest wymagane.
 *
 * @param settings Zmienione ustawienia z `user_id`.
 * @throws Gdy brak lub niepoprawny `user_id` albo nie udało się odczytać zapisu.
 *
 * @example
 * await updateSettings({ user_id: 1, dark_mode: 0, font_size: "large" });
 */
export async function updateSettings(
  settings: Partial<Settings>,
): Promise<void> {
  const database = await getReadyDatabase();

  if (settings.user_id === undefined) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }
  validateUserId(settings.user_id);

  const currentSettings = await database.getFirstAsync<Settings>(
    `SELECT * FROM settings WHERE user_id = ?`,
    settings.user_id,
  );

  const nextSettings = {
    dark_mode: settings.dark_mode ?? currentSettings?.dark_mode ?? 1,
    color_mode: settings.color_mode ?? currentSettings?.color_mode ?? "default",
    multi_currency:
      settings.multi_currency ?? currentSettings?.multi_currency ?? 0,
    font_size: settings.font_size ?? currentSettings?.font_size ?? "medium",
    biometric_enabled:
      settings.biometric_enabled ?? currentSettings?.biometric_enabled ?? 0,
    currency: settings.currency ?? currentSettings?.currency ?? "PLN",
  };

  await database.runAsync(
    `UPDATE settings
     SET dark_mode = ?, color_mode = ?, multi_currency = ?, font_size = ?, biometric_enabled = ?, currency = ?
     WHERE user_id = ?`,
    nextSettings.dark_mode,
    nextSettings.color_mode,
    nextSettings.multi_currency,
    nextSettings.font_size,
    nextSettings.biometric_enabled,
    nextSettings.currency,
    settings.user_id,
  );

  const updatedSettings = await database.getFirstAsync<Settings>(
    `SELECT * FROM settings WHERE user_id = ?`,
    settings.user_id,
  );

  if (!updatedSettings) {
    throw new Error("Nie udało się odczytać zaktualizowanych ustawień");
  }
}

/**
 * Zwraca ustawienia konta.
 *
 * @param userId Identyfikator użytkownika (domyślnie 1).
 * @returns Ustawienia albo `null`, gdy brak wpisu.
 */
export async function getSettings(userId = 1): Promise<Settings | null> {
  validateUserId(userId);

  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<Settings>(
      `SELECT * FROM settings WHERE user_id = ?`,
      userId,
    )) ?? null
  );
}

/**
 * Odczytuje własne kolory akcentu konta w kolejności `position`.
 *
 * @param userId Identyfikator użytkownika.
 * @returns Zapisane kolory.
 */
async function selectCustomAccentColors(
  userId: number,
): Promise<CustomAccentColor[]> {
  validateUserId(userId);
  const database = await getReadyDatabase();
  return database.getAllAsync<CustomAccentColor>(
    `SELECT id, user_id, color, position
     FROM custom_accent_colors
     WHERE user_id = ?
     ORDER BY position ASC, id ASC`,
    userId,
  );
}

/**
 * Zwraca własne kolory akcentu (motywu) zapisane na koncie.
 *
 * @param userId Identyfikator użytkownika (domyślnie 1).
 * @returns Kolory w kolejności dodania.
 */
export async function getCustomAccentColors(
  userId = 1,
): Promise<CustomAccentColor[]> {
  validateUserId(userId);
  return selectCustomAccentColors(userId);
}

/**
 * Dodaje własny kolor akcentu na koniec listy konta.
 *
 * @param userId Identyfikator użytkownika.
 * @param color Kolor HEX, np. `"#ff8800"` (jest normalizowany).
 * @returns Zapisany kolor.
 * @throws Gdy kolor jest niepoprawny, już zapisany albo osiągnięto limit
 *   `MAX_CUSTOM_ACCENTS` kolorów.
 */
export async function addCustomAccentColor(
  userId: number,
  color: string,
): Promise<CustomAccentColor> {
  validateUserId(userId);

  const normalized = normalizeHexColor(color);
  if (!normalized) throw new Error("Nieprawidłowy kolor");

  const existing = await selectCustomAccentColors(userId);

  if (existing.length >= MAX_CUSTOM_ACCENTS) {
    throw new Error(
      `Możesz zapisać maksymalnie ${MAX_CUSTOM_ACCENTS} własne kolory`,
    );
  }

  if (existing.some((item) => item.color === normalized)) {
    throw new Error("Ten kolor jest już zapisany");
  }

  const database = await getReadyDatabase();
  const position = existing.length;
  const result = await database.runAsync(
    `INSERT INTO custom_accent_colors (user_id, color, position)
     VALUES (?, ?, ?)`,
    userId,
    normalized,
    position,
  );

  return {
    id: result.lastInsertRowId,
    user_id: userId,
    color: normalized,
    position,
  };
}

/**
 * Zmienia wartość zapisanego koloru akcentu (pozycja na liście zostaje).
 *
 * @param userId Identyfikator użytkownika.
 * @param id Identyfikator koloru.
 * @param color Nowy kolor HEX.
 * @returns Kolor po zmianie.
 * @throws Gdy kolor jest niepoprawny, nie istnieje albo taki kolor jest już zapisany.
 */
export async function updateCustomAccentColor(
  userId: number,
  id: number,
  color: string,
): Promise<CustomAccentColor> {
  validateUserId(userId);
  validateId(id, "identyfikator koloru");

  const normalized = normalizeHexColor(color);
  if (!normalized) throw new Error("Nieprawidłowy kolor");

  const existing = await selectCustomAccentColors(userId);
  const target = existing.find((item) => item.id === id);

  if (!target) throw new Error("Nie znaleziono zapisanego koloru");

  if (existing.some((item) => item.id !== id && item.color === normalized)) {
    throw new Error("Ten kolor jest już zapisany");
  }

  const database = await getReadyDatabase();
  await database.runAsync(
    `UPDATE custom_accent_colors SET color = ? WHERE id = ? AND user_id = ?`,
    normalized,
    id,
    userId,
  );

  return { ...target, color: normalized };
}

/**
 * Zapisuje zmienione ustawienia powiadomień konta.
 *
 * Pola nieobecne w `settings` zachowują obecną wartość (lub `0`).
 * Pole `user_id` jest wymagane.
 *
 * @param settings Zmienione ustawienia z `user_id`.
 * @throws Gdy brak lub niepoprawny `user_id` albo nie udało się odczytać zapisu.
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>,
): Promise<void> {
  const database = await getReadyDatabase();

  if (settings.user_id === undefined) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }
  validateUserId(settings.user_id);

  const currentSettings = await database.getFirstAsync<NotificationSettings>(
    `SELECT * FROM notification_settings WHERE user_id = ?`,
    settings.user_id,
  );

  const nextSettings = {
    notifications_enabled:
      settings.notifications_enabled ??
      currentSettings?.notifications_enabled ??
      0,
    push_notifications_enabled:
      settings.push_notifications_enabled ??
      currentSettings?.push_notifications_enabled ??
      0,
    portfolio: settings.portfolio ?? currentSettings?.portfolio ?? 0,
    market: settings.market ?? currentSettings?.market ?? 0,
    news: settings.news ?? currentSettings?.news ?? 0,
    transactions: settings.transactions ?? currentSettings?.transactions ?? 0,
    reminders: settings.reminders ?? currentSettings?.reminders ?? 0,
  };

  await database.runAsync(
    `UPDATE notification_settings
     SET notifications_enabled = ?, push_notifications_enabled = ?, portfolio = ?, market = ?, news = ?, transactions = ?, reminders = ?
     WHERE user_id = ?`,
    nextSettings.notifications_enabled,
    nextSettings.push_notifications_enabled,
    nextSettings.portfolio,
    nextSettings.market,
    nextSettings.news,
    nextSettings.transactions,
    nextSettings.reminders,
    settings.user_id,
  );

  const updatedSettings = await database.getFirstAsync<NotificationSettings>(
    `SELECT * FROM notification_settings WHERE user_id = ?`,
    settings.user_id,
  );

  if (!updatedSettings) {
    throw new Error(
      "Nie udało się odczytać zaktualizowanych ustawień powiadomień",
    );
  }
}

/**
 * Zwraca ustawienia powiadomień konta.
 *
 * @param userId Identyfikator użytkownika (domyślnie 1).
 * @returns Ustawienia albo `null`, gdy brak wpisu.
 */
export async function getNotificationSettings(
  userId = 1,
): Promise<NotificationSettings | null> {
  validateUserId(userId);

  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<NotificationSettings>(
      `SELECT * FROM notification_settings WHERE user_id = ?`,
      userId,
    )) ?? null
  );
}

/**
 * Zwraca portfel, jeśli należy do użytkownika.
 *
 * @param userId Identyfikator użytkownika.
 * @param walletId Identyfikator portfela.
 * @returns Portfel albo `null`.
 */
export async function getWallet(
  userId: number,
  walletId: number,
): Promise<Wallet | null> {
  validateUserId(userId);
  validateWalletId(walletId);

  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<Wallet>(
      `SELECT * FROM wallet WHERE id_user = ? AND id = ?`,
      userId,
      walletId,
    )) ?? null
  );
}

/**
 * Zwraca wszystkie portfele użytkownika.
 *
 * @param userId Identyfikator użytkownika.
 * @returns Portfele posortowane po identyfikatorze (najstarszy pierwszy).
 */
export async function getWallets(userId: number): Promise<Wallet[]> {
  validateUserId(userId);

  const database = await getReadyDatabase();

  return database.getAllAsync<Wallet>(
    `SELECT * FROM wallet WHERE id_user = ? ORDER BY id ASC`,
    userId,
  );
}

/**
 * Zmienia saldo, walutę, nazwę lub ikonę portfela. Pola nieobecne w
 * `changes` zostają bez zmian. Wykonuje się w transakcji.
 *
 * @param walletId Identyfikator portfela.
 * @param userId Identyfikator właściciela.
 * @param changes Pola do zmiany.
 * @throws Gdy portfel nie należy do użytkownika lub dane są niepoprawne.
 */
export async function updateWallet(
  walletId: number,
  userId: number,
  changes: Partial<Omit<Wallet, "id" | "id_user">>,
): Promise<void> {
  validateWalletId(walletId);
  validateUserId(userId);

  const database = await getReadyDatabase();

  await database.withTransactionAsync(async () => {
    const currentWallet = await database.getFirstAsync<Wallet>(
      `SELECT * FROM wallet WHERE id = ? AND id_user = ?`,
      walletId,
      userId,
    );

    if (!currentWallet) {
      throw new Error("Nie znaleziono portfela");
    }

    const nextWallet = {
      balance:
        changes.balance !== undefined
          ? validateNumberReal(changes.balance)
          : currentWallet.balance,
      currency:
        changes.currency !== undefined
          ? validateCurrencyCode(changes.currency)
          : currentWallet.currency,
      name:
        changes.name !== undefined
          ? validateWalletName(changes.name)
          : currentWallet.name,
      icon:
        changes.icon !== undefined
          ? validateIconWallet(changes.icon)
          : currentWallet.icon,
    };

    await database.runAsync(
      `UPDATE wallet
      SET balance = ?, currency = ?, name = ?, icon = ?
      WHERE id = ? AND id_user = ?`,
      nextWallet.balance,
      nextWallet.currency,
      nextWallet.name,
      nextWallet.icon,
      walletId,
      userId,
    );

    const updatedWallet = await database.getFirstAsync<Wallet>(
      `SELECT * FROM wallet WHERE id_user = ? AND id = ?`,
      userId,
      walletId,
    );

    if (!updatedWallet) {
      throw new Error("Nie udało się odczytać zaktualizowanego portfela");
    }
  });
}

/**
 * Tworzy nowy portfel użytkownika.
 *
 * @param userId Identyfikator użytkownika.
 * @param data Dane portfela.
 * @returns Utworzony portfel.
 * @throws Gdy dane są niepoprawne.
 */
export async function createWallet(
  userId: number,
  data: CreateWalletInput,
): Promise<Wallet> {
  validateUserId(userId);

  const name = validateWalletName(data.name);
  const currency = validateCurrencyCode(data.currency);
  const balance = data.balance ?? 10000;
  const icon = data.icon ? validateIconWallet(data.icon) : "wallet-outline";

  validateNumberReal(balance);

  const database = await getReadyDatabase();

  const result = await database.runAsync(
    `INSERT INTO wallet
     (id_user, balance, currency, name, icon)
     VALUES (?, ?, ?, ?, ?)`,
    userId,
    balance,
    currency,
    name,
    icon,
  );

  const wallet = await database.getFirstAsync<Wallet>(
    `SELECT * FROM wallet
     WHERE id = ? AND id_user = ?`,
    result.lastInsertRowId,
    userId,
  );

  if (!wallet) {
    throw new Error("Nie udało się utworzyć portfela");
  }

  return wallet;
}

/**
 * Usuwa portfel razem z jego kategoriami, pozycjami, transakcjami i migawkami
 * (w jednej transakcji). Operacji nie można cofnąć.
 *
 * @param walletId Identyfikator portfela.
 * @param userId Identyfikator właściciela.
 * @throws Gdy portfel nie należy do użytkownika.
 */
export async function deleteWallet(
  walletId: number,
  userId: number,
): Promise<void> {
  validateWalletId(walletId);
  validateUserId(userId);
  const database = await getReadyDatabase();

  await database.withTransactionAsync(async () => {
    const wallet = await getWallet(userId, walletId);

    if (!wallet) {
      throw new Error("Nie znaleziono portfela");
    }

    await database.runAsync(
      `DELETE FROM positions
       WHERE category_id IN (
         SELECT id FROM category_assets WHERE wallet_id = ?
       )`,
      walletId,
    );

    await database.runAsync(
      `DELETE FROM category_assets
       WHERE wallet_id = ?`,
      walletId,
    );

    await database.runAsync(
      `DELETE FROM transactions
       WHERE id_wallet = ?`,
      walletId,
    );

    await database.runAsync(
      `DELETE FROM portfolio_snapshots
       WHERE wallet_id = ?`,
      walletId,
    );

    await database.runAsync(
      `DELETE FROM wallet
       WHERE id = ? AND id_user = ?`,
      walletId,
      userId,
    );
  });
}

/**
 * Zwraca kategorie aktywów portfela.
 *
 * @param walletId Identyfikator portfela.
 * @returns Kategorie posortowane po identyfikatorze.
 */
export async function getCategories(
  walletId: number,
): Promise<AssetCategory[]> {
  validateWalletId(walletId);

  const database = await getReadyDatabase();

  return database.getAllAsync<AssetCategory>(
    `SELECT * FROM category_assets
     WHERE wallet_id = ?
     ORDER BY id ASC`,
    walletId,
  );
}

/**
 * Tworzy kategorię aktywów w portfelu (np. „Akcje”, „Kryptowaluty”).
 *
 * @param walletId Identyfikator portfela.
 * @param data Dane kategorii.
 * @returns Utworzona kategoria.
 * @throws Gdy nazwa jest pusta lub dłuższa niż 50 znaków albo portfel nie istnieje.
 */
export async function createCategory(
  walletId: number,
  data: CreateCategoryInput,
): Promise<AssetCategory> {
  validateWalletId(walletId);

  const name = data.name.trim();

  if (name.length === 0 || name.length > 50) {
    throw new Error("Nieprawidłowa nazwa kategorii");
  }

  const wallet = await databaseWalletExists(walletId);

  if (!wallet) {
    throw new Error("Nie znaleziono portfela");
  }

  const database = await getReadyDatabase();

  const result = await database.runAsync(
    `INSERT INTO category_assets (name, wallet_id)
     VALUES (?, ?)`,
    name,
    walletId,
  );

  const category = await database.getFirstAsync<AssetCategory>(
    `SELECT * FROM category_assets WHERE id = ?`,
    result.lastInsertRowId,
  );

  if (!category) {
    throw new Error("Nie udało się utworzyć kategorii");
  }

  return category;
}

/**
 * Sprawdza, czy portfel istnieje (bez sprawdzania właściciela).
 *
 * @param walletId Identyfikator portfela.
 * @returns `true`, gdy portfel istnieje.
 */
async function databaseWalletExists(walletId: number): Promise<boolean> {
  validateWalletId(walletId);

  const database = await getReadyDatabase();

  const wallet = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM wallet WHERE id = ?`,
    walletId,
  );

  return wallet !== null;
}

/**
 * Zwraca wszystkie pozycje (partie zakupu) portfela, także już sprzedane w całości.
 *
 * @param walletId Identyfikator portfela.
 * @returns Pozycje od najnowszej.
 */
export async function getPositions(walletId: number): Promise<Position[]> {
  validateWalletId(walletId);

  const database = await getReadyDatabase();

  return database.getAllAsync<Position>(
    `SELECT
       p.id,
       p.category_id,
       p.symbol,
       p.initial_quantity,
       p.remaining_quantity,
       p.buy_price,
       p.opened_at
     FROM positions p
     INNER JOIN category_assets c
       ON c.id = p.category_id
     WHERE c.wallet_id = ?
     ORDER BY p.opened_at DESC`,
    walletId,
  );
}

/**
 * Tworzy pozycję bezpośrednio, bez transakcji i bez zmiany salda.
 *
 * **Tylko do testów** — w aplikacji kupno odbywa się przez {@link createTransaction}.
 *
 * @param categoryId Identyfikator kategorii aktywów.
 * @param data Dane pozycji (`data.category_id` jest ignorowane — liczy się `categoryId`).
 * @returns Utworzona pozycja.
 * @throws Gdy dane są niepoprawne lub kategoria nie istnieje.
 */
export async function createPosition(
  categoryId: number,
  data: CreatePositionInput,
): Promise<Position> {
  validateId(categoryId, "identyfikator kategorii");

  const quantity = validateNumberReal(data.quantity);
  const buyPrice = validateNumberReal(data.buy_price);

  if (quantity <= 0 || buyPrice <= 0) {
    throw new Error("Ilość i cena muszą być większe od zera");
  }

  const symbol = normalizeAndValidateSymbol(data.symbol);
  const openedAt = data.opened_at ? validateDate(data.opened_at) : Date.now();

  const database = await getReadyDatabase();

  const category = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM category_assets WHERE id = ?`,
    categoryId,
  );

  if (!category) {
    throw new Error("Nie znaleziono kategorii aktywów");
  }

  const result = await database.runAsync(
    `INSERT INTO positions
     (category_id, symbol, initial_quantity, remaining_quantity,
      buy_price, opened_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    categoryId,
    symbol,
    quantity,
    quantity,
    buyPrice,
    openedAt,
  );

  const position = await database.getFirstAsync<Position>(
    `SELECT * FROM positions WHERE id = ?`,
    result.lastInsertRowId,
  );

  if (!position) {
    throw new Error("Nie udało się utworzyć pozycji");
  }

  return position;
}

/**
 * Zmienia pozostałą ilość pozycji bezpośrednio, bez transakcji i bez zmiany salda.
 *
 * **Tylko do testów** — w aplikacji sprzedaż odbywa się przez {@link createTransaction}.
 *
 * @param positionId Identyfikator pozycji.
 * @param changes Zmiany pozycji.
 * @throws Gdy brak danych, ilość jest ujemna lub pozycja nie istnieje.
 */
export async function updatePosition(
  positionId: number,
  changes: UpdatePositionInput,
): Promise<void> {
  validateId(positionId, "identyfikator pozycji");

  if (changes.remaining_quantity === undefined) {
    throw new Error("Brak danych do aktualizacji pozycji");
  }

  const remainingQuantity = validateNumberReal(changes.remaining_quantity);

  if (remainingQuantity < 0) {
    throw new Error("Pozostała ilość nie może być ujemna");
  }

  const database = await getReadyDatabase();

  const result = await database.runAsync(
    `UPDATE positions
     SET remaining_quantity = ?
     WHERE id = ?`,
    remainingQuantity,
    positionId,
  );

  if (result.changes === 0) {
    throw new Error("Nie znaleziono pozycji");
  }
}

/**
 * Zwraca historię transakcji portfela.
 *
 * @param walletId Identyfikator portfela.
 * @returns Transakcje od najnowszej.
 */
export async function getTransactions(
  walletId: number,
): Promise<Transaction[]> {
  validateWalletId(walletId);

  const database = await getReadyDatabase();

  return database.getAllAsync<Transaction>(
    `SELECT * FROM transactions
     WHERE id_wallet = ?
     ORDER BY created_at DESC`,
    walletId,
  );
}

/**
 * Wykonuje transakcję kupna lub sprzedaży i zapisuje ją w historii.
 *
 * Wszystko dzieje się w jednej transakcji bazy danych:
 * - **BUY** — sprawdza, czy w portfelu jest dość gotówki (`quantity * price`)
 *   i czy kategoria należy do portfela; tworzy nową pozycję i zmniejsza saldo,
 * - **SELL** — sprawdza, czy w portfelu jest dość jednostek danego symbolu;
 *   zmniejsza pozostałe ilości pozycji od najstarszej (FIFO) i zwiększa saldo.
 *
 * @param input Dane transakcji; przy kupnie wymagane `category_id`.
 * @returns Zapisana transakcja.
 * @throws Gdy dane są niepoprawne, portfel nie istnieje, brakuje środków lub
 *   jednostek do sprzedaży, albo kategoria nie należy do portfela.
 *
 * @example
 * await createTransaction({
 *   id_wallet: 1,
 *   category_id: 2,
 *   symbol: "PKO.WA",
 *   type: "BUY",
 *   quantity: 10,
 *   price: 59.2,
 * });
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  validateWalletId(input.id_wallet);

  if (input.type !== "BUY" && input.type !== "SELL") {
    throw new Error("Nieprawidłowy typ transakcji");
  }

  const symbol = normalizeAndValidateSymbol(input.symbol);
  const quantity = validateNumberReal(input.quantity);
  const price = validateNumberReal(input.price);
  const createdAt =
    input.createdAt !== undefined ? validateDate(input.createdAt) : Date.now();

  if (quantity <= 0 || price <= 0) {
    throw new Error("Ilość i cena muszą być większe od zera");
  }

  if (input.type === "BUY") {
    if (input.category_id === undefined) {
      throw new Error(
        "Dla transakcji kupna wymagany jest identyfikator kategorii",
      );
    }
    validateId(input.category_id, "identyfikator kategorii");
  }

  const database = await getReadyDatabase();
  let transactionId = 0;

  await database.withTransactionAsync(async () => {
    const wallet = await database.getFirstAsync<Wallet>(
      `SELECT * FROM wallet WHERE id = ?`,
      input.id_wallet,
    );

    if (!wallet) {
      throw new Error("Nie znaleziono portfela");
    }

    const totalValue = quantity * price;

    if (input.type === "BUY") {
      if (wallet.balance < totalValue) {
        throw new Error("Niewystarczające środki w portfelu");
      }

      let categoryId: number;
      if (input.category_id === undefined) {
        throw new Error(
          "Dla transakcji kupna wymagany jest identyfikator kategorii",
        );
      }
      categoryId = validateId(
        input.category_id,
        "identyfikator kategorii",
      );

      const category = await database.getFirstAsync<AssetCategory>(
        `SELECT id, name, wallet_id
         FROM category_assets
         WHERE id = ? AND wallet_id = ?`,
        categoryId,
        input.id_wallet,
      );

      if (!category) {
        throw new Error("Kategoria nie należy do wybranego portfela");
      }

      await database.runAsync(
        `INSERT INTO positions
         (category_id, symbol, initial_quantity, remaining_quantity,
          buy_price, opened_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        input.category_id,
        symbol,
        quantity,
        quantity,
        price,
        createdAt,
      );

      await database.runAsync(
        `UPDATE wallet
         SET balance = balance - ?
         WHERE id = ?`,
        totalValue,
        input.id_wallet,
      );
    } else {
      const positions = await database.getAllAsync<Position>(
        `SELECT p.*
         FROM positions p
         INNER JOIN category_assets c
           ON c.id = p.category_id
         WHERE c.wallet_id = ?
           AND p.symbol = ?
           AND p.remaining_quantity > 0
         ORDER BY p.opened_at ASC, p.id ASC`,
        input.id_wallet,
        symbol,
      );

      const availableQuantity = positions.reduce(
        (sum, position) => sum + position.remaining_quantity,
        0,
      );

      if (availableQuantity < quantity) {
        throw new Error("Niewystarczająca ilość aktywa do sprzedaży");
      }

      let quantityToSell = quantity;

      for (const position of positions) {
        if (quantityToSell <= 0) {
          break;
        }

        const soldFromPosition = Math.min(
          position.remaining_quantity,
          quantityToSell,
        );

        await database.runAsync(
          `UPDATE positions
           SET remaining_quantity = remaining_quantity - ?
           WHERE id = ?`,
          soldFromPosition,
          position.id,
        );

        quantityToSell -= soldFromPosition;
      }

      await database.runAsync(
        `UPDATE wallet
         SET balance = balance + ?
         WHERE id = ?`,
        totalValue,
        input.id_wallet,
      );
    }

    const result = await database.runAsync(
      `INSERT INTO transactions
       (symbol, type, quantity, price, created_at, id_wallet)
       VALUES (?, ?, ?, ?, ?, ?)`,
      symbol,
      input.type,
      quantity,
      price,
      createdAt,
      input.id_wallet,
    );

    transactionId = result.lastInsertRowId;
  });

  const transaction = await database.getFirstAsync<Transaction>(
    `SELECT * FROM transactions WHERE id = ?`,
    transactionId,
  );

  if (!transaction) {
    throw new Error("Nie udało się odczytać utworzonej transakcji");
  }

  return transaction;
}

/**
 * Zwraca dzienne migawki wartości portfela — dane do wykresu wartości portfela w czasie.
 *
 * @param walletId Identyfikator portfela.
 * @returns Migawki od najnowszego dnia.
 */
export async function getPortfolioSnapshots(
  walletId: number,
): Promise<PortfolioSnapshot[]> {
  validateWalletId(walletId);

  const database = await getReadyDatabase();

  return database.getAllAsync<PortfolioSnapshot>(
    `SELECT * FROM portfolio_snapshots
     WHERE wallet_id = ?
     ORDER BY snapshot_date DESC`,
    walletId,
  );
}

/**
 * Zwraca numer bieżącego dnia od 1970-01-01 (UTC), np. 2023-08-15 → 19584.
 *
 * @returns Numer dnia.
 */
function getCurrentDayNumber(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/**
 * Zapisuje migawkę wartości portfela dla bieżącego dnia.
 *
 * Jeśli migawka z dzisiaj już istnieje, jest nadpisywana (jedna na portfel i dzień).
 *
 * @param input Wartości portfela.
 * @returns Zapisana migawka.
 * @throws Gdy wartości są ujemne lub niepoprawne albo portfel nie istnieje.
 */
export async function createPortfolioSnapshot(
  input: CreateSnapshotInput,
): Promise<PortfolioSnapshot> {
  validateWalletId(input.wallet_id);

  const cashBalance = validateNumberReal(input.cash_balance);
  const assetsValue = validateNumberReal(input.assets_value);

  if (cashBalance < 0 || assetsValue < 0) {
    throw new Error("Wartości snapshotu nie mogą być ujemne");
  }

  const snapshotDate = getCurrentDayNumber();
  const database = await getReadyDatabase();

  await database.withTransactionAsync(async () => {
    const wallet = await database.getFirstAsync<{ id: number }>(
      `SELECT id
       FROM wallet
       WHERE id = ?`,
      input.wallet_id,
    );

    if (!wallet) {
      throw new Error("Nie znaleziono portfela");
    }

    await database.runAsync(
      `INSERT INTO portfolio_snapshots
       (wallet_id, snapshot_date, cash_balance, assets_value)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(wallet_id, snapshot_date)
       DO UPDATE SET
         cash_balance = excluded.cash_balance,
         assets_value = excluded.assets_value`,
      input.wallet_id,
      snapshotDate,
      cashBalance,
      assetsValue,
    );
  });

  const snapshot = await database.getFirstAsync<PortfolioSnapshot>(
    `SELECT *
     FROM portfolio_snapshots
     WHERE wallet_id = ? AND snapshot_date = ?`,
    input.wallet_id,
    snapshotDate,
  );

  if (!snapshot) {
    throw new Error("Nie udało się odczytać snapshotu portfela");
  }

  return snapshot;
}

/**
 * Zapisuje dzisiejsze migawki dla wszystkich portfeli użytkownika.
 *
 * Trzeba ją wywoływać codziennie, aby historia wartości portfeli była ciągła.
 *
 * @param userId Identyfikator użytkownika.
 * @param values Wycena każdego portfela użytkownika.
 * @returns Zapisane migawki.
 * @throws Gdy brakuje wyceny dla któregoś portfela (migawki zapisane przed
 *   błędem zostają).
 */
export async function createDailySnapshots(
  userId: number,
  values: DailySnapshotValue[],
): Promise<PortfolioSnapshot[]> {
  validateUserId(userId);

  const wallets = await getWallets(userId);
  const snapshots: PortfolioSnapshot[] = [];

  for (const wallet of wallets) {
    const value = values.find((item) => item.wallet_id === wallet.id);

    if (!value) {
      throw new Error(
        `Brak wyceny dla portfela o identyfikatorze ${wallet.id}`,
      );
    }

    const snapshot = await createPortfolioSnapshot({
      wallet_id: wallet.id,
      cash_balance: value.cash_balance,
      assets_value: value.assets_value,
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

/**
 * Zwraca wszystkie obserwowane i odwiedzane aktywa użytkownika.
 *
 * @param userId Identyfikator użytkownika.
 * @returns Wpisy w kolejności dodania.
 * @throws Gdy identyfikator jest niepoprawny.
 */
export async function getFavoriteAssets(
  userId: number
): Promise<FavoriteAsset[]> {
  validateUserId(userId);

  const database = await getReadyDatabase();

  return database.getAllAsync<FavoriteAsset>(
    `SELECT * FROM favorite_assets WHERE user_id = ? ORDER BY id ASC`,
    userId,
  );
  
}

/**
 * Dodaje aktywo do listy użytkownika z licznikiem ustawionym na 1.
 *
 * Nie sprawdza, czy symbol jest już na liście — przed dodaniem warto sprawdzić
 * {@link getFavoriteAssets}, aby uniknąć duplikatów.
 *
 * @param userId Identyfikator użytkownika.
 * @param symbol Symbol aktywa.
 * @param favorite `1` — ulubione, `0` — tylko odwiedzane (domyślnie `0`).
 * @returns Dodany wpis.
 * @throws Gdy dane wejściowe są niepoprawne.
 */
export async function addFavoriteAsset(
  userId: number,
  symbol: string,
  favorite?: number
): Promise<FavoriteAsset> {
  validateUserId(userId);
  const normalizedSymbol = normalizeAndValidateSymbol(symbol);
  if (favorite !== undefined) {
    validateBoolean(favorite);
  }

  const database = await getReadyDatabase();
  let counter = 1;

  const result = await database.runAsync(
    `INSERT INTO favorite_assets (user_id, symbol, counter, favorite) VALUES (?, ?, ?, ?)`,
    userId,
    normalizedSymbol,
    counter,
    favorite === undefined ? 0 : favorite
  );

  const favoriteAsset = await database.getFirstAsync<FavoriteAsset>(
    `SELECT * FROM favorite_assets WHERE id = ?`,
    result.lastInsertRowId
  );

  if (!favoriteAsset) {
    throw new Error("Nie udało się dodać ulubionego aktywa");
  }

  return favoriteAsset;
}

/**
 * Usuwa aktywo z listy użytkownika (wszystkie wpisy z tym symbolem).
 *
 * @param userId Identyfikator użytkownika.
 * @param symbol Symbol aktywa.
 * @throws Gdy dane wejściowe są niepoprawne.
 */
export async function removeFavoriteAsset(
  userId: number,
  symbol: string
): Promise<void> {
  validateUserId(userId);
  const normalizedSymbol = normalizeAndValidateSymbol(symbol);

  const database = await getReadyDatabase();

  await database.runAsync(
    `DELETE FROM favorite_assets WHERE user_id = ? AND symbol = ?`,
    userId,
    normalizedSymbol
  );
}

/**
 * Przełącza flagę „ulubione” aktywa (`0` ↔ `1`).
 *
 * @param userId Identyfikator użytkownika.
 * @param symbol Symbol aktywa.
 * @throws Gdy aktywa nie ma na liście lub dane są niepoprawne.
 */
export async function updateFavoriteAsset(
  userId: number,
  symbol: string,
): Promise<void> {
  validateUserId(userId);
  const normalizedSymbol = normalizeAndValidateSymbol(symbol);
  

  const database = await getReadyDatabase();

  const existingAsset = await getFavoriteAssets(userId);


  const currentAsset = existingAsset.find(
    (asset) => asset.symbol === normalizedSymbol
  );

  if (!currentAsset) {
    throw new Error("Nie znaleziono ulubionego aktywa do aktualizacji");
  }

  await database.runAsync(
    `UPDATE favorite_assets SET favorite = ? WHERE user_id = ? AND symbol = ?`,
    currentAsset.favorite === 1 ? 0 : 1,
    userId,
    normalizedSymbol
  );
}

/**
 * Zwiększa o 1 licznik odwiedzin aktywa (np. po otwarciu szczegółów instrumentu).
 *
 * @param userId Identyfikator użytkownika.
 * @param symbol Symbol aktywa.
 * @throws Gdy aktywa nie ma na liście lub dane są niepoprawne.
 */
export async function addCounterToFavoriteAsset(
  userId: number,
  symbol: string
): Promise<void> {
  validateUserId(userId);
  const normalizedSymbol = normalizeAndValidateSymbol(symbol);

  const database = await getReadyDatabase();

  const existingAsset = await getFavoriteAssets(userId);
  const assetExists = existingAsset.some(
    (asset) => asset.symbol === normalizedSymbol
  );

  if (!assetExists) {
    throw new Error("Nie znaleziono ulubionego aktywa do aktualizacji");
  }

  await database.runAsync(
    `UPDATE favorite_assets SET counter = counter + 1 WHERE user_id = ? AND symbol = ?`,
    userId,
    normalizedSymbol
  );
}

/**
 * Usuwa wszystkie dane ze wszystkich tabel (konta, portfele, transakcje,
 * ustawienia, artykuły) w jednej transakcji. Tabele zostają.
 *
 * **Uwaga:** operacji nie można cofnąć. Dane domyślne i artykuły zostaną
 * odtworzone dopiero przy następnym uruchomieniu aplikacji, bo
 * {@link initializeDatabase} wykonuje się raz na uruchomienie.
 */
export async function clearLocalDatabase(): Promise<void> {
  const database = await getReadyDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM saved_article");
    await database.runAsync("DELETE FROM article_source");
    await database.runAsync("DELETE FROM source");
    await database.runAsync("DELETE FROM article");
    await database.runAsync("DELETE FROM category_article");

    await database.runAsync("DELETE FROM portfolio_snapshots");
    await database.runAsync("DELETE FROM positions");
    await database.runAsync("DELETE FROM transactions");
    await database.runAsync("DELETE FROM category_assets");
    await database.runAsync("DELETE FROM wallet");

    await database.runAsync("DELETE FROM favorite_assets");
    await database.runAsync("DELETE FROM notification_settings");
    await database.runAsync("DELETE FROM settings");
    await database.runAsync("DELETE FROM custom_accent_colors");
    await database.runAsync("DELETE FROM users");
  });
}

/**
 * Zamyka i usuwa plik bazy `invest-simulator.db`.
 *
 * Następne wywołanie dowolnej funkcji modułu utworzy bazę od nowa, z kontem
 * domyślnym i artykułami. Operacji nie można cofnąć.
 */
export async function deleteLocalDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.closeAsync();
  await SQLite.deleteDatabaseAsync("invest-simulator.db");

  databasePromise = null;
  initializationPromise = null;
}

/**
 * Wiersz zapytania o artykuł (tabela `article` z nazwą kategorii).
 */
interface ArticleRow {
  id: number;
  slug: string;
  title: string;
  text: string;
  summary: string;
  read_minutes: number;
  language: "pl" | "en";
  author: string;
  category: string;
}

/**
 * Wiersz zapytania o źródło artykułu (tabele `article_source` + `source`).
 */
interface ArticleSourceRow extends ArticleSource {
  article_id: number;
  url: string | undefined;
}

/**
 * Zwraca artykuły edukacyjne z tabel `article`, `category_article`,
 * `article_source` i `source` — dane zakładki „Nauka”.
 *
 * Treść jest dzielona na akapity, a źródła są dołączane w kolejności z artykułu.
 *
 * @returns Artykuły w kolejności wyświetlania (`id` to `slug` artykułu).
 */
export async function getEducationalArticles(): Promise<EducationalArticle[]> {
  const database = await getReadyDatabase();

  const rows = await database.getAllAsync<ArticleRow>(
    `SELECT a.id, a.slug, a.title, a.text, a.summary, a.read_minutes,
            a.language, a.author, c.category
     FROM article a
     JOIN category_article c ON c.id = a.category_id
     ORDER BY a.sort_order ASC, a.id ASC`,
  );
  const sources = await database.getAllAsync<ArticleSourceRow>(
    `SELECT l.article_id, s.author, s.title, s.publisher, s.year, s.url
     FROM article_source l
     JOIN source s ON s.id = l.source_id
     ORDER BY l.article_id ASC, l.position ASC`,
  );

  const sourcesByArticle = new Map<number, ArticleSource[]>();
  for (const { article_id, url, ...source } of sources) {
    const list = sourcesByArticle.get(article_id) ?? [];
    list.push(url ? { ...source, url } : source);
    sourcesByArticle.set(article_id, list);
  }

  return rows.map((row) => ({
    id: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.text.split(ARTICLE_PARAGRAPH_SEPARATOR),
    readMinutes: row.read_minutes,
    language: row.language,
    author: row.author,
    category: row.category,
    sources: sourcesByArticle.get(row.id) ?? [],
  }));
}

/**
 * Zwraca identyfikatory (`slug`) artykułów zapisanych przez użytkownika na później.
 *
 * @param userId Identyfikator użytkownika (domyślnie 1).
 * @returns Identyfikatory od ostatnio zapisanego.
 */
export async function getSavedArticleSlugs(userId = 1): Promise<string[]> {
  validateUserId(userId);
  const database = await getReadyDatabase();

  const rows = await database.getAllAsync<{ slug: string }>(
    `SELECT a.slug
     FROM saved_article s
     JOIN article a ON a.id = s.saved_article_id
     WHERE s.user_id = ? AND a.slug IS NOT NULL
     ORDER BY s.rowid DESC`,
    userId,
  );
  return rows.map((row) => row.slug);
}

/**
 * Dodaje lub usuwa artykuł z listy „do przeczytania później”.
 *
 * Ponowne zapisanie już zapisanego artykułu nic nie zmienia.
 *
 * @param slug Identyfikator artykułu, np. `"edu-01"`.
 * @param saved `true` — zapisz, `false` — usuń z listy.
 * @param userId Identyfikator użytkownika (domyślnie 1).
 * @throws Gdy przy zapisie artykuł nie istnieje.
 */
export async function setArticleSaved(
  slug: string,
  saved: boolean,
  userId = 1,
): Promise<void> {
  validateUserId(userId);
  const database = await getReadyDatabase();

  if (saved) {
    const article = await database.getFirstAsync<{ id: number }>(
      "SELECT id FROM article WHERE slug = ?",
      slug,
    );
    if (!article) throw new Error("Nie znaleziono artykułu do zapisania");

    await database.runAsync(
      `INSERT OR IGNORE INTO saved_article (user_id, saved_article_id)
       VALUES (?, ?)`,
      userId,
      article.id,
    );
    return;
  }

  await database.runAsync(
    `DELETE FROM saved_article
     WHERE user_id = ?
       AND saved_article_id IN (SELECT id FROM article WHERE slug = ?)`,
    userId,
    slug,
  );
}
