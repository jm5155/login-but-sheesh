const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Render sits behind a proxy; needed for secure cookies to work correctly
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'simple-pos-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    secure: true,        // required for cross-site cookies (Vercel <-> Render)
    sameSite: 'none'     // required for cross-site cookies
  }
}));

// ---------- MongoDB user model ----------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

app.get('/', (req, res) => {
  res.json({ message: 'Simple POS API is running.' });
});

// ---------- auth routes ----------
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ username: username.toLowerCase(), password: hashed });

    res.json({ success: true, message: 'Account created. Please log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: (username || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.userId = user._id.toString();
    req.session.username = user.username;
    res.json({ success: true, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ username: req.session.username });
});

// ---------- simple POS product data ----------
const PRODUCTS = [
  { id: 1, name: 'Espresso', price: 95 },
  { id: 2, name: 'Latte', price: 120 },
  { id: 3, name: 'Cappuccino', price: 115 },
  { id: 4, name: 'Iced Tea', price: 85 },
  { id: 5, name: 'Croissant', price: 90 },
  { id: 6, name: 'Sandwich', price: 150 },
  { id: 7, name: 'Muffin', price: 75 },
  { id: 8, name: 'Bottled Water', price: 40 }
];

app.get('/api/products', requireAuth, (req, res) => {
  res.json(PRODUCTS);
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
  });
