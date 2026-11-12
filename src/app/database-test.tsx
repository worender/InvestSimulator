import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  clearLocalDatabase,
  createCategory,
  createDailySnapshots,
  createPortfolioSnapshot,
  createPosition,
  createTransaction,
  createUserProfile,
  createWallet,
  deleteLocalDatabase,
  getCategories,
  getNotificationSettings,
  getPortfolio,
  getPortfolioSnapshots,
  getPositions,
  getSettings,
  getTransactions,
  getUserProfile,
  getUserProfiles,
  getWallet,
  getWallets,
  initializeDatabase,
  updateNotificationSettings,
  updatePosition,
  updateSettings,
  updateUserProfile,
  updateWallet,
  deleteWallet,
} from "../database/database";

type TestStatus = "PASS" | "FAIL";

type TestResult = {
  name: string;
  status: TestStatus;
  error?: string;
};

type TestFunction = () => Promise<void>;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message}. Oczekiwano: ${String(expected)}, otrzymano: ${String(actual)}`,
    );
  }
}

async function expectError(
  operation: () => Promise<unknown>,
  expectedMessage?: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (
      expectedMessage &&
      (!(error instanceof Error) ||
        error.message !== expectedMessage)
    ) {
      throw new Error(
        `Oczekiwano błędu "${expectedMessage}", ale otrzymano "${
          error instanceof Error ? error.message : "Nieznany błąd"
        }"`,
      );
    }

    return;
  }

  throw new Error("Operacja powinna zakończyć się błędem");
}

export default function DatabaseTestScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  async function runTest(
    name: string,
    testFunction: TestFunction,
  ): Promise<TestResult> {
    try {
      await testFunction();

      return {
        name,
        status: "PASS",
      };
    } catch (error) {
      return {
        name,
        status: "FAIL",
        error: error instanceof Error ? error.message : "Nieznany błąd",
      };
    }
  }

  async function runAllTests(): Promise<void> {
    if (running) return;

    setRunning(true);
    setResults([]);

    const testUserName = `DB Test ${Date.now()}`;
    let userId = 1;
    let walletId = 0;
    let categoryId = 0;
    let positionId = 0;

    const tests: Array<[string, TestFunction]> = [
      [
        "Inicjalizacja bazy i dane domyślne",
        async () => {
          await deleteLocalDatabase();
          await initializeDatabase();

          const user = await getUserProfile(1);
          const wallets = await getWallets(1);
          const settings = await getSettings(1);
          const notifications = await getNotificationSettings(1);

          assert(user !== null, "Brak domyślnego użytkownika");
          assert(wallets.length > 0, "Brak domyślnego portfela");
          assert(settings !== null, "Brak ustawień użytkownika");
          assert(notifications !== null, "Brak ustawień powiadomień");
        },
      ],
      [
        "Pobieranie listy użytkowników",
        async () => {
          const users = await getUserProfiles();

          assert(users.length > 0, "Lista użytkowników jest pusta");
          assert(users.some((user) => user.id === 1), "Brak użytkownika 1");
        },
      ],
      [
        "Tworzenie użytkownika",
        async () => {
          const user = await createUserProfile({
            username: testUserName,
            avatar_uri: null,
          });
      
          userId = user.id;
      
          const wallets = await getWallets(userId);
      
          assert(
            wallets.length >= 1,
            "Użytkownik powinien mieć co najmniej jeden portfel",
          );
      
          const defaultWallet = wallets.find(
            (wallet) => wallet.name === "Główny portfel",
          );
      
          assert(defaultWallet !== undefined, "Brak domyślnego portfela");
      
          assertEqual(
            defaultWallet.balance,
            10000,
            "Niepoprawne saldo początkowe",
          );
      
          assertEqual(
            defaultWallet.currency,
            "PLN",
            "Niepoprawna waluta początkowa",
          );
        },
      ],
      [
        "Aktualizacja profilu użytkownika",
        async () => {
          const updated = await updateUserProfile(
            {
              username: `${testUserName} Updated`,
              avatar_uri: "https://example.com/new-avatar.png",
            },
            userId,
          );

          assertEqual(
            updated.username,
            `${testUserName} Updated`,
            "Profil nie został zaktualizowany",
          );
        },
      ],
      [
        "Aktualizacja ustawień użytkownika",
        async () => {
          await updateSettings({
            user_id: userId,
            dark_mode: 0,
            color_mode: "blue",
            multi_currency: 1,
            font_size: "large",
            biometric_enabled: 1,
            currency: "USD",
          });

          
          const settings = await getSettings(userId);
          // const settings = null;

          assert(settings !== null, "Brak zaktualizowanych ustawień");
          if (settings === null) return;
          assertEqual(settings.currency, "USD", "Waluta nie została zaktualizowana");
          assertEqual(settings.dark_mode, 0, "Tryb ciemny nie został zaktualizowany");
        },
      ],
      [
        "Aktualizacja ustawień powiadomień",
        async () => {
          await updateNotificationSettings({
            user_id: userId,
            notifications_enabled: 1,
            push_notifications_enabled: 1,
            portfolio: 1,
            market: 1,
            news: 1,
            transactions: 1,
            reminders: 1,
          });

          const settings = await getNotificationSettings(userId);

          assert(settings !== null, "Brak ustawień powiadomień");
          if (settings === null) return;
          assertEqual(
            settings.notifications_enabled,
            1,
            "Powiadomienia nie zostały włączone",
          );
        },
      ],
      [
        "Tworzenie portfela",
        async () => {
          const wallet = await createWallet(userId, {
            name: "Portfel testowy",
            currency: "PLN",
            balance: 1000,
            icon: "wallet-outline",
          });

          walletId = wallet.id;

          assertEqual(wallet.name, "Portfel testowy", "Niepoprawna nazwa portfela");
          assertEqual(wallet.balance, 1000, "Niepoprawne saldo portfela");
          assertEqual(wallet.id_user, userId, "Portfel ma złego właściciela");
        },
      ],
      [
        "Pobieranie portfela",
        async () => {
          const wallet = await getWallet(userId, walletId);

          assert(wallet !== null, "Nie znaleziono utworzonego portfela");
          assertEqual(wallet.id, walletId, "Niepoprawne ID portfela");
        },
      ],
      [
        "Aktualizacja portfela",
        async () => {
          await updateWallet(walletId, userId, {
            name: "Zaktualizowany portfel",
            balance: 2000,
            currency: "EUR",
          });

          const wallet = await getWallet(userId, walletId);

          assert(wallet !== null, "Nie znaleziono portfela po aktualizacji");
          assertEqual(wallet.name, "Zaktualizowany portfel", "Nazwa nie została zmieniona");
          assertEqual(wallet.balance, 2000, "Saldo nie zostało zmienione");
          assertEqual(wallet.currency, "EUR", "Waluta nie została zmieniona");
        },
      ],
            [
        "Odrzucanie SQL Injection w nazwie portfela",
        async () => {
          await expectError(
            () =>
              createWallet(userId, {
                name: "Test'; DROP TABLE wallet;--",
                currency: "PLN",
              }),
            "Nazwa portfela może zawierać tylko litery, cyfry, kropki, podkreślenia i myślniki",
          );
        },
      ],
      [
        "Tworzenie kategorii",
        async () => {
          const category = await createCategory(walletId, {
            name: "Akcje testowe",
          });

          categoryId = category.id;

          assertEqual(category.wallet_id, walletId, "Kategoria ma złego właściciela");
          assertEqual(category.name, "Akcje testowe", "Niepoprawna nazwa kategorii");
        },
      ],
      [
        "Pobieranie kategorii",
        async () => {
          const categories = await getCategories(walletId);

          assert(
            categories.some((category) => category.id === categoryId),
            "Nie znaleziono utworzonej kategorii",
          );
        },
      ],
      [
        "Tworzenie pozycji",
        async () => {
          const position = await createPosition(categoryId, {
            category_id: categoryId,
            symbol: "TEST",
            quantity: 5,
            buy_price: 100,
            opened_at: 1700000000000,
          });

          positionId = position.id;

          assertEqual(position.symbol, "TEST", "Niepoprawny symbol pozycji");
          assertEqual(position.remaining_quantity, 5, "Niepoprawna ilość pozycji");
          assertEqual(position.buy_price, 100, "Niepoprawna cena zakupu");
          assertEqual(position.opened_at, 1700000000000, "Niepoprawna data otwarcia pozycji");
        },
      ],
      [
        "Aktualizacja pozycji",
        async () => {
          await updatePosition(positionId, {
            remaining_quantity: 3,
          });

          const positions = await getPositions(walletId);
          const position = positions.find((item) => item.id === positionId);

          assert(position !== undefined, "Nie znaleziono pozycji");
          assertEqual(
            position.remaining_quantity,
            3,
            "Pozycja nie została zaktualizowana",
          );
        },
      ],
      [
        "Kupno aktywa",
        async () => {
          await updateWallet(walletId, userId, {
            balance: 1000,
          });

          const transaction = await createTransaction({
            id_wallet: walletId,
            category_id: categoryId,
            symbol: "AAPL",
            type: "BUY",
            quantity: 2,
            price: 100,
            createdAt: 1700000000000,
          });

          const wallet = await getWallet(userId, walletId);

          assertEqual(transaction.type, "BUY", "Niepoprawny typ transakcji");
          assert(wallet !== null, "Nie znaleziono portfela");
          assertEqual(wallet.balance, 800, "Kupno nie zmniejszyło salda");
        },
      ],
      [
        "Sprzedaż aktywa",
        async () => {
          await createTransaction({
            id_wallet: walletId,
            symbol: "AAPL",
            type: "SELL",
            quantity: 1,
            price: 150,
            createdAt: 1700000001000,
          });

          const wallet = await getWallet(userId, walletId);

          assert(wallet !== null, "Nie znaleziono portfela");
          assertEqual(wallet.balance, 950, "Sprzedaż nie zwiększyła salda");
        },
      ],
      [
        "Pobieranie transakcji",
        async () => {
          const transactions = await getTransactions(walletId);

          assert(transactions.length >= 2, "Brak zapisanych transakcji");
          assert(
            transactions.some((transaction) => transaction.symbol === "AAPL"),
            "Brak transakcji AAPL",
          );
        },
      ],
      [
        "Transakcja aktualizuje wszystkie powiązane dane",
        async () => {
          
          

          await updateWallet(walletId, userId, {
            balance: 1000,
          });
      
          const categoriesBefore = await getCategories(walletId);
          const categoryBefore = categoriesBefore.find(
            (category) => category.id === categoryId,
          );
      
          assert(
            categoryBefore !== undefined,
            "Brak kategorii przed wykonaniem transakcji",
          );
      
          const positionsBefore = await getPositions(walletId);
          const transactionsBefore = await getTransactions(walletId);
      
          const transaction = await createTransaction({
            id_wallet: walletId,
            category_id: categoryId,
            symbol: "MSFT",
            type: "BUY",
            quantity: 3,
            price: 100,
            createdAt: 1700000010000,
          });
      
          const walletAfter = await getWallet(userId, walletId);
          const categoriesAfter = await getCategories(walletId);
          const positionsAfter = await getPositions(walletId);
          const transactionsAfter = await getTransactions(walletId);
      
          const position = positionsAfter.find(
            (item) =>
              item.symbol === "MSFT" &&
              item.category_id === categoryId,
          );
      
          const categoryAfter = categoriesAfter.find(
            (category) => category.id === categoryId,
          );
      
          assertEqual(transaction.type, "BUY", "Niepoprawny typ transakcji");
          assertEqual(transaction.symbol, "MSFT", "Niepoprawny symbol transakcji");
          assertEqual(transaction.quantity, 3, "Niepoprawna ilość transakcji");
          assertEqual(transaction.price, 100, "Niepoprawna cena transakcji");
          assertEqual(
            transaction.id_wallet,
            walletId,
            "Transakcja ma niepoprawny portfel",
          );
      
          assert(walletAfter !== null, "Portfel nie istnieje po transakcji");
          assertEqual(
            walletAfter.balance,
            700,
            "Saldo portfela nie zostało pomniejszone o wartość transakcji",
          );
      
          assertEqual(
            transactionsAfter.length,
            transactionsBefore.length + 1,
            "Transakcja nie została zapisana",
          );
      
          assert(position !== undefined, "Pozycja nie została utworzona");
          assertEqual(
            position.remaining_quantity,
            3,
            "Niepoprawna ilość pozostała w pozycji",
          );
          assertEqual(
            position.initial_quantity,
            3,
            "Niepoprawna ilość początkowa pozycji",
          );
          assertEqual(
            position.buy_price,
            100,
            "Niepoprawna cena zakupu pozycji",
          );
      
          assertEqual(
            positionsAfter.length,
            positionsBefore.length + 1,
            "Nie utworzono nowej pozycji",
          );
      
          assert(categoryAfter !== undefined, "Kategoria zniknęła po transakcji");
          assertEqual(
            categoryAfter.id,
            categoryBefore.id,
            "Kategoria została zmieniona po transakcji",
          );
          assertEqual(
            categoryAfter.wallet_id,
            walletId,
            "Kategoria ma niepoprawny portfel",
          );
          assertEqual(
            categoryAfter.name,
            categoryBefore.name,
            "Nazwa kategorii została zmieniona",
          );
        },
      ],
      [
        "Automatyczne dodawanie czasu transakcji",
        async () => {
          const startedAt = Date.now();
      
          const transaction = await createTransaction({
            id_wallet: walletId,
            category_id: categoryId,
            symbol: "TIME",
            type: "BUY",
            quantity: 1,
            price: 10,
            // celowo brak createdAt
          });
      
          const finishedAt = Date.now();
      
          assert(
            transaction.created_at >= startedAt &&
              transaction.created_at <= finishedAt,
            `Niepoprawny czas transakcji: ${transaction.created_at}`,
          );
        },
      ],
      [
        "Sprzedaż aktualizuje wszystkie powiązane dane",
        async () => {
          const symbol = "SELLTEST";
      
          const categoryBefore = (await getCategories(walletId)).find(
            (category) => category.id === categoryId,
          );
      
          assert(categoryBefore !== undefined, "Brak kategorii przed sprzedażą");
      
          const walletBeforeBuy = await getWallet(userId, walletId);
          assert(walletBeforeBuy !== null, "Brak portfela przed zakupem");
      
          await createTransaction({
            id_wallet: walletId,
            category_id: categoryId,
            symbol,
            type: "BUY",
            quantity: 3,
            price: 50,
          });
      
          const walletBeforeSell = await getWallet(userId, walletId);
          const positionsBeforeSell = await getPositions(walletId);
          const transactionsBeforeSell = await getTransactions(walletId);
      
          assert(walletBeforeSell !== null, "Brak portfela przed sprzedażą");
      
          const positionBeforeSell = positionsBeforeSell.find(
            (position) =>
              position.symbol === symbol &&
              position.category_id === categoryId,
          );
      
          assert(positionBeforeSell !== undefined, "Brak pozycji przed sprzedażą");
      
          const sellTransaction = await createTransaction({
            id_wallet: walletId,
            symbol,
            type: "SELL",
            quantity: 1,
            price: 60,
          });
      
          const walletAfterSell = await getWallet(userId, walletId);
          const positionsAfterSell = await getPositions(walletId);
          const transactionsAfterSell = await getTransactions(walletId);
          const categoryAfter = (await getCategories(walletId)).find(
            (category) => category.id === categoryId,
          );
      
          assert(walletAfterSell !== null, "Brak portfela po sprzedaży");
          assert(categoryAfter !== undefined, "Kategoria zniknęła po sprzedaży");
      
          // wallet: saldo wzrosło o wartość sprzedaży
          assertEqual(
            walletAfterSell.balance,
            walletBeforeSell.balance + 60,
            "Saldo portfela nie zostało zwiększone po sprzedaży",
          );
      
          // position: pozostała ilość zmniejszyła się
          const positionAfterSell = positionsAfterSell.find(
            (position) => position.id === positionBeforeSell.id,
          );
      
          assert(positionAfterSell !== undefined, "Pozycja zniknęła po sprzedaży");
      
          assertEqual(
            positionAfterSell.remaining_quantity,
            positionBeforeSell.remaining_quantity - 1,
            "Pozostała ilość pozycji nie została zmniejszona",
          );
      
          assertEqual(
            positionAfterSell.initial_quantity,
            positionBeforeSell.initial_quantity,
            "Ilość początkowa pozycji została zmieniona",
          );
      
          // transactions: zapisano nową transakcję SELL
          assertEqual(
            transactionsAfterSell.length,
            transactionsBeforeSell.length + 1,
            "Transakcja sprzedaży nie została zapisana",
          );
      
          assertEqual(sellTransaction.type, "SELL", "Niepoprawny typ transakcji");
          assertEqual(sellTransaction.symbol, symbol, "Niepoprawny symbol transakcji");
          assertEqual(sellTransaction.quantity, 1, "Niepoprawna ilość sprzedaży");
          assertEqual(sellTransaction.price, 60, "Niepoprawna cena sprzedaży");
          assertEqual(
            sellTransaction.id_wallet,
            walletId,
            "Transakcja ma niepoprawny portfel",
          );
      
          assert(
            transactionsAfterSell.some(
              (transaction) => transaction.id === sellTransaction.id,
            ),
            "Transakcja SELL nie znajduje się w bazie",
          );
      
          // category_assets: kategoria nie powinna zostać zmieniona
          assertEqual(
            categoryAfter.id,
            categoryBefore.id,
            "ID kategorii zostało zmienione",
          );
      
          assertEqual(
            categoryAfter.name,
            categoryBefore.name,
            "Nazwa kategorii została zmieniona",
          );
      
          assertEqual(
            categoryAfter.wallet_id,
            categoryBefore.wallet_id,
            "Portfel kategorii został zmieniony",
          );
        },
      ],
      [
        "FIFO: dwa zakupy tego samego symbolu i sprzedaż właściwej pozycji",
        async () => {
          const symbol = "FIFO.TEST";
      
          await updateWallet(walletId, userId, {
            balance: 10000,
          });
      
          await createTransaction({
            id_wallet: walletId,
            category_id: categoryId,
            symbol,
            type: "BUY",
            quantity: 2,
            price: 100,
            createdAt: 1000,
          });
      
          await createTransaction({
            id_wallet: walletId,
            category_id: categoryId,
            symbol,
            type: "BUY",
            quantity: 3,
            price: 200,
            createdAt: 2000,
          });
      
          const positionsBeforeSell = (await getPositions(walletId)).filter(
            (position) => position.symbol === symbol,
          );
      
          assertEqual(
            positionsBeforeSell.length,
            2,
            "Powinny powstać dwie osobne pozycje",
          );
      
          const firstPosition = positionsBeforeSell.find(
            (position) => position.buy_price === 100,
          );
      
          const secondPosition = positionsBeforeSell.find(
            (position) => position.buy_price === 200,
          );
      
          assert(firstPosition !== undefined, "Brak pierwszej pozycji");
          assert(secondPosition !== undefined, "Brak drugiej pozycji");
      
          assertEqual(
            firstPosition.remaining_quantity,
            2,
            "Pierwsza pozycja ma niepoprawną ilość przed sprzedażą",
          );
      
          assertEqual(
            secondPosition.remaining_quantity,
            3,
            "Druga pozycja ma niepoprawną ilość przed sprzedażą",
          );
      
          await createTransaction({
            id_wallet: walletId,
            symbol,
            type: "SELL",
            quantity: 1,
            price: 250,
            createdAt: 3000,
          });
      
          const positionsAfterSell = (await getPositions(walletId)).filter(
            (position) => position.symbol === symbol,
          );
      
          assertEqual(
            positionsAfterSell.length,
            2,
            "Po sprzedaży powinny nadal istnieć dwie pozycje",
          );
      
          const firstPositionAfterSell = positionsAfterSell.find(
            (position) => position.id === firstPosition.id,
          );
      
          const secondPositionAfterSell = positionsAfterSell.find(
            (position) => position.id === secondPosition.id,
          );
      
          assert(firstPositionAfterSell !== undefined, "Pierwsza pozycja zniknęła");
          assert(secondPositionAfterSell !== undefined, "Druga pozycja zniknęła");
      
          assertEqual(
            firstPositionAfterSell.remaining_quantity,
            1,
            "Sprzedaż powinna zmniejszyć pierwszą, najstarszą pozycję",
          );
      
          assertEqual(
            secondPositionAfterSell.remaining_quantity,
            3,
            "Druga pozycja nie powinna zostać zmieniona",
          );
      
          assertEqual(
            firstPositionAfterSell.buy_price,
            100,
            "Cena pierwszej pozycji została zmieniona",
          );
      
          assertEqual(
            secondPositionAfterSell.buy_price,
            200,
            "Cena drugiej pozycji została zmieniona",
          );
        },
      ],
      [
        "Obliczanie portfolio",
        async () => {
          const portfolio = await getPortfolio();
          const item = portfolio.find((entry) => entry.symbol === "AAPL");

          assert(item !== undefined, "Brak AAPL w portfolio");
          assertEqual(item.quantity, 1, "Niepoprawna ilość w portfolio");
          assertEqual(item.average_price, 100, "Niepoprawna średnia cena");
        },
      ],
      [
        "Tworzenie snapshotu portfela",
        async () => {
          const snapshot = await createPortfolioSnapshot({
            wallet_id: walletId,
            cash_balance: 950,
            assets_value: 150,
          });

          assertEqual(snapshot.wallet_id, walletId, "Snapshot ma złe ID portfela");
          assertEqual(snapshot.cash_balance, 950, "Niepoprawny stan gotówki");
          assertEqual(snapshot.assets_value, 150, "Niepoprawna wartość aktywów");
        },
      ],
      [
        "Aktualizacja snapshotu tego samego dnia",
        async () => {
          const snapshot = await createPortfolioSnapshot({
            wallet_id: walletId,
            cash_balance: 900,
            assets_value: 200,
          });

          assertEqual(snapshot.cash_balance, 900, "Snapshot nie został zaktualizowany");
          assertEqual(snapshot.assets_value, 200, "Wartość aktywów nie została zaktualizowana");
        },
      ],
      [
        "Pobieranie snapshotów",
        async () => {
          const snapshots = await getPortfolioSnapshots(walletId);

          assert(snapshots.length >= 1, "Brak snapshotów");
          assert(
            snapshots.some((snapshot) => snapshot.wallet_id === walletId),
            "Brak snapshotu portfela",
          );
        },
      ],
      [
        "Tworzenie snapshotów dziennych",
        async () => {
          const wallets = await getWallets(userId);

          const values = wallets.map((wallet) => ({
            wallet_id: wallet.id,
            cash_balance: 800,
            assets_value: 300,
          }));

          const snapshots = await createDailySnapshots(userId, values);

          assertEqual(
            snapshots.length,
            wallets.length,
            "Nie utworzono snapshotu dla każdego portfela",
          );
        },
      ],
      [
        "Usuwanie portfela wraz z danymi zależnymi",
        async () => {
          await deleteWallet(walletId, userId);

          const wallet = await getWallet(userId, walletId);
          const categories = await getCategories(walletId);
          const transactions = await getTransactions(walletId);
          const snapshots = await getPortfolioSnapshots(walletId);

          assert(wallet === null, "Portfel nadal istnieje");
          assertEqual(categories.length, 0, "Kategorie nie zostały usunięte");
          assertEqual(transactions.length, 0, "Transakcje nie zostały usunięte");
          assertEqual(snapshots.length, 0, "Snapshoty nie zostały usunięte");
        },
      ],
      [
        "Czyszczenie całej bazy",
        async () => {
          await clearLocalDatabase();

          const users = await getUserProfiles();

          assertEqual(users.length, 0, "Baza nie została całkowicie wyczyszczona");
        },
      ],
      [
        "Ponowna inicjalizacja po usunięciu bazy",
        async () => {
          await deleteLocalDatabase();
          await initializeDatabase();

          const user = await getUserProfile(1);

          assert(user !== null, "Baza nie została ponownie zainicjalizowana");
        },
      ],
      
    ];

    const completedResults: TestResult[] = [];

    for (const [name, testFunction] of tests) {
      const result = await runTest(name, testFunction);
      completedResults.push(result);
      setResults([...completedResults]);
    }

    setRunning(false);
  }

  const passed = results.filter((result) => result.status === "PASS").length;
  const failed = results.filter((result) => result.status === "FAIL").length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Automatyczne testy bazy danych</Text>

      <Button
        title={running ? "Testy trwają..." : "Uruchom wszystkie testy"}
        onPress={() => void runAllTests()}
        disabled={running}
      />

      {running ? <ActivityIndicator style={styles.loader} /> : null}

      <Text style={styles.summary}>
        Wynik: {passed} PASS, {failed} FAIL
      </Text>

      <View style={styles.results}>
        {results.map((result) => (
          <View
            key={result.name}
            style={[
              styles.result,
              result.status === "PASS" ? styles.pass : styles.fail,
            ]}
          >
            <Text style={styles.resultTitle}>
              {result.status} — {result.name}
            </Text>

            {result.error ? (
              <Text style={styles.error}>{result.error}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  loader: {
    marginVertical: 16,
  },
  summary: {
    marginTop: 16,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  results: {
    gap: 8,
  },
  result: {
    borderRadius: 8,
    padding: 12,
  },
  pass: {
    backgroundColor: "#d1fae5",
  },
  fail: {
    backgroundColor: "#fee2e2",
  },
  resultTitle: {
    fontWeight: "700",
  },
  error: {
    marginTop: 4,
    color: "#991b1b",
  },
});