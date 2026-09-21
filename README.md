# Simple POS (Login + Register + POS + Logout)

## Structure
```
backend/
  package.json
  server.js
frontend/
  index.html      (login/register)
  dashboard.html  (POS screen)
  style.css
  app.js
```

## Run it
```bash
cd backend
npm install
npm start
```
Then open **http://localhost:3000** in your browser. The backend serves the frontend directly, so you don't need a separate server for the HTML files.

## How it works
- Register a username/password → stored (hashed) in `backend/users.json`, created automatically on first signup.
- Log in → creates a session cookie.
- Dashboard is a simple POS: click products to add to cart, adjust quantity with +/−, checkout shows the total.
- Logout clears the session and returns you to the login page.

## Notes
- Products are hard-coded in `server.js` (`PRODUCTS` array) — edit that list to change the menu.
- Styling is black & white minimalist with yellow/teal accent highlights, in `style.css`.
