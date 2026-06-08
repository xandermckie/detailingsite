# Deployment Guide

Complete guide to deploying your detailing booking site to production.

## Prerequisites

- Node.js 18+ installed locally
- GitHub account (for Railway/Heroku integration)
- The project files committed to a GitHub repository

## Option 1: Railway.app (Recommended) ⭐

Railway is modern, fast, and makes deployment simple.

### Step 1: Prepare GitHub

1. Create a GitHub repository for your project
2. Push all files:
   ```bash
   git add .
   git commit -m "Initial commit: detailing site with secure booking"
   git push origin main
   ```

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (easier than email)
3. Click "Create New Project"
4. Select "Deploy from GitHub repo"
5. Authorize and select your detailing-site repository
6. Click "Deploy Now"

Railway will auto-detect Node.js and start building.

### Step 3: Set Environment Variables

1. In Railway project dashboard, click "Variables"
2. Add these variables:
   ```
   NODE_ENV=production
   ENCRYPTION_KEY=[Your 64-char hex key - generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
   ADMIN_API_KEY=[Random secret - generate with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"]
   DATABASE_PATH=/tmp/bookings.db
   SITE_URL=https://[your-railway-app-name].up.railway.app
   ```

3. Save variables

### Step 4: Get Your URL

1. In Railway, click "Deployments"
2. Once build is complete (green ✓), click "View"
3. Your app URL will be: `https://[project-name].up.railway.app`
4. Update `SITE_URL` if it's different from auto-generated

### Step 5: Configure Custom Domain (Optional)

1. In Railway, go to "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `detailing.yoursite.com`)
4. Update DNS to point to Railway
5. SSL certificate auto-generated

### Step 6: Test Live

Visit your Railway URL and test:
- [ ] Home page loads
- [ ] Form elements appear
- [ ] Calendar works
- [ ] Can select date/time
- [ ] Form submits successfully
- [ ] Success message appears

### Step 7: Set Up Auto-Deploys

1. In Railway, go to "Settings"
2. Enable "Automatic Deploys" from main branch
3. Now every git push to main auto-deploys

## Option 2: Heroku

Heroku is also reliable but requires a bit more setup.

### Step 1: Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows (via npm)
npm install -g heroku
```

### Step 2: Login to Heroku

```bash
heroku login
```

Opens browser, authorize your Heroku account.

### Step 3: Create Heroku App

```bash
heroku create your-detailing-app
```

Replace with your app name. This creates the app and adds a `heroku` remote to git.

### Step 4: Set Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set ENCRYPTION_KEY="your_64_char_hex_key_here"
heroku config:set ADMIN_API_KEY="your_random_key_here"
heroku config:set SITE_URL="https://your-detailing-app.herokuapp.com"
```

### Step 5: Deploy

```bash
git push heroku main
```

Heroku builds and deploys automatically.

### Step 6: View Logs

```bash
heroku logs --tail
```

### Step 7: Set Up Custom Domain

```bash
heroku domains:add detailing.yoursite.com
```

Update your DNS to point to Heroku's servers. Heroku provides instructions.

## Post-Deployment Checklist

- [ ] Site loads without errors
- [ ] Homepage displays correctly
- [ ] Navigation works
- [ ] Theme toggle works
- [ ] Booking form is present
- [ ] Calendar date picker works
- [ ] Time slots appear
- [ ] Form submits
- [ ] Success message shows
- [ ] Check server logs for errors

## Monitoring

### Railway

1. Go to "Monitoring" tab
2. View CPU, memory, network usage
3. Set up alerts for failures

### Heroku

```bash
heroku metrics
```

## Updating After Deployment

After deployment is set up, updating is simple:

```bash
# Make changes locally
# Test with: npm run dev

# Commit changes
git add .
git commit -m "Update booking form styling"

# Push to GitHub
git push origin main

# Railway: Auto-deploys
# Heroku: Auto-deploys (if set up) or run: git push heroku main
```

## Troubleshooting Deployment

### "Build failed"
Check logs:
```bash
# Heroku
heroku logs --tail

# Railway
# Click Deployments tab and view build output
```

### "App crashes on startup"
Usually missing `ENCRYPTION_KEY`. Verify all environment variables are set.

### "Database errors"
Railway stores files in `/tmp/` which get cleared. Use a proper database:

**Option A: Railway PostgreSQL** (Recommended)
1. In Railway, add a "Postgres" plugin
2. It auto-connects via `DATABASE_URL` env var
3. Update `server.js` to use PostgreSQL instead of SQLite

**Option B: Keep SQLite**
- Set `DATABASE_PATH=/tmp/bookings.db`
- Database resets on deploy
- Fine for testing, not for production data

### "Form won't submit"
Check browser console. Usually:
1. `SITE_URL` env var doesn't match your domain
2. Backend not running
3. Network/CORS error

## Securing Sensitive Data

### Never Commit Secrets

❌ Wrong:
```bash
ENCRYPTION_KEY=abc123...
```

✅ Right:
```bash
# Only in deployed environment variables
# Not in code or .env file in git
```

### Rotate Keys Regularly

Every 3-6 months:
1. Generate new `ENCRYPTION_KEY`
2. Update in Railway/Heroku
3. Old bookings won't decrypt immediately (plan migration if needed)

## Performance Tuning

### Enable Compression
```bash
npm install compression
```

Add to `server.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

### CDN for Static Files
Move `public/` files to Cloudflare Pages or similar for faster delivery.

### Database Optimization
Add indexes for frequent queries:
```sql
CREATE INDEX idx_booking_email ON bookings(email_encrypted);
```

## Scaling

When you get lots of bookings:

1. **Switch to PostgreSQL** - SQLite has limits
2. **Add Redis cache** - For rate limiting, session store
3. **Use worker process** - For email notifications
4. **Separate admin dashboard** - Different app instance

Railway and Heroku both support these upgrades easily.

## Support & Questions

Check logs first:
```bash
# Railway: Deployments tab
# Heroku: heroku logs --tail
```

Common issues usually show in logs with clear error messages.
