import * as SQLite from 'expo-sqlite';

const database = SQLite.openDatabaseSync('invest-simulator.db');

export type TransactionType = 'BUY' | 'SELL';

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

export function initializeDatabase(): void {
  database.execSync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS portfolio (
      symbol TEXT NOT NULL PRIMARY KEY,
      quantity INTEGER NOT NULL DEFAULT 0,
      average_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_profil (
      id INTEGER PRIMARY KEY NOT NULL,
      username TEXT NOT NULL,
      avatar_uri TEXT,
      dark_mode BOOLEAN NOT NULL DEFAULT 1,
      color_mode TEXT NOT NULL DEFAULT 'blue',
      currency_default TEXT NOT NULL DEFAULT 'PLN',
      "multi_currency" BOOLEAN NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price REAL NOT NULL CHECK (price >= 0),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (symbol) REFERENCES portfolio (symbol)
    );

    CREATE TABLE IF NOT EXISTS wallet (
      id INTEGER PRIMARY KEY NOT NULL,
      balance REAL NOT NULL DEFAULT 10000,
      currency TEXT NOT NULL DEFAULT 'PLN',
      id_user INTEGER NOT NULL,
      FOREIGN KEY (id_user) REFERENCES user_profil (id)
    );

    INSERT OR IGNORE INTO user_profil (id, username)
    VALUES (1, 'Inwestor');

    INSERT OR IGNORE INTO wallet (id, id_user)
    VALUES (1, 1);
  `);
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

export function getPortfolio(): PortfolioItem[] {
  return database.getAllSync<PortfolioItem>(
    'SELECT symbol, quantity, average_price FROM portfolio WHERE quantity > 0 ORDER BY symbol',
  );
}

export function getPortfolioItem(symbol: string): PortfolioItem | null {
  return database.getFirstSync<PortfolioItem>(
    'SELECT symbol, quantity, average_price FROM portfolio WHERE symbol = ?',
    symbol.trim().toUpperCase(),
  ) ?? null;
}

export function getUserProfile(userId = 1): UserProfile | null {
  return database.getFirstSync<UserProfile>(
    `SELECT id, username, avatar_uri, dark_mode, color_mode,
            currency_default, multi_currency
     FROM user_profil
     WHERE id = ?`,
    userId,
  ) ?? null;
}

export function updateUserProfile(
  changes: Partial<Omit<UserProfile, 'id'>>,
  userId = 1,
): UserProfile {
  const current = getUserProfile(userId);
  if (!current) throw new Error('Nie znaleziono profilu użytkownika');

  const next = {
    username: changes.username ?? current.username,
    avatarUri: changes.avatar_uri ?? current.avatar_uri,
    darkMode: changes.dark_mode ?? current.dark_mode,
    colorMode: changes.color_mode ?? current.color_mode,
    currencyDefault: changes.currency_default ?? current.currency_default,
    multiCurrency: changes.multi_currency ?? current.multi_currency,
  };

  database.runSync(
    `UPDATE user_profil
     SET username = ?, avatar_uri = ?, dark_mode = ?, color_mode = ?,
         currency_default = ?, "multi_currency" = ?
     WHERE id = ?`,
    next.username,
    next.avatarUri,
    next.darkMode,
    next.colorMode,
    next.currencyDefault,
    next.multiCurrency,
    userId,
  );

  return getUserProfile(userId) as UserProfile;
}

export function getWallet(userId = 1): Wallet | null {
  return database.getFirstSync<Wallet>(
    'SELECT id, balance, currency, id_user FROM wallet WHERE id_user = ?',
    userId,
  ) ?? null;
}

export function updateWalletBalance(
  amount: number,
  userId = 1,
): Wallet {
  requireNonNegative(amount, 'Saldo');

  database.runSync(
    'UPDATE wallet SET balance = ? WHERE id_user = ?',
    amount,
    userId,
  );

  const wallet = getWallet(userId);
  if (!wallet) throw new Error('Nie znaleziono portfela użytkownika');
  return wallet;
}

export function getTransactions(symbol?: string): Transaction[] {
  if (symbol) {
    return database.getAllSync<Transaction>(
      `SELECT id, symbol, type, quantity, price, created_at
       FROM transactions
       WHERE symbol = ?
       ORDER BY created_at DESC, id DESC`,
      symbol.trim().toUpperCase(),
    );
  }

  return database.getAllSync<Transaction>(
    `SELECT id, symbol, type, quantity, price, created_at
     FROM transactions
     ORDER BY created_at DESC, id DESC`,
  );
}

export function addTransaction(input: CreateTransactionInput): Transaction {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol) throw new Error('Symbol instrumentu jest wymagany');
  requirePositive(input.quantity, 'Liczba jednostek');
  requireNonNegative(input.price, 'Cena');

  const createdAt = input.createdAt ?? Date.now();
  let transactionId = 0;

  database.withTransactionSync(() => {
    const existing = getPortfolioItem(symbol);

    if (input.type === 'BUY') {
      const oldQuantity = existing?.quantity ?? 0;
      const newQuantity = oldQuantity + input.quantity;
      const newAveragePrice = existing
        ? ((oldQuantity * existing.average_price) + (input.quantity * input.price)) /
          newQuantity
        : input.price;

      database.runSync(
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
        throw new Error('Niewystarczająca liczba jednostek aktywa');
      }

      database.runSync(
        'UPDATE portfolio SET quantity = quantity - ? WHERE symbol = ?',
        input.quantity,
        symbol,
      );
    }

    const result = database.runSync(
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

  const transaction = database.getFirstSync<Transaction>(
    `SELECT id, symbol, type, quantity, price, created_at
     FROM transactions
     WHERE id = ?`,
    transactionId,
  );
  if (!transaction) throw new Error('Nie udało się zapisać transakcji');
  return transaction;
}

export function clearLocalDatabase(): void {
  database.withTransactionSync(() => {
    database.runSync('DELETE FROM transactions');
    database.runSync('DELETE FROM portfolio');
    database.runSync('UPDATE wallet SET balance = 10000 WHERE id = 1');
  });
}
