const API_BASE = 'https://login-but-sheesh.onrender.com';

// ---------- AUTH PAGE LOGIC ----------
const tabBtns = document.querySelectorAll('.tab-btn');
if (tabBtns.length) {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
    });
  });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const msg = document.getElementById('login-msg');
    msg.textContent = '';
    msg.className = 'msg';

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        msg.textContent = data.error || 'Login failed';
        msg.classList.add('error');
        return;
      }
      window.location.href = 'dashboard.html';
    } catch (err) {
      msg.textContent = 'Could not reach server';
      msg.classList.add('error');
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const msg = document.getElementById('register-msg');
    msg.textContent = '';
    msg.className = 'msg';

    if (password !== confirm) {
      msg.textContent = 'Passwords do not match';
      msg.classList.add('error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        msg.textContent = data.error || 'Registration failed';
        msg.classList.add('error');
        return;
      }
      msg.textContent = 'Account created! You can log in now.';
      msg.classList.add('success');
      registerForm.reset();
      setTimeout(() => document.querySelector('[data-tab="login"]').click(), 900);
    } catch (err) {
      msg.textContent = 'Could not reach server';
      msg.classList.add('error');
    }
  });
}

// ---------- POS PAGE LOGIC ----------
const productGrid = document.getElementById('product-grid');
if (productGrid) {
  let cart = []; // { id, name, price, qty }

  async function init() {
    // check auth
    try {
      const meRes = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
      if (!meRes.ok) {
        window.location.href = 'index.html';
        return;
      }
      const me = await meRes.json();
      document.getElementById('welcome-user').textContent = `Hi, ${me.username}`;
    } catch {
      window.location.href = 'index.html';
      return;
    }

    // load products
    const res = await fetch(`${API_BASE}/api/products`, { credentials: 'include' });
    const products = await res.json();
    renderProducts(products);
  }

  function renderProducts(products) {
    productGrid.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="p-name">${p.name}</div>
        <div class="p-price">₱${p.price.toFixed(2)}</div>
      `;
      card.addEventListener('click', () => addToCart(p));
      productGrid.appendChild(card);
    });
  }

  function addToCart(product) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    renderCart();
  }

  function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    renderCart();
  }

  function renderCart() {
    const cartItemsEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cart.length === 0) {
      cartItemsEl.innerHTML = '<p class="empty-cart">No items yet — tap a product to add it.</p>';
      checkoutBtn.disabled = true;
    } else {
      cartItemsEl.innerHTML = '';
      cart.forEach(item => {
        const line = document.createElement('div');
        line.className = 'cart-line';
        line.innerHTML = `
          <div>
            <div class="line-name">${item.name}</div>
            <div class="line-qty">₱${item.price.toFixed(2)} each</div>
          </div>
          <div class="line-controls">
            <button class="qty-btn" data-action="minus">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-action="plus">+</button>
          </div>
          <div class="line-price">₱${(item.price * item.qty).toFixed(2)}</div>
        `;
        line.querySelector('[data-action="minus"]').addEventListener('click', () => changeQty(item.id, -1));
        line.querySelector('[data-action="plus"]').addEventListener('click', () => changeQty(item.id, 1));
        cartItemsEl.appendChild(line);
      });
      checkoutBtn.disabled = false;
    }

    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    totalEl.textContent = `₱${total.toFixed(2)}`;
  }

  document.getElementById('clear-btn').addEventListener('click', () => {
    cart = [];
    renderCart();
  });

  document.getElementById('checkout-btn').addEventListener('click', async () => {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items, total })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Order failed to save.');
        return;
      }

      alert(`Order complete! Total: ₱${total.toFixed(2)}`);
      cart = [];
      renderCart();
    } catch (err) {
      alert('Unable to reach the server. Order not saved.');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = 'index.html';
  });

  init();
}
