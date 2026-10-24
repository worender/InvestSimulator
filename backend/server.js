require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

const app = express();
app.use(cors());
app.use(express.json()); 

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = Number(process.env.PORT || 3000);

const getLocalIpv4Address = () => {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    const address = addresses?.find(
      (candidate) => candidate.family === 'IPv4' && !candidate.internal,
    );

    if (address) return address.address;
  }

  return 'localhost';
};

const localAddress = getLocalIpv4Address();
const serverAddressFile = path.join(__dirname, 'server-address.json');

try {
  fs.writeFileSync(
    serverAddressFile,
    `${JSON.stringify({ host: localAddress, port: PORT, url: `http://${localAddress}:${PORT}` }, null, 2)}\n`,
  );
} catch (error) {
  console.warn('Nie udało się zapisać pliku server-address.json:', error.message);
}

// MEMORY CACHE
const stockCache = new Map();
const financialsCache = new Map();
const performanceCache = new Map();
const quoteDetailsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

const normalizeYahooSymbol = (value, exchange) => {
  const symbol = String(value).trim().toUpperCase();
  if (!symbol) return symbol;

  const normalizedExchange = String(exchange || '').trim().toUpperCase();
  if (normalizedExchange === 'GPW' || normalizedExchange === 'WARSAW') {
    return symbol.endsWith('.WA') ? symbol : `${symbol}.WA`;
  }
  if (normalizedExchange === 'LSE' || normalizedExchange === 'LONDON') {
    return symbol.includes('.') ? symbol : `${symbol}.L`;
  }
  if (normalizedExchange === 'EURONEXT_PARIS' || normalizedExchange === 'PARIS') {
    return symbol.includes('.') ? symbol : `${symbol}.PA`;
  }
  if (normalizedExchange === 'NASDAQ' || normalizedExchange === 'NYSE') {
    return symbol.replace(/\.WA$/, '');
  }
  if (normalizedExchange) {
    return symbol;
  }
  if (symbol.includes('.') || symbol.includes('-') || symbol.includes('=') || symbol.startsWith('^')) {
    return symbol;
  }

  return `${symbol}.WA`;
};

app.post('/api/guest', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Brak ID urządzenia' });

  const token = jwt.sign({ deviceId }, JWT_SECRET, { expiresIn: '7d' });
  console.log('Generowanie nowego tokenu JWT:', token);
  res.json({ token });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Brak dostępu' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token wygasł' });
    req.user = user;
    next(); 
  });
};

app.get('/api/instruments/search', authenticateToken, async (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 25);
  if (query.length < 2) return res.json([]);

  try {
    const result = await yahooFinance.search(query, { quotesCount: limit, newsCount: 0 });
    const instruments = (result.quotes || [])
      .filter((quote) => quote.isYahooFinance !== false && quote.symbol)
      .slice(0, limit)
      .map((quote) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchange || '',
        exchangeName: quote.exchDisp || quote.exchange || 'Yahoo Finance',
        quoteType: quote.quoteType || 'EQUITY',
      }));

    res.json(instruments);
  } catch (error) {
    console.error('Błąd wyszukiwania instrumentów:', error.message);
    res.status(502).json({ error: 'Nie udało się wyszukać instrumentów' });
  }
});

app.get('/api/instruments/quote', authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || '').trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol) return res.status(400).json({ error: 'Brak symbolu instrumentu' });

  const symbol = normalizeYahooSymbol(requestedSymbol, exchange);
  try {
    const quote = await yahooFinance.quote(symbol, {}, { validate: false });
    if (!quote) return res.status(404).json({ error: 'Brak notowania instrumentu' });

    const marketState = quote.marketState || 'CLOSED';
    const activeStates = new Set(['REGULAR', 'PRE', 'POST', 'PREPRE', 'POSTPOST']);
    res.json({
      symbol,
      exchange: quote.fullExchangeName || quote.exchange || 'Yahoo Finance',
      marketState,
      isOpen: activeStates.has(marketState),
    });
  } catch (error) {
    console.error(`Błąd pobierania statusu giełdy dla ${symbol}:`, error.message);
    res.status(502).json({ error: 'Nie udało się pobrać statusu giełdy' });
  }
});

app.get('/api/trends', authenticateToken, async (req, res) => {
  const screens = {
    gainers: 'day_gainers',
    active: 'most_actives',
    technology: 'growth_technology_stocks',
    undervalued: 'undervalued_large_caps',
  };
  const category = String(req.query.category || 'gainers');
  const screen = screens[category] || screens.gainers;

  try {
    const result = await yahooFinance.screener(screen, { count: 5 });
    res.json((result.quotes || []).slice(0, 5).map((quote) => ({
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || quote.symbol,
      exchange: quote.exchange || '',
      exchangeName: quote.fullExchangeName || quote.exchange || 'Yahoo Finance',
      changePercent: quote.regularMarketChangePercent ?? 0,
    })));
  } catch (error) {
    console.error(`Błąd pobierania trendów ${category}:`, error.message);
    res.status(502).json({ error: 'Nie udało się pobrać dynamicznych trendów' });
  }
});

// GET /api/candles?symbol=PKO
// GET /api/candles?symbol=CDR&interval=1h&days=7
// GET /api/candles?symbol=KGH&interval=15m&days=2
app.get('/api/candles', authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || '');
  const exchange = req.query.exchange;
  let symbol = requestedSymbol;
  let interval = req.query.interval ? req.query.interval : '1d';
  let days = req.query.days ? req.query.days : 30;
  if (!symbol) return res.status(400).json({ error: 'Brak symbolu akcji' });

  symbol = normalizeYahooSymbol(symbol, exchange);
  console.log(`Normalizacja symbolu: ${requestedSymbol} [${exchange || 'domyślna giełda'}] -> ${symbol}`);

  
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
      return res.status(404).json({ error: 'Brak danych dla podanego symbolu' });
    }

    /// Candle formatting data
    const formattedCandles = result.quotes
      .filter(q => q.open !== null && q.close !== null)
      .map(q => ({
        timestamp: new Date(q.date).getTime(), // Konwersja daty na timestamp w milisekundach
        open: Math.round(q.open * 100) / 100,
        high: Math.round(q.high * 100) / 100,
        low: Math.round(q.low * 100) / 100,
        close: Math.round(q.close * 100) / 100,
      }));

    // 3. Zapis do cache'u
    stockCache.set(cacheKey, {
      timestamp: now,
      data: formattedCandles
    });

    res.json(formattedCandles);
  } catch (error) {
    console.error(`Błąd pobierania świec dla ${symbol}:`, error.message);
    res.status(500).json({ error: 'Błąd podczas pobierania danych historycznych' });
  }
});

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
    const fiveYearsAgo = new Date(nowObj.getFullYear() - 5, nowObj.getMonth(), nowObj.getDate());
    const chart = await yahooFinance.chart(symbol, { period1: fiveYearsAgo, interval: '1mo' }, { validate: false });
    const quotes = (chart?.quotes || []).filter((q) => q && q.close != null);
    if (!quotes.length) return null;

    const currentPrice = quotes[quotes.length - 1].close;
    const nowYear = nowObj.getFullYear();
    const ytdQuote = quotes.find((q) => new Date(q.date).getFullYear() === nowYear) || quotes[quotes.length - 1];
    const q1Y = quotes.length >= 13 ? quotes[quotes.length - 13] : quotes[0];
    const q3Y = quotes.length >= 37 ? quotes[quotes.length - 37] : quotes[0];
    const q5Y = quotes[0];

    const calcRet = (base) => (base && base.close ? ((currentPrice - base.close) / base.close) * 100 : 0);
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
      threeYearAvgReturn: p3Y > -100 ? Math.round((Math.pow(Math.max(0.001, 1 + p3Y / 100), 1 / 3) - 1) * 10000) / 100 : 0,
      fiveYearAvgReturn: p5Y > -100 ? Math.round((Math.pow(Math.max(0.001, 1 + p5Y / 100), 1 / 5) - 1) * 10000) / 100 : 0,
    };

    performanceCache.set(cacheKey, { timestamp: now, data: perfData });
    return perfData;
  } catch (error) {
    console.warn(`Nie udało się obliczyć wyników historycznych dla ${symbol}:`, error.message);
    return null;
  }
};

app.get('/api/instruments/financials', authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || '').trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol) return res.status(400).json({ error: 'Brak symbolu akcji' });

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
      yahooFinance.quoteSummary(
        symbol,
        { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'price'] },
        { validate: false },
      ).catch((err) => {
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
      return res.status(404).json({ error: 'Brak danych finansowych dla podanego symbolu' });
    }

    const price = quoteSummary?.price || {};
    const summaryDetail = quoteSummary?.summaryDetail || {};
    const defaultKeyStatistics = quoteSummary?.defaultKeyStatistics || {};
    const finData = quoteSummary?.financialData || {};

    const normalizePercent = (val) => {
      if (val === undefined || val === null || Number.isNaN(val)) return undefined;
      return Math.abs(val) <= 1 ? val * 100 : val;
    };

    const regularMarketPrice = quote?.regularMarketPrice ?? price?.regularMarketPrice ?? finData?.currentPrice ?? 0;
    const regularMarketChange = quote?.regularMarketChange ?? price?.regularMarketChange ?? 0;
    const regularMarketChangePercent = quote?.regularMarketChangePercent != null
      ? quote.regularMarketChangePercent
      : (price?.regularMarketChangePercent != null ? price.regularMarketChangePercent * 100 : 0);

    const dividendYieldRaw = summaryDetail?.dividendYield ?? quote?.dividendYield;
    const dividendYield = dividendYieldRaw != null ? normalizePercent(dividendYieldRaw) : undefined;

    const payoutRatioRaw = summaryDetail?.payoutRatio;
    const payoutRatio = payoutRatioRaw != null ? normalizePercent(payoutRatioRaw) : undefined;

    const fiveYearAvgDividendYieldRaw = summaryDetail?.fiveYearAvgDividendYield;
    const fiveYearAvgDividendYield = fiveYearAvgDividendYieldRaw != null ? normalizePercent(fiveYearAvgDividendYieldRaw) : undefined;

    const profitMarginsRaw = finData?.profitMargins;
    const profitMargins = profitMarginsRaw != null ? normalizePercent(profitMarginsRaw) : undefined;

    const shortPercentOfFloatRaw = defaultKeyStatistics?.shortPercentOfFloat;
    const shortPercentOfFloat = shortPercentOfFloatRaw != null ? normalizePercent(shortPercentOfFloatRaw) : undefined;

    const marketCapVal = summaryDetail?.marketCap ?? price?.marketCap ?? quote?.marketCap;
    const freeCashflowVal = finData?.freeCashflow;
    const priceToFreeCashFlow = freeCashflowVal && marketCapVal ? marketCapVal / freeCashflowVal : undefined;

    const lastSplitDateVal = defaultKeyStatistics?.lastSplitDate;
    const lastSplitDate = lastSplitDateVal
      ? (typeof lastSplitDateVal === 'number'
          ? new Date(lastSplitDateVal * 1000).toISOString()
          : new Date(lastSplitDateVal).toISOString())
      : undefined;

    const exDividendDateVal = summaryDetail?.exDividendDate;
    const exDividendDate = exDividendDateVal
      ? (typeof exDividendDateVal === 'number'
          ? new Date(exDividendDateVal * 1000).toISOString()
          : new Date(exDividendDateVal).toISOString())
      : undefined;

    const perf1Y = perf?.performance1Y ?? (quote?.fiftyTwoWeekChangePercent != null
      ? quote.fiftyTwoWeekChangePercent
      : (defaultKeyStatistics?.['52WeekChange'] != null ? defaultKeyStatistics['52WeekChange'] * 100 : undefined));

    const result = {
      symbol: requestedSymbol,
      currency: price?.currency || quote?.currency || 'USD',
      price: regularMarketPrice,
      change: regularMarketChange,
      changePercent: regularMarketChangePercent,
      volume: quote?.regularMarketVolume ?? price?.regularMarketVolume ?? summaryDetail?.regularMarketVolume ?? 0,
      averageVolume: summaryDetail?.averageDailyVolume10Day ?? summaryDetail?.averageVolume10days ?? quote?.averageDailyVolume10Day ?? 0,
      marketCap: marketCapVal ?? 0,
      sharesOutstanding: defaultKeyStatistics?.sharesOutstanding ?? quote?.sharesOutstanding ?? 0,
      bookValue: defaultKeyStatistics?.bookValue ?? quote?.bookValue ?? 0,
      dividendRate: summaryDetail?.dividendRate ?? quote?.dividendRate ?? 0,
      dividendYield: dividendYield ?? 0,
      exDividendDate: exDividendDate,
      payoutRatio: payoutRatio ?? 0,
      fiveYearAvgDividendYield: fiveYearAvgDividendYield ?? 0,
      beta: summaryDetail?.beta ?? defaultKeyStatistics?.beta ?? 0,
      trailingPE: summaryDetail?.trailingPE ?? quote?.trailingPE ?? 0,
      forwardPE: summaryDetail?.forwardPE ?? quote?.forwardPE ?? defaultKeyStatistics?.forwardPE ?? 0,
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
      lastSplitFactor: defaultKeyStatistics?.lastSplitFactor || '',
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
    console.error(`Błąd pobierania danych finansowych dla ${symbol}:`, error.message);
    res.status(500).json({ error: 'Błąd podczas pobierania danych finansowych' });
  }
});

app.get('/api/instruments/performance', authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || '').trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol) return res.status(400).json({ error: 'Brak symbolu akcji' });

  const symbol = normalizeYahooSymbol(requestedSymbol, exchange);
  try {
    const perf = await calculatePerformance(symbol);
    if (!perf) {
      return res.status(404).json({ error: 'Brak danych o wynikach historycznych' });
    }
    res.json(perf);
  } catch (error) {
    console.error(`Błąd pobierania wyników dla ${symbol}:`, error.message);
    res.status(500).json({ error: 'Błąd pobierania wyników historycznych' });
  }
});

app.get('/api/instruments/quote-details', authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || '').trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol) return res.status(400).json({ error: 'Brak symbolu akcji' });

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
      return res.status(404).json({ error: 'Brak szczegółów notowania' });
    }

    const data = {
      symbol: requestedSymbol,
      currency: quote.currency || 'USD',
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      averageVolume: quote.averageDailyVolume10Day ?? quote.averageDailyVolume3Month ?? 0,
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
    };

    quoteDetailsCache.set(cacheKey, { timestamp: now, data });
    res.json(data);
  } catch (error) {
    console.error(`Błąd pobierania szczegółów notowania dla ${symbol}:`, error.message);
    res.status(500).json({ error: 'Błąd pobierania szczegółów notowania' });
  }
});

app.get('/api/quote', authenticateToken, async (req, res) => {
  const requestedSymbol = String(req.query.symbol || '').trim();
  const exchange = req.query.exchange;
  if (!requestedSymbol) return res.status(400).json({ error: 'Brak symbolu' });

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
    res.status(500).json({ error: 'Błąd notowania' });
  }
});



app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend działa pod adresem http://${localAddress}:${PORT}`);
  console.log(`Adres zapisano w pliku ${serverAddressFile}`);
});