import * as SQLite from "expo-sqlite";
import { normalizeAndValidateSymbol,
  ValidateUserName, ValidateAvatarUrl
 } from "./checkSecurityParam";
import { useEffect } from "react";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

// SQL injection validation test
// async function testValidation() {
  // try {
  //   await getPortfolioItem("' OR 1=1 --");
  //   console.log("BŁĄD: symbol został zaakceptowany");
  // } catch (error) {
  //   console.log("Poprawnie odrzucono:", error);
  // }

  // try {
  //   await getPortfolioItem("DROP TABLE portfolio; --");
  //   console.log("BŁĄD: symbol został zaakceptowany");
  // } catch (error) {
  //   console.log("Poprawnie odrzucono:", error);
  // }

//   console.log("Test został uruchomiony");
//   try {
//     await getUserProfile("' OR 1=1 --"  as unknown as number);
//     console.log("BŁĄD: nieprawidłowy userId został zaakceptowany");
//   } catch (error) {
//     console.log("Poprawnie odrzucono:", error);
//   }
// }

// useEffect(() => {
//   void testValidation();
// }, []);



function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync("invest-simulator.db");
  return databasePromise;
}

export type TransactionType = "BUY" | "SELL";

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  average_price: number;
}

export interface UserProfile {
  id: number;
  username: string;
  avatar_uri: string | null;
  dark_mode: number;
  color_mode: string;
  currency_default: string;
  multi_currency: number;
  font_size: string;
  notifications_enabled: number;
  notification_categories: string;
  biometric_enabled: number;
  push_notifications_enabled: number;
  created_at: number;
}

export interface Transaction {
  id: number;
  symbol: string;
  type: TransactionType;
  quantity: number;
  price: number;
  created_at: number;
}

export interface Wallet {
  id: number;
  balance: number;
  currency: string;
  id_user: number;
}

export interface CreateTransactionInput {
  symbol: string;
  type: TransactionType;
  quantity: number;
  price: number;
  createdAt?: number;
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
          user_id INTEGER NOT NULL,
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
          user_id INTEGER NOT NULL,
          dark_mode INTEGER DEFAULT '1',
          color_mode TEXT DEFAULT 'default',
          multi_currency INTEGER DEFAULT '0',
          font_size TEXT DEFAULT 'medium',
          biometric_enabled INTEGER DEFAULT '0',
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS category_article (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          category TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS article (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          title TEXT,
          text TEXT,
          category_id INTEGER,
          FOREIGN KEY (category_id) REFERENCES category_article (id)
        );

        CREATE TABLE IF NOT EXISTS saved_article (
          user_id INTEGER NOT NULL,
          saved_article_id INTEGER NOT NULL,
          PRIMARY KEY (user_id, saved_article_id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (saved_article_id) REFERENCES article (id)
        );
  `);

   

    await migrateUserProfileColumns(database);
  })();

  return initializationPromise;
}

const USER_PROFILE_COLUMNS: [string, string][] = [
  ["font_size", "TEXT NOT NULL DEFAULT 'medium'"],
  ["notifications_enabled", "BOOLEAN NOT NULL DEFAULT 1"],
  [
    "notification_categories",
    `TEXT NOT NULL DEFAULT '{"portfolio":true,"market":true,"news":true,"transactions":true,"reminders":true}'`,
  ],
  ["biometric_enabled", "BOOLEAN NOT NULL DEFAULT 0"],
  ["push_notifications_enabled", "BOOLEAN NOT NULL DEFAULT 0"],
  ["created_at", "INTEGER NOT NULL DEFAULT 0"],
];

async function migrateUserProfileColumns(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(user_profil)",
  );
  const existing = new Set(columns.map((column) => column.name));

  for (const [name, definition] of USER_PROFILE_COLUMNS) {
    if (existing.has(name)) continue;
    await database.execAsync(
      `ALTER TABLE user_profil ADD COLUMN ${name} ${definition}`,
    );
  }
}

async function getReadyDatabase(): Promise<SQLite.SQLiteDatabase> {
  await initializeDatabase();
  return getDatabase();
}

const requirePositive = (value: number, fieldName: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} musi być większe od zera`);
  }
};

const requireNonNegative = (value: number, fieldName: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} nie może być ujemne`);
  }
};

export async function getPortfolio(): Promise<PortfolioItem[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<PortfolioItem>(
    "SELECT symbol, quantity, average_price FROM portfolio WHERE quantity > 0 ORDER BY symbol",
  );
}



///Get portfolio item by symbol, returns null if not found.
export async function getPortfolioItem(
  symbol: string,
): Promise<PortfolioItem | null> {
  const database = await getReadyDatabase();
  const validSymbol = normalizeAndValidateSymbol(symbol);

  return (
    database.getFirstAsync<PortfolioItem>(
      "SELECT symbol, quantity, average_price FROM portfolio WHERE symbol = ?",
      validSymbol,
    ) ?? null
  );
}

///Get user profile by userId, returns null if not found. Default userId is 1.
export async function getUserProfile(userId = 1): Promise<UserProfile | null> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

  const database = await getReadyDatabase();

  return (
    database.getFirstAsync<UserProfile>(
      `SELECT id, username, avatar_uri, dark_mode, color_mode,
            currency_default, multi_currency, font_size,
            notifications_enabled, notification_categories,
            biometric_enabled, push_notifications_enabled, created_at
     FROM user_profil
     WHERE id = ?`,
      userId,
    ) ?? null
  );
}

export async function getUserProfiles(): Promise<UserProfile[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<UserProfile>(
    `SELECT id, username, avatar_uri, dark_mode, color_mode,
            currency_default, multi_currency, font_size,
            notifications_enabled, notification_categories,
            biometric_enabled, push_notifications_enabled, created_at
     FROM user_profil
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
  const avatar_uri = input.avatar_uri ? ValidateAvatarUrl(input.avatar_uri) : null;
  const database = await getReadyDatabase();
  console.log("Tworzenie profilu użytkownika:", username, avatar_uri);

  const result = await database.runAsync(
    `INSERT INTO user_profil (username, avatar_uri, created_at)
     VALUES (?, ?, ?)`,
    username,
    avatar_uri ?? null,
    Date.now(),
  );

  const userId = result.lastInsertRowId;
  await database.runAsync(
    "INSERT OR IGNORE INTO wallet (id_user, balance, currency) VALUES (?, ?, ?)",
    userId,
    10000,
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

  const validateUserName = changes.username !== undefined ? ValidateUserName(changes.username) : current.username;
  const validateAvatarUrl = changes.avatar_uri !== undefined && changes.avatar_uri !== null ? 
  ValidateAvatarUrl(changes.avatar_uri) : current.avatar_uri;


  const next = {
    username: validateUserName,
    avatarUri: validateAvatarUrl,
    darkMode: changes.dark_mode ?? current.dark_mode,
    colorMode: changes.color_mode ?? current.color_mode,
    currencyDefault: changes.currency_default ?? current.currency_default,
    multiCurrency: changes.multi_currency ?? current.multi_currency,
    fontSize: changes.font_size ?? current.font_size,
    notificationsEnabled:
      changes.notifications_enabled ?? current.notifications_enabled,
    notificationCategories:
      changes.notification_categories ?? current.notification_categories,
    biometricEnabled: changes.biometric_enabled ?? current.biometric_enabled,
    pushNotificationsEnabled:
      changes.push_notifications_enabled ?? current.push_notifications_enabled,
  };

  await database.runAsync(
    `UPDATE user_profil
     SET username = ?, avatar_uri = ?, dark_mode = ?, color_mode = ?,
         currency_default = ?, "multi_currency" = ?, font_size = ?,
         notifications_enabled = ?, notification_categories = ?,
         biometric_enabled = ?, push_notifications_enabled = ?
     WHERE id = ?`,
    next.username,
    next.avatarUri,
    next.darkMode,
    next.colorMode,
    next.currencyDefault,
    next.multiCurrency,
    next.fontSize,
    next.notificationsEnabled,
    next.notificationCategories,
    next.biometricEnabled,
    next.pushNotificationsEnabled,
    userId,
  );

  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("Nie udało się odczytać zaktualizowanego profilu");
  }

  return profile;
}

///Chyba do usuniecia
export async function getWallet(userId = 1): Promise<Wallet | null> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    return null;
  }

  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<Wallet>(
      "SELECT id, balance, currency, id_user FROM wallet WHERE id_user = ?",
      userId,
    )) ?? null
  );
}

///Chyba do usuniecia
export async function updateWalletBalance(
  amount: number,
  userId = 1,
): Promise<Wallet> {
  requireNonNegative(amount, "Saldo");

  const database = await getReadyDatabase();

  await database.runAsync(
    "UPDATE wallet SET balance = ? WHERE id_user = ?",
    amount,
    userId,
  );

  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Nie znaleziono portfela użytkownika");
  return wallet;
}

///Get all transactions, optionally filtered by symbol. Returns an array of Transaction objects.
export async function getTransactions(symbol?: string): Promise<Transaction[]> {
  const validSymbol = symbol ? normalizeAndValidateSymbol(symbol) : undefined;
  const database = await getReadyDatabase();

  if (validSymbol) {
    return database.getAllAsync<Transaction>(
      `SELECT id, symbol, type, quantity, price, created_at
       FROM transactions
       WHERE symbol = ?
       ORDER BY created_at DESC, id DESC`,
      validSymbol,
    );
  }

  return await database.getAllAsync<Transaction>(
    `SELECT id, symbol, type, quantity, price, created_at
     FROM transactions
     ORDER BY created_at DESC, id DESC`,
  );
}

///Add a new transaction and update the portfolio accordingly. Returns the created Transaction object.
export async function addTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const database = await getReadyDatabase();
  const validSymbol = normalizeAndValidateSymbol(input.symbol);
  const symbol = validSymbol;
  if (!symbol) throw new Error("Symbol instrumentu jest wymagany");
  requirePositive(input.quantity, "Liczba jednostek");
  requireNonNegative(input.price, "Cena");

  const createdAt = input.createdAt ?? Date.now();
  let transactionId = 0;

  await database.withTransactionAsync(async () => {
    const existing = await getPortfolioItem(symbol);

    if (input.type === "BUY") {
      const oldQuantity = existing?.quantity ?? 0;
      const newQuantity = oldQuantity + input.quantity;
      const newAveragePrice = existing
        ? (oldQuantity * existing.average_price +
            input.quantity * input.price) /
          newQuantity
        : input.price;

      await database.runAsync(
        `INSERT INTO portfolio (symbol, quantity, average_price)
         VALUES (?, ?, ?)
         ON CONFLICT(symbol) DO UPDATE SET
           quantity = excluded.quantity,
           average_price = excluded.average_price`,
        symbol,
        newQuantity,
        newAveragePrice,
      );
    } else {
      if (!existing || existing.quantity < input.quantity) {
        throw new Error("Niewystarczająca liczba jednostek aktywa");
      }

      await database.runAsync(
        "UPDATE portfolio SET quantity = quantity - ? WHERE symbol = ?",
        input.quantity,
        symbol,
      );
    }

    const result = await database.runAsync(
      `INSERT INTO transactions (symbol, type, quantity, price, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      symbol,
      input.type,
      input.quantity,
      input.price,
      createdAt,
    );
    transactionId = result.lastInsertRowId;
  });

  const transaction = await database.getFirstAsync<Transaction>(
    `SELECT id, symbol, type, quantity, price, created_at
     FROM transactions
     WHERE id = ?`,
    transactionId,
  );
  if (!transaction) throw new Error("Nie udało się zapisać transakcji");
  return transaction;
}

export async function clearLocalDatabase(): Promise<void> {
  const database = await getReadyDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM transactions");
    await database.runAsync("DELETE FROM portfolio");
    await database.runAsync("DELETE FROM wallet");
    await database.runAsync("DELETE FROM user_profil");
    await database.runAsync("UPDATE wallet SET balance = 10000 WHERE id = 1");
  });
}

///Uwaga: Funkcja clearLocalDatabase() usuwa wszystkie 
// dane z lokalnej bazy danych, w tym transakcje, portfel i profil użytkownika. 
// Po jej wywołaniu baza danych zostanie zresetowana do stanu początkowego, 
// a saldo portfela zostanie ustawione na 10000. Używaj tej funkcji ostrożnie, 
// ponieważ spowoduje to utratę wszystkich danych użytkownika.
//void clearLocalDatabase();