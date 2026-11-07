import * as SQLite from "expo-sqlite";
import { ValidateAvatarUrl, ValidateUserName } from "./checkSecurityParam";
import {
  ARTICLE_PARAGRAPH_SEPARATOR,
  EDUCATIONAL_ARTICLE_SEED,
  estimateReadMinutes,
  type ArticleSource,
  type EducationalArticle,
} from "./educationalArticles";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync("invest-simulator.db");
  return databasePromise;
}

export type TransactionType = "BUY" | "SELL";

export interface UserProfile {
  id: number;
  username: string;
  pass_hash: string | null;
  avatar_uri: string | null;
  active: number;
  created_at: number;
}

export interface Transaction {
  id: number;
  symbol: string;
  type: TransactionType;
  quantity: number;
  price: number;
  created_at: number;
  id_wallet: number;
}

export interface Wallet {
  id: number;
  balance: number;
  currency: string;
  id_user: number;
  name: string;
  icon: string;
}

export interface CreateTransactionInput {
  symbol: string;
  type: TransactionType;
  quantity: number;
  price: number;
  createdAt?: number;
  id_wallet: number;
}

export interface Settings {
  id: number;
  user_id: number;
  dark_mode: number;
  color_mode: string;
  multi_currency: number;
  font_size: string;
  biometric_enabled: number;
  currency: string;
}

export interface NotificationSettings {
  id: number;
  user_id: number;
  notifications_enabled: number;
  push_notifications_enabled: number;
  portfolio: number;
  market: number;
  news: number;
  transactions: number;
  reminders: number;
}

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
          id_user INTEGER,
          name TEXT,
          icon TEXT,
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
          snapshot_date TEXT NOT NULL, -- Format YYYY-MM-DD
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

        CREATE TABLE IF NOT EXISTS category_article (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          category TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS article (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          title TEXT,
          text TEXT,              -- Treść; akapity rozdzielone pustą linią
          category_id INTEGER,
          slug TEXT,              -- Stały identyfikator artykułu (np. 'edu-01')
          summary TEXT,           -- Krótkie podsumowanie wyświetlane na liście
          read_minutes INTEGER,   -- Szacowany czas czytania w minutach
          language TEXT DEFAULT 'pl',
          author TEXT,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (category_id) REFERENCES category_article (id)
        );

        CREATE TABLE IF NOT EXISTS article_source (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          article_id INTEGER NOT NULL,
          author TEXT NOT NULL,
          title TEXT NOT NULL,
          publisher TEXT NOT NULL,
          year INTEGER NOT NULL,
          url TEXT,
          position INTEGER NOT NULL DEFAULT 0, -- Kolejność źródeł w artykule
          FOREIGN KEY (article_id) REFERENCES article (id)
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
    await migrateArticleColumns(database);
    await syncEducationalArticles(database);
  })();

  return initializationPromise;
}

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

// Kolumny artykułu dodane po pierwszej wersji tabeli `article`.
// Bazy utworzone wcześniej dostają je przez ALTER TABLE.
const ARTICLE_COLUMNS: [string, string][] = [
  ["slug", "TEXT"],
  ["summary", "TEXT"],
  ["read_minutes", "INTEGER"],
  ["language", "TEXT DEFAULT 'pl'"],
  ["author", "TEXT"],
  ["sort_order", "INTEGER DEFAULT 0"],
];

async function migrateArticleColumns(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(article)",
  );
  const existing = new Set(columns.map((column) => column.name));

  for (const [name, definition] of ARTICLE_COLUMNS) {
    if (existing.has(name)) continue;
    await database.execAsync(`ALTER TABLE article ADD COLUMN ${name} ${definition}`);
  }

  await database.execAsync(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_article_slug ON article (slug)",
  );
}

// Zapisuje artykuły edukacyjne dostarczane z aplikacją do tabel
// `category_article`, `article` i `article_source`. Artykuły są
// dopasowywane po `slug`, więc ich `id` (i zapisane zakładki) się nie zmienia.
// Artykuły usunięte z aplikacji znikają z bazy razem ze źródłami i zakładkami.
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
          `INSERT INTO article_source
             (article_id, author, title, publisher, year, url, position)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          row.id,
          source.author,
          source.title,
          source.publisher,
          source.year,
          source.url ?? null,
          position,
        );
      }
    }

    // Usuwa artykuły wycofane z aplikacji (najpierw rekordy zależne)
    const slugs = EDUCATIONAL_ARTICLE_SEED.map((article) => article.id);
    const placeholders = slugs.map(() => "?").join(", ");
    const removed = `SELECT id FROM article WHERE slug IS NOT NULL AND slug NOT IN (${placeholders})`;
    await database.runAsync(
      `DELETE FROM saved_article WHERE saved_article_id IN (${removed})`,
      ...slugs,
    );
    await database.runAsync(
      `DELETE FROM article_source WHERE article_id IN (${removed})`,
      ...slugs,
    );
    await database.runAsync(
      `DELETE FROM article WHERE slug IS NOT NULL AND slug NOT IN (${placeholders})`,
      ...slugs,
    );
  });
}

async function getReadyDatabase(): Promise<SQLite.SQLiteDatabase> {
  await initializeDatabase();
  return getDatabase();
}

// // TO IMPLEMENT
// const requirePositive = (value: number, fieldName: string): void => {
//   if (!Number.isFinite(value) || value <= 0) {
//     throw new Error(`${fieldName} musi być większe od zera`);
//   }
// };

// const requireNonNegative = (value: number, fieldName: string): void => {
//   if (!Number.isFinite(value) || value < 0) {
//     throw new Error(`${fieldName} nie może być ujemne`);
//   }
// };

///Get user profile by userId, returns null if not found. Default userId is 1.
export async function getUserProfile(userId = 1): Promise<UserProfile | null> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

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

export async function getUserProfiles(): Promise<UserProfile[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<UserProfile>(
    `SELECT id, username, pass_hash ,avatar_uri, active, created_at
     FROM users
     ORDER BY id ASC`,
  );
}

///Create a new user profile with the given username and optional avatar URI. Returns the created UserProfile.
export async function createUserProfile(input: {
  username: string;
  avatar_uri?: string | null;
}): Promise<UserProfile> {
  if (!input.username) throw new Error("Nazwa konta jest wymagana");

  const username = ValidateUserName(input.username);
  const avatar_uri = input.avatar_uri
    ? ValidateAvatarUrl(input.avatar_uri)
    : null;
  const database = await getReadyDatabase();
  console.log("Tworzenie profilu użytkownika:", username, avatar_uri);

  const result = await database.runAsync(
    `INSERT INTO users (username, avatar_uri, created_at)
     VALUES (?, ?, ?)`,
    username,
    avatar_uri ?? null,
    Date.now(),
  );

  const userId = result.lastInsertRowId;
  await database.runAsync(
    "INSERT OR IGNORE INTO wallet (id_user, balance, name, currency) VALUES (?, ?, ?, ?)",
    userId,
    10000,
    "Główny portfel",
    "PLN",
  );

  const profile = await getUserProfile(userId);
  if (!profile) throw new Error("Nie udało się utworzyć konta");
  return profile;
}

///Update user profile with the given changes. Returns the updated UserProfile.
export async function updateUserProfile(
  changes: Partial<Omit<UserProfile, "id">>,
  userId = 1,
): Promise<UserProfile> {
  const database = await getReadyDatabase();
  const current = await getUserProfile(userId);
  if (!current) throw new Error("Nie znaleziono profilu użytkownika");

  const validateUserName =
    changes.username !== undefined
      ? ValidateUserName(changes.username)
      : current.username;
  const validateAvatarUrl =
    changes.avatar_uri !== undefined && changes.avatar_uri !== null
      ? ValidateAvatarUrl(changes.avatar_uri)
      : current.avatar_uri;

  const next = {
    username: validateUserName,
    avatarUri: validateAvatarUrl,
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

export async function updateSettings(
  settings: Partial<Settings>,
): Promise<void> {
  const database = await getReadyDatabase();

  if (!settings.user_id) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

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

export async function getSettings(userId = 1): Promise<Settings | null> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<Settings>(
      `SELECT * FROM settings WHERE user_id = ?`,
      userId,
    )) ?? null
  );
}

export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>,
): Promise<void> {
  const database = await getReadyDatabase();

  if (!settings.user_id) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

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

export async function getNotificationSettings(
  userId = 1,
): Promise<NotificationSettings | null> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<NotificationSettings>(
      `SELECT * FROM notification_settings WHERE user_id = ?`,
      userId,
    )) ?? null
  );
}

export async function clearLocalDatabase(): Promise<void> {
  const database = await getReadyDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM saved_article");
    await database.runAsync("DELETE FROM article_source");
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
    await database.runAsync("DELETE FROM users");
  });
}

///Uwaga: Funkcja clearLocalDatabase() usuwa wszystkie
// dane z lokalnej bazy danych, w tym transakcje, portfel i profil użytkownika.
// Po jej wywołaniu baza danych zostanie zresetowana do stanu początkowego,
// a saldo portfela zostanie ustawione na 10000. Używaj tej funkcji ostrożnie,
// ponieważ spowoduje to utratę wszystkich danych użytkownika.
// void clearLocalDatabase();

export async function deleteLocalDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.closeAsync();
  await SQLite.deleteDatabaseAsync("invest-simulator.db");

  databasePromise = null;
  initializationPromise = null;
}

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

interface ArticleSourceRow extends ArticleSource {
  article_id: number;
  url: string | undefined;
}

/// Artykuły edukacyjne z tabel `article`, `category_article` i `article_source`.
export async function getEducationalArticles(): Promise<EducationalArticle[]> {
  const database = await getReadyDatabase();

  const rows = await database.getAllAsync<ArticleRow>(
    `SELECT a.id, a.slug, a.title, a.text, a.summary, a.read_minutes,
            a.language, a.author, c.category
     FROM article a
     JOIN category_article c ON c.id = a.category_id
     WHERE a.slug IS NOT NULL
     ORDER BY a.sort_order ASC, a.id ASC`,
  );
  const sources = await database.getAllAsync<ArticleSourceRow>(
    `SELECT article_id, author, title, publisher, year, url
     FROM article_source
     ORDER BY article_id ASC, position ASC`,
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

/// Identyfikatory (slug) artykułów zapisanych przez użytkownika, od najnowszych.
export async function getSavedArticleSlugs(userId = 1): Promise<string[]> {
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

/// Dodaje lub usuwa artykuł z listy „do przeczytania później”.
export async function setArticleSaved(
  slug: string,
  saved: boolean,
  userId = 1,
): Promise<void> {
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
