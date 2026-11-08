import * as SQLite from "expo-sqlite";
import { normalizeAndValidateSymbol ,validateAvatarUrl, validateCurrencyCode, validateDate, validateIconWallet, validateNumberReal, validateUserName, validateWalletName } from "./checkSecurityParam";

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

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  average_price: number;
}

export interface Wallet {
  id: number;
  balance: number;
  currency: string;
  id_user: number;
  name: string;
  icon: string;
}

export interface AssetCategory {
  id: number;
  name: string;
  wallet_id: number;
}

export interface Position {
  id: number;
  category_id: number;
  symbol: string;
  initial_quantity: number;
  remaining_quantity: number;
  buy_price: number;
  opened_at: number;
}

export interface PortfolioSnapshot {
  wallet_id: number;
  snapshot_date: string;
  cash_balance: number;
  assets_value: number;
}

export interface CreateWalletInput {
  name: string;
  currency: string;
  balance?: number;
  icon?: string;
}

export interface CreateCategoryInput {
  name: string;
}

export interface CreatePositionInput {
  category_id: number;
  symbol: string;
  quantity: number;
  buy_price: number;
  opened_at?: number;
}

export interface UpdatePositionInput {
  remaining_quantity?: number;
}

export interface CreateSnapshotInput {
  wallet_id: number;
  cash_balance: number;
  assets_value: number;
}

export interface CreateTransactionInput {
  symbol: string;
  type: TransactionType;
  quantity: number;
  price: number;
  createdAt?: number;
  id_wallet: number;
  category_id?: number;
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

export interface DailySnapshotValue {
  wallet_id: number;
  cash_balance: number;
  assets_value: number;
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
    await seedDefaultData(database);
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

async function getReadyDatabase(): Promise<SQLite.SQLiteDatabase> {
  await initializeDatabase();
  return getDatabase();
}

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
      "wallet-outline"
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

///Update user profile with the given changes. Returns the updated UserProfile.
export async function updateUserProfile(
  changes: Partial<Omit<UserProfile, "id">>,
  userId = 1,
): Promise<UserProfile> {
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

export async function getWallet(userId : number, walletId : number): Promise<Wallet | null> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }
  
  const database = await getReadyDatabase();

  return (
    (await database.getFirstAsync<Wallet>(
      `SELECT * FROM wallet WHERE id_user = ? AND id = ?`,
      userId,
      walletId
    )) ?? null
  );
}

export async function getWallets(userId: number): Promise<Wallet[]> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

  const database = await getReadyDatabase();

  return database.getAllAsync<Wallet>(
    `SELECT * FROM wallet WHERE id_user = ? ORDER BY id ASC`,
    userId,
  );
}

export async function updateWallet(
  walletId: number,
  userId: number,
  changes: Partial<Omit<Wallet, "id" | "id_user">>,
): Promise<void> {
  


  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

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
      walletId
    );

    if (!updatedWallet) {
      throw new Error("Nie udało się odczytać zaktualizowanego portfela");
    }
  });
  
}

export async function createWallet(
  userId: number,
  data: CreateWalletInput,
): Promise<Wallet> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

  const name = validateWalletName(data.name);
  const currency = validateCurrencyCode(data.currency);
  const balance = data.balance ?? 10000;
  const icon = data.icon
    ? validateIconWallet(data.icon)
    : "wallet-outline";

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

export async function deleteWallet(
  walletId: number,
  userId: number,
): Promise<void> {
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

export async function getCategories(
  walletId: number,
): Promise<AssetCategory[]> {
  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

  const database = await getReadyDatabase();

  return database.getAllAsync<AssetCategory>(
    `SELECT * FROM category_assets
     WHERE wallet_id = ?
     ORDER BY id ASC`,
    walletId,
  );
}

export async function createCategory(
  walletId: number,
  data: CreateCategoryInput,
): Promise<AssetCategory> {
  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

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

async function databaseWalletExists(walletId: number): Promise<boolean> {
  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

  const database = await getReadyDatabase();

  const wallet = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM wallet WHERE id = ?`,
    walletId,
  );

  return wallet !== null;
}

export async function getPositions(walletId: number): Promise<Position[]> {
  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }
  
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

// Tylko do testów, nie używać w produkcji
export async function createPosition(
  categoryId: number,
  data: CreatePositionInput,
): Promise<Position> {
  if (categoryId <= 0 || !Number.isInteger(categoryId)) {
    throw new Error("Nieprawidłowy identyfikator kategorii");
  }

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

// Tylko do testów, nie używać w produkcji
export async function updatePosition(
  positionId: number,
  changes: UpdatePositionInput,
): Promise<void> {
  if (positionId <= 0 || !Number.isInteger(positionId)) {
    throw new Error("Nieprawidłowy identyfikator pozycji");
  }

  if (changes.remaining_quantity === undefined) {
    throw new Error("Brak danych do aktualizacji pozycji");
  }

  const remainingQuantity = validateNumberReal(
    changes.remaining_quantity,
  );

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

export async function getTransactions(
  walletId: number,
): Promise<Transaction[]> {
  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

  const database = await getReadyDatabase();

  return database.getAllAsync<Transaction>(
    `SELECT * FROM transactions
     WHERE id_wallet = ?
     ORDER BY created_at DESC`,
    walletId,
  );
}

// Główna funkcja do tworzenia transakcji kupna lub sprzedaży aktywów.
// Obsługuje zarówno transakcje typu "BUY", jak i "SELL", aktualizując odpowiednio stan portfela, pozycji oraz zapisując transakcję w bazie danych.
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  if (input.id_wallet <= 0 || !Number.isInteger(input.id_wallet)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

  if (input.type !== "BUY" && input.type !== "SELL") {
    throw new Error("Nieprawidłowy typ transakcji");
  }

  const symbol = normalizeAndValidateSymbol(input.symbol);
  const quantity = validateNumberReal(input.quantity);
  const price = validateNumberReal(input.price);
  const createdAt =
    input.createdAt !== undefined
      ? validateDate(input.createdAt)
      : Date.now();

  if (quantity <= 0 || price <= 0) {
    throw new Error("Ilość i cena muszą być większe od zera");
  }

  if (input.type === "BUY") {
    if (
      input.category_id === undefined ||
      input.category_id <= 0 ||
      !Number.isInteger(input.category_id)
    ) {
      throw new Error(
        "Dla transakcji kupna wymagany jest identyfikator kategorii",
      );
    }
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
      if (
        input.category_id === undefined ||
        input.category_id <= 0 ||
        !Number.isInteger(input.category_id)
      ) {
        throw new Error(
          "Dla transakcji kupna wymagany jest identyfikator kategorii",
        );
      }
      categoryId = input.category_id;

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

// Funkcja do pobierania wszystkich snapshotów portfela dla danego identyfikatora portfela.
// Snapshoty beda wykorzystane do analizy historycznej portfela,
// np. do tworzenia wykresów wartości portfela w czasie.
export async function getPortfolioSnapshots(
  walletId: number,
): Promise<PortfolioSnapshot[]> {
  if (walletId <= 0 || !Number.isInteger(walletId)) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

  const database = await getReadyDatabase();

  return database.getAllAsync<PortfolioSnapshot>(
    `SELECT * FROM portfolio_snapshots
     WHERE wallet_id = ?
     ORDER BY snapshot_date DESC`,
    walletId,
  );
}


function getCurrentDayNumber(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export async function createPortfolioSnapshot(
  input: CreateSnapshotInput,
): Promise<PortfolioSnapshot> {
  if (
    input.wallet_id <= 0 ||
    !Number.isInteger(input.wallet_id)
  ) {
    throw new Error("Nieprawidłowy identyfikator portfela");
  }

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

// Funkcja do tworzenia codziennych snapshotów portfela.
// Trzeba ją wywoływać codziennie, aby zapisywać stan portfela w danym dniu.
export async function createDailySnapshots(
  userId: number,
  values: DailySnapshotValue[],
): Promise<PortfolioSnapshot[]> {
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new Error("Nieprawidłowy identyfikator użytkownika");
  }

  const wallets = await getWallets(userId);
  const snapshots: PortfolioSnapshot[] = [];

  for (const wallet of wallets) {
    const value = values.find(
      (item) => item.wallet_id === wallet.id,
    );

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

export async function clearLocalDatabase(): Promise<void> {
  const database = await getReadyDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM saved_article");
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
