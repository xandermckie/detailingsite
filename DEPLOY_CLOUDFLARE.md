# Deploy on Cloudflare Pages — Complete Guide

## Important: Cloudflare Pages Limitations

Cloudflare Pages is a **static hosting service**. It cannot run Node.js server code directly. You have two options:

### Option A: Pages (Frontend) + Railway (Backend) — RECOMMENDED ⭐
- Static site on Cloudflare Pages (HTML/CSS/JS)
- Node.js backend on Railway
- Best of both worlds: free Pages + secure backend
- **Setup time: 10 minutes**

### Option B: Pages + Cloudflare Workers (Advanced)
- Rewrite backend as Cloudflare Workers functions
- Everything on Cloudflare
- More complex, but 100% Cloudflare
- **Setup time: 30 minutes**

## Option A: Cloudflare Pages + Railway Backend (Recommended)

This is the easiest approach. Your frontend lives on Cloudflare, backend on Railway.

### Step 1: Prepare for Cloudflare Pages

The `public/` folder contains your entire website. Cloudflare Pages will serve these static files.

Update `public/index.html` API calls to point to your backend:

**Find this line (around line 1100):**
```javascript
const API_BASE = window.location.origin + '/api';
```

**Change it to:**
```javascript
const API_BASE = 'https://your-railway-app.up.railway.app/api';
// Or your custom domain: 'https://detailing-api.yoursite.com/api'
```

**Save the file.**

### Step 2: Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Click "Sign Up" (free tier is fine)
3. Enter email and password
4. Verify email

### Step 3: Connect Your Domain to Cloudflare

1. In Cloudflare dashboard, click "Add a site"
2. Enter your domain (e.g., `detailing.yoursite.com`)
3. Select **Free plan**
4. Cloudflare will show you nameservers to add
5. Go to your domain registrar (GoDaddy, Namecheap, etc.)
6. Update nameservers to Cloudflare's
7. Wait 24-48 hours for propagation (usually faster)

**Alternative:** If you don't have a domain yet, Cloudflare Pages can also deploy to `yourproject.pages.dev` subdomain (free).

### Step 4: Push Code to GitHub

```bash
cd detailing-site
git add .
git commit -m "Ready for Cloudflare Pages deployment"
git push origin main
```

### Step 5: Deploy to Cloudflare Pages

1. In Cloudflare dashboard, go to "Workers & Pages"
2. Click "Pages" → "Create application"
3. Choose "Connect to Git"
4. Authorize GitHub
5. Select your `detailing-site` repository
6. Click "Begin setup"

**Build Configuration:**
- **Framework preset:** None (we have static HTML)
- **Build command:** (leave empty)
- **Build output directory:** `public`

Click "Save and Deploy"

### Step 6: Wait for Deployment

Cloudflare deploys in 1-2 minutes. You'll see a green checkmark when done.

Your site is now live at: `https://your-project.pages.dev` or your custom domain.

### Step 7: Set Up Custom Domain (Optional)

If you added nameservers in Step 3:

1. In Pages deployment, click "Custom domain"
2. Enter your domain (e.g., `detailing.yoursite.com`)
3. SSL automatically configured
4. Done!

### Step 8: Deploy Backend Separately

Keep your Node.js backend on Railway (from earlier):

1. Already deployed? Great! You're done.
2. Not yet? Follow QUICKSTART.md to deploy to Railway.

**Your backend URL is:** `https://your-railway-app.up.railway.app` (or custom domain if you set one up)

**This is what you put in `API_BASE` in Step 1.**

### Step 9: Test End-to-End

1. Open your Cloudflare Pages site
2. Go to booking page
3. Fill out form
4. Submit
5. Should show success message
6. Check your Railway logs to verify booking was received

**If form doesn't submit:**
- Check browser console (F12)
- Verify API_BASE URL is correct
- Verify your Railway backend is running
- Check CORS settings (backend allows your Cloudflare domain)

### Step 10: Enable Auto-Deploys

1. In Cloudflare Pages, go to "Settings"
2. "Build & deployments"
3. Auto-deploy is enabled by default
4. Now every `git push` auto-deploys!

## Option B: Cloudflare Pages + Workers (Advanced)

Use this if you want everything on Cloudflare, no external services needed.

### Overview

- Frontend on Cloudflare Pages (static files)
- Backend on Cloudflare Workers (serverless functions)
- Database on D1 (Cloudflare's SQLite)
- Everything edge-cached and fast

**Pros:** Single provider, edge computing, very fast
**Cons:** Requires rewriting backend code, more complex

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Initialize Workers Project

```bash
# Create new Workers project
wrangler init detailing-api

# Choose "Yes" for TypeScript (or No for JavaScript)
# Choose "Yes" to create a Worker service
```

### Step 3: Rewrite Backend for Workers

Create `src/worker.ts` (Cloudflare Worker version of `server.js`):

```typescript
import { Router } from 'itty-router';
import { json } from 'itty-router';

const router = Router();

// Middleware
router.all('*', (req) => {
  // Add CORS headers
  const origin = req.headers.get('origin') || '*';
  req.headers.set('Access-Control-Allow-Origin', origin);
  req.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  req.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
});

// Health check
router.get('/api/health', () => {
  return json({ status: 'ok' });
});

// POST booking
router.post('/api/bookings', async (req) => {
  try {
    const data = await req.json();
    
    // Validate input
    if (!data.firstName || !data.email) {
      return json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }
    
    // TODO: Add encryption and database storage
    // For now, just acknowledge receipt
    
    return json({
      success: true,
      message: 'Booking received',
      bookingId: crypto.randomUUID()
    }, { status: 201 });
  } catch (error) {
    return json({ success: false, message: error.message }, { status: 500 });
  }
});

// 404 handler
router.all('*', () => {
  return json({ success: false, message: 'Not found' }, { status: 404 });
});

export default {
  fetch: router.handle
};
```

### Step 4: Update wrangler.toml

```toml
name = "detailing-api"
main = "src/worker.ts"
compatibility_date = "2025-06-08"

# CORS settings
[env.production]
routes = [
  { pattern = "api.detailing.yoursite.com/*", zone_name = "yoursite.com" }
]

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "bookings"
database_id = "your-database-id"
```

### Step 5: Create D1 Database

```bash
# Create SQLite database on D1
wrangler d1 create bookings

# Copy the database_id to wrangler.toml
```

### Step 6: Deploy Worker

```bash
wrangler deploy
```

Your API will be at: `https://detailing-api.yoursite.com`

### Step 7: Deploy Frontend to Pages

Same as Option A:
1. Update API_BASE in HTML
2. Push to GitHub
3. Create Pages project
4. Select `public` as build directory

### Step 8: Configure CORS

In Worker, update CORS to allow your Pages domain:

```typescript
const origin = req.headers.get('origin');
const allowedOrigins = [
  'https://detailing.yoursite.com',
  'https://your-project.pages.dev'
];

if (allowedOrigins.includes(origin)) {
  req.headers.set('Access-Control-Allow-Origin', origin);
}
```

### Challenges with Option B

**Encryption:** Workers support Web Crypto API, not Node.js crypto directly
```javascript
// Use Web Crypto instead of Node.js crypto
const key = await crypto.subtle.importKey(
  'raw',
  keyMaterial,
  'AES-GCM',
  false,
  ['encrypt', 'decrypt']
);
```

**Database:** D1 SQLite API is different from Node.js sqlite3
```typescript
// D1 uses Promises instead of callbacks
const result = await env.DB.prepare(
  'INSERT INTO bookings (id, email) VALUES (?, ?)'
).bind(uuid, email).run();
```

**Rate Limiting:** Use Cloudflare Analytics or Durable Objects
```typescript
// Simple rate limiting with Durable Objects
const ns = env.RATE_LIMITER.idFromName(ip);
const obj = env.RATE_LIMITER.get(ns);
```

## Comparison: Which Option?

### Choose Option A (Pages + Railway) if:
- ✅ You want the simplest setup
- ✅ You're comfortable with Railway backend
- ✅ You want minimal code changes
- ✅ You like familiar Node.js stack
- ✅ **Time to launch: 10 minutes**

### Choose Option B (Pages + Workers) if:
- ✅ You want everything on Cloudflare
- ✅ You want edge computing benefits
- ✅ You're okay with more complexity
- ✅ You want to use D1 database
- ✅ **Time to launch: 1-2 hours**

## Troubleshooting Option A

### Site loads but form won't submit

**Problem:** API_BASE points to wrong backend URL

**Fix:**
1. Check `public/index.html` line ~1100
2. Verify API_BASE is correct Railway/custom domain URL
3. Re-push to GitHub
4. Cloudflare auto-deploys (1-2 min)

### CORS error in browser console

**Problem:** Backend doesn't allow Cloudflare domain

**Fix:**
1. Update `.env` on Railway:
   ```
   SITE_URL=https://your-project.pages.dev
   ```
   Or:
   ```
   SITE_URL=https://detailing.yoursite.com
   ```
2. Restart Railway deployment

### Page loads slow

**Problem:** Might be CORS preflight requests

**Fix:**
1. In Cloudflare Pages settings, enable "Caching"
2. Set cache to 1 day for static files
3. Or move API to same domain (requires different setup)

## Troubleshooting Option B

### Worker not responding

```bash
# Check deployment status
wrangler deployments list

# View logs
wrangler tail

# Redeploy
wrangler deploy
```

### Database errors

```bash
# Check D1 schema
wrangler d1 execute bookings --command "SELECT * FROM bookings LIMIT 1;"

# Debug in Worker:
console.log(JSON.stringify(result, null, 2));
```

### CORS still failing

Add to worker response:
```typescript
const headers = new Headers({
  'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
});
return new Response(body, { headers });
```

## Cloudflare Pages Limits & Features

### Free Tier Includes:
- ✅ Unlimited deployments
- ✅ Unlimited bandwidth
- ✅ Custom domains
- ✅ Automatic SSL/TLS
- ✅ Git integration
- ✅ Automatic deploy on push
- ✅ Preview deployments for PRs

### Limitations:
- Static files only (no Node.js)
- Max file size: 25 MB per file
- Build timeout: 15 minutes
- No backend computation

## Performance & Caching

### Enable Caching (Option A)

In Cloudflare dashboard:
1. Go to "Caching" → "Cache Rules"
2. Create rule:
   - **Eligible for cache:** Path matches `/public/*`
   - **Cache TTL:** 1 day (86400 seconds)
3. Save

This caches your HTML, CSS, JS files across Cloudflare's global network.

### API Caching

For booking form API calls (not recommended to cache):
```javascript
// Don't cache - each form submission is unique
const response = await fetch(`${API_BASE}/bookings`, {
  method: 'POST',
  cache: 'no-store', // Disable caching
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

## SSL/TLS Certificate

Cloudflare automatically provides free SSL/TLS:

### Verify HTTPS Works
1. Visit `https://detailing.yoursite.com`
2. Should show padlock icon
3. No warning messages

### SSL/TLS Settings
In Cloudflare dashboard:
1. SSL/TLS → Overview
2. Mode: "Flexible" (minimum) or "Full" (recommended)
3. Auto Minify: Enable (smaller files = faster)
4. Brotli: Enable (better compression)

## CDN Benefits

With Cloudflare Pages, your site is automatically:

✅ **Cached globally** - Users get files from nearest edge location
✅ **Minified** - CSS and JS automatically compressed
✅ **Gzip compressed** - Smaller download sizes
✅ **DDoS protected** - Cloudflare blocks attacks
✅ **Bot-protected** - Can enable Bot Fight Mode

## Analytics

View traffic in Cloudflare dashboard:

1. Analytics → Traffic
2. See:
   - Page views
   - Unique visitors
   - Cache hit rate
   - Request sources (country, etc.)

## Rollback / Rollforward

### Revert to Previous Deployment

1. Pages → Deployments
2. See list of all deployments
3. Click "View" on previous version to preview
4. Click "Revert to this deployment"

Done! Instantly reverts without git changes.

## Continuous Deployment

Every time you push to main:
```bash
git add .
git commit -m "Update booking form"
git push origin main
# Cloudflare deploys automatically (1-2 min)
```

## Next Steps

### For Option A (Recommended):
1. Update API_BASE in `public/index.html`
2. Create Cloudflare account
3. Add domain to Cloudflare
4. Create Pages project
5. Deploy!

### For Option B (Advanced):
1. Install Wrangler: `npm install -g wrangler`
2. Create worker project: `wrangler init`
3. Rewrite backend as Worker
4. Create D1 database: `wrangler d1 create bookings`
5. Deploy: `wrangler deploy`
6. Deploy frontend to Pages

## Support

**Cloudflare Pages Issues:**
- Docs: https://developers.cloudflare.com/pages/
- Community: https://community.cloudflare.com/

**Cloudflare Workers Issues:**
- Docs: https://developers.cloudflare.com/workers/
- Examples: https://github.com/cloudflare/workers-examples

---

**Recommended: Start with Option A.**
It's simpler, faster to set up, and gives you a solid foundation. You can always move to Option B later if you need everything on Cloudflare.

Questions? See QUICKSTART.md or README.md for general deployment help.
