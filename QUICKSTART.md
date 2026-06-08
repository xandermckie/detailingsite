# Quick Start — Get Your Site Live in 5 Minutes

## Step 1: Generate Your Encryption Key (1 minute)

Open terminal/PowerShell and run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64 characters).

## Step 2: Create .env File (1 minute)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```
ENCRYPTION_KEY=[paste your key from step 1]
ADMIN_API_KEY=[paste another random key from: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"]
NODE_ENV=production
SITE_URL=https://your-domain.com
PORT=3000
```

## Step 3: Test Locally (2 minutes)

```bash
npm install
npm start
```

Visit `http://localhost:3000` and test the form.

## Step 4: Deploy to Railway (1 minute)

1. Push to GitHub:
```bash
git add .
git commit -m "Secure detailing booking system"
git push origin main
```

2. Go to [railway.app](https://railway.app)
3. Login with GitHub
4. Create New Project → Deploy from GitHub → Select your repo
5. Add environment variables from your `.env`:
   - `ENCRYPTION_KEY`
   - `ADMIN_API_KEY`
   - `NODE_ENV=production`
   - `SITE_URL=https://[your-railway-domain].up.railway.app`

**Done!** Railway auto-deploys. Your site goes live in ~2 minutes.

## What's Included

✅ **Security:**
- AES-256 encryption for customer names, emails, phones, addresses
- SQL injection prevention (parameterized queries)
- Input validation on all fields
- Rate limiting (30 req/min per IP)
- Security headers (Helmet)
- Audit logging

✅ **Features:**
- Professional booking form
- Calendar with weekend-only dates
- Time slot selection
- Form validation (client + server)
- Success/error messages
- Responsive design (mobile + desktop)

✅ **Backend:**
- Express.js server
- SQLite database
- Environment-based config
- Ready for production

## File Structure

```
detailing-site/
├── public/
│   └── index.html          # Your website
├── src/
│   ├── database.js         # SQLite setup
│   ├── encryption.js       # AES-256 encryption
│   └── validation.js       # Input validation
├── server.js               # Express app
├── package.json            # Dependencies
├── .env.example            # Template
├── .gitignore              # Git exclusions
├── README.md               # Full documentation
├── SECURITY.md             # Security details
├── DEPLOYMENT.md           # Deploy guide
└── QUICKSTART.md           # This file
```

## Common Tasks

### View Bookings in Database

```bash
# Install sqlite3 CLI
npm install -g sqlite3

# Connect to database
sqlite3 data/bookings.db

# View all bookings (encrypted)
SELECT id, vehicle, date, time, status FROM bookings;

# Exit
.quit
```

### Get Customer Details (Decrypted)

Use admin API:

```bash
curl -X GET \
  https://your-site.com/api/bookings/{booking-id}/details \
  -H "X-API-Key: your_admin_api_key"
```

Returns JSON with decrypted customer info.

### View Server Logs

**Railway:**
1. Go to your Railway project
2. Click "Deployments"
3. Click the deployment
4. View logs

**Heroku:**
```bash
heroku logs --tail
```

### Rotate Encryption Key

Every 6 months:

1. Generate new key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Update environment variable
3. Restart app

Old bookings won't decrypt with new key (plan migration if needed).

## Troubleshooting

### "Form won't submit"
- Check browser console for errors
- Verify `SITE_URL` matches your domain
- Ensure backend is running

### "Database locked"
- Usually SQLite with concurrent access
- Switch to PostgreSQL for production (Railway Plugin)

### "ENCRYPTION_KEY required"
- Make sure `.env` file exists
- Check `ENCRYPTION_KEY` is set
- Restart server

### "Port 3000 in use"
```bash
PORT=3001 npm start
```

## Next Steps

1. **Update Content**
   - Edit `public/index.html` with your information
   - Replace placeholder images with real photos
   - Update service descriptions

2. **Set Up Email Notifications**
   - Install nodemailer: `npm install nodemailer`
   - Add email sending in `/api/bookings` endpoint
   - Notify you when new bookings arrive

3. **Admin Dashboard**
   - Build simple admin page to view bookings
   - Add ability to confirm/cancel bookings
   - Send confirmation emails to customers

4. **Custom Domain**
   - In Railway: Settings → Domains → Add Domain
   - Point DNS to Railway
   - SSL auto-generated

## Security Checklist

Before going live:

- [ ] Generated strong ENCRYPTION_KEY
- [ ] Set unique ADMIN_API_KEY
- [ ] Set NODE_ENV=production
- [ ] Configured SITE_URL for your domain
- [ ] Tested form submission
- [ ] Verified success message appears
- [ ] Checked server logs for errors
- [ ] Reviewed security section in README

## Support

**Full Documentation:** See `README.md`

**Security Questions:** See `SECURITY.md`

**Deployment Help:** See `DEPLOYMENT.md`

**Issues?** Contact: xandermckie@gmail.com

---

**You're all set!** Your secure detailing booking system is ready to go live.
