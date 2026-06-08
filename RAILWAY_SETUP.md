# Railway Backend Setup

Deploy the Express API that powers the booking form on [secondsinc.pages.dev](https://secondsinc.pages.dev/).

## 1. Create the Railway service

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select this repository.
3. Railway uses [`railway.toml`](railway.toml) and [`Procfile`](Procfile) automatically (`node server.js`).

## 2. Add a persistent volume (required)

Without a volume, SQLite bookings are lost on every redeploy.

1. In your Railway service, open **Volumes**.
2. **Add Volume** → mount path: `/app/data`
3. Set env var `DATABASE_PATH=/app/data/bookings.db`

## 3. Generate secrets (run once locally)

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 4. Set environment variables

In Railway → **Variables**:

| Variable | Value |
|----------|-------|
| `ENCRYPTION_KEY` | 64-char hex from step 3 |
| `ADMIN_API_KEY` | 32-char hex from step 3 |
| `NODE_ENV` | `production` |
| `SITE_URL` | `https://secondsinc.pages.dev` |
| `DATABASE_PATH` | `/app/data/bookings.db` |

## 5. Get your public URL

1. Railway → **Settings** → **Networking** → **Generate Domain**
2. Copy the URL (e.g. `https://detailingsite-production-xxxx.up.railway.app`)
3. Update [`public/index.html`](public/index.html):
   - `RAILWAY_API_ORIGIN` constant (search for it near the top of the `<script>` block)
   - CSP `connect-src` in the `<meta>` tag on line 6
4. Commit and push — Cloudflare Pages auto-redeploys.

## 6. Verify

```powershell
curl https://YOUR-APP.up.railway.app/api/health
```

Expected: `{"status":"ok"}`

Then submit a test booking on [secondsinc.pages.dev](https://secondsinc.pages.dev/) and confirm the success message.

## Viewing bookings (admin)

```powershell
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" https://YOUR-APP.up.railway.app/api/bookings/BOOKING_ID/details
```
