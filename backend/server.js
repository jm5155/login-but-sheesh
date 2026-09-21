const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(session({
  secret: 'simple-pos-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hours
}));

// ---------- helpers ----------
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ---------- auth routes ----------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const users = loadUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  users.push({ id: Date.now().toString(), username, password: hashed });
  saveUsers(users);

  res.json({ success: true, message: 'Account created. Please log in.' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());

  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid username or password' });

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, username: user.username });
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
