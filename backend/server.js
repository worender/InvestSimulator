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

fs.writeFileSync(
  serverAddressFile,
  `${JSON.stringify({ host: localAddress, port: PORT, url: `http://${localAddress}:${PORT}` }, null, 2)}\n`,
);

// MEMORY CACHE
const stockCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

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

// GET /api/candles?symbol=PKO
// GET /api/candles?symbol=CDR&interval=1h&days=7
// GET /api/candles?symbol=KGH&interval=15m&days=2
app.get('/api/candles', authenticateToken, async (req, res) => {
  let symbol = req.query.symbol;
  let interval = req.query.interval ? req.query.interval : '1d';
  let days = req.query.days ? req.query.days : 30;
  if (!symbol) return res.status(400).json({ error: 'Brak symbolu akcji' });

  symbol = symbol.toUpperCase();
  if (!symbol.includes('.')) {
    symbol = `${symbol}.WA`; // Domyślnie GPW
  }

  
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

// Finnhub API endpoint to get stock quote
// app.get('/api/quote', authenticateToken, async (req, res) => {
//   const symbol = req.query.symbol;
//   try {
//     const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
//     res.json({ currentPrice: response.data.c, changePercent: response.data.dp });
    
//   } catch (error) {
//     if (error.response) {
      
//       console.log('Błąd API Finnhub:', error.response.status, error.response.data);
//     } else {
//       console.log('Inny błąd serwera:', error.message);
//     }
//     res.status(500).json({ error: 'Błąd serwera' });
//   }
// });



app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend działa pod adresem http://${localAddress}:${PORT}`);
  console.log(`Adres zapisano w pliku ${serverAddressFile}`);
});