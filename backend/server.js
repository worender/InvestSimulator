require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json()); 

const JWT_SECRET = process.env.JWT_SECRET;

// 1. Endpoint logowania anonimowego - wymienia ID telefonu na token JWT
app.post('/api/guest', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Brak ID urządzenia' });

  // Token będzie ważny przez 7 dni
  const token = jwt.sign({ deviceId }, JWT_SECRET, { expiresIn: '7d' });
  console.log('Generowanie nowego tokenu JWT:', token);
  res.json({ token });
});

// 2. Strażnik (Middleware) - blokuje dostęp bez ważnego tokenu
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

// 3. Właściwy endpoint giełdowy (chroniony przez strażnika)
app.get('/api/quote', authenticateToken, async (req, res) => {
  const symbol = req.query.symbol;
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
    res.json({ currentPrice: response.data.c, changePercent: response.data.dp });
    
  } catch (error) {
    if (error.response) {
      
      console.log('Błąd API Finnhub:', error.response.status, error.response.data);
    } else {
      console.log('Inny błąd serwera:', error.message);
    }
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.listen(3000, () => console.log('Backend działa na porcie 3000'));