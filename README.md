# Aaroham treasures: full-stack luxury e-commerce

Next.js 14 (frontend) · Node.js + Express (backend) · MongoDB (database)

## What is included

**Customers**
- Sign up / log in with **email + password** or **Google**
- Browse, search, filter by category and price, sort
- Product page with image gallery, stock info, discount badge
- Shopping bag (saved to the database, so it follows the user across devices)
- **Wishlist** (heart on every product)
- **Addresses**: add, edit, delete, set default, and **pin current location** (GPS lat/lng)
- Checkout with **Cash on delivery** or **online payment (Razorpay)**
- **Order tracking** timeline: Placed → Confirmed → Packed → Shipped → Out for delivery → Delivered, with courier and tracking number
- Profile page: order history, order summary stats, addresses, account details, change password
- Cancel an order before it ships

**Admin**
- Dashboard: revenue, orders, customers, 14-day sales chart, latest orders, low-stock alerts
- Products: add, edit, delete, hide, upload multiple images, edit price and stock right in the table
- Orders: search and filter, update status, add courier / tracking / customer notes, view pinned delivery location on Google Maps
- **Export order summary to Excel (.xlsx) or CSV** (follows your filters; Excel has a second "Summary" sheet)
- Customers and admins: search, view each customer's orders, change role, block / unblock, **create more admin profiles**
- **Store look and feel**: change main / accent / background colours (with presets), store name, tagline, announcement bar, hero text and hero image, shipping fee and free-shipping limit. Changes re-theme the whole site.

**Security**
- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** verified on every protected route (`Authorization: Bearer <token>`), with an admin-only middleware
- **CORS** limited to your frontend URL(s)
- `helmet` headers, rate limiting on auth routes, input checks
- Prices and totals are **always calculated on the server** from the database, never trusted from the browser
- Razorpay payments are confirmed with an **HMAC signature check** on the server

---

## 1. Requirements
- Node.js 18+ (20 recommended)
- MongoDB running locally, or a free MongoDB Atlas cluster

## 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env        # then open .env and fill in the values
npm run seed                # creates the admin user + 12 sample products
npm run dev                 # API on http://localhost:5000
```
Generate a strong `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Default admin (from `.env`): `admin@luxe.com` / `Admin@12345`. **Change it.**

## 3. Frontend setup
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in the values
npm run dev                        # site on http://localhost:3000
```

## 4. Google login (about 5 minutes)
1. Open https://console.cloud.google.com → create a project.
2. **APIs & Services → OAuth consent screen**: choose External, fill in the app name and your email, save.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. Under **Authorised JavaScript origins** add `http://localhost:3000` (and your real domain when you deploy).
5. Copy the **Client ID** into:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...`
   - `frontend/.env.local` → `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...` (same value)

How it works: the browser gets a Google ID token, sends it to `POST /api/auth/google`, the backend verifies it with Google, creates or finds the user, and returns our own JWT.

*Facebook / other social logins:* the same pattern applies. Verify the provider's token on the backend, find or create the user, return the JWT. Ask if you want this added.

## 5. Online payments (Razorpay)
1. Create an account at https://razorpay.com and copy the **Test mode** Key ID and Key Secret.
2. Put them in `backend/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
3. Restart the backend.

If these are empty and `NODE_ENV` is not `production`, checkout shows a **demo payment** prompt so you can test the whole flow without keys. In production, the demo path is disabled.

Flow: server creates the order, then a Razorpay order, the browser opens Razorpay Checkout, and on success the browser sends the payment id and signature to `POST /api/orders/:id/verify-payment`, which verifies the signature before marking the order paid.

## 6. Folder structure
```
backend/
  server.js            app setup: CORS, helmet, rate limit, routes
  seed.js              creates admin + sample products
  models/              User, Product, Order, Setting
  middleware/          auth (JWT + admin), upload (multer), error
  routes/              auth, products, me, orders, settings, admin
frontend/
  app/                 pages (home, products, cart, checkout, orders, profile, login…)
  app/admin/           dashboard, products, orders, users, settings
  components/          Header, Footer, ProductCard, AddressForm, Modal, Guard…
  context/             Auth, Shop (cart + wishlist), Settings (theme)
  lib/                 api client (adds the JWT), Razorpay helper
```

## 7. API reference
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/google` | public |
| GET | `/api/auth/me` | user |
| GET | `/api/products`, `/api/products/categories`, `/api/products/:id` | public |
| POST/PUT/DELETE | `/api/products`, `/api/products/:id` | admin |
| GET | `/api/products/admin/all` | admin |
| GET/POST/PUT/DELETE | `/api/me/cart`, `/api/me/wishlist`, `/api/me/addresses` | user |
| PUT | `/api/me`, `/api/me/password` | user |
| POST | `/api/orders` | user |
| GET | `/api/orders/mine`, `/api/orders/:id` | user (own) / admin |
| POST | `/api/orders/:id/pay`, `/:id/verify-payment` | user |
| PUT | `/api/orders/:id/cancel` | user |
| GET/PUT | `/api/settings` | public read / admin write |
| GET | `/api/admin/stats`, `/orders`, `/orders/export?format=xlsx\|csv`, `/users` | admin |
| PUT | `/api/admin/orders/:id/status`, `/users/:id` | admin |
| POST | `/api/admin/upload`, `/users` | admin |

## 8. Before you go live
- Set `NODE_ENV=production`, a long random `JWT_SECRET`, real `CLIENT_URL`, and Razorpay **live** keys.
- Change the seeded admin password. Add your production domain to the Google OAuth origins.
- **Images**: uploads are saved to `backend/uploads` on the server disk, which is wiped on most hosts (Render, Railway, Heroku). Move to Cloudinary or S3 for production. Only `middleware/upload.js` needs to change.
- **Sample product images** come from picsum.photos placeholders. Replace them with real photos from Admin → Products.
- Deploy the backend (Render, Railway, a VPS) and the frontend (Vercel). Set `NEXT_PUBLIC_API_URL` to the deployed API.
- Serve everything over HTTPS.

## 9. Known limits and good next steps
- The JWT is kept in `localStorage`. It is simple and works well, but a script injected into the page could read it. For higher security, move it to an `httpOnly` cookie.
- Stock is reserved when an order is created. An online order that is never paid keeps its stock reserved until it is cancelled. Add a scheduled job to auto-cancel unpaid orders after some hours.
- Refunds mark the order "Refunded" but you still trigger the money refund from the Razorpay dashboard (or add `razorpay.payments.refund`).
- Not included yet: forgot-password emails, order confirmation emails, product reviews, coupons, product variants (size / colour), GST invoices. All are straightforward to add on this structure.
