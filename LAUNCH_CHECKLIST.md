# Launch Checklist

Complete this checklist before going live.

## Pre-Launch (Do This First)

### Generate Security Keys
- [ ] Generate ENCRYPTION_KEY: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Copy 64-character result
  - Save in secure location (password manager, etc.)

- [ ] Generate ADMIN_API_KEY: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
  - Copy 32-character result
  - Save securely

### Setup Local Environment
- [ ] Create `.env` file from `.env.example`
- [ ] Add ENCRYPTION_KEY
- [ ] Add ADMIN_API_KEY
- [ ] Set NODE_ENV=development for testing
- [ ] Add your domain to SITE_URL

### Test Locally
- [ ] Run `npm install`
- [ ] Run `npm start`
- [ ] Open http://localhost:3000
- [ ] Verify homepage loads
- [ ] Verify all pages load (home, services, gallery, about, booking, privacy)
- [ ] Run `npm test` — all tests pass
- [ ] Test theme toggle (dark/light mode)
- [ ] Test navigation links
- [ ] Test booking form:
  - [ ] Calendar displays
  - [ ] Can select weekend date
  - [ ] Can select time slot
  - [ ] Form validates empty fields
  - [ ] Form validates email format
  - [ ] Form validates phone format
  - [ ] Form submits successfully
  - [ ] Success message displays
- [ ] Check browser console for errors (should be clean)
- [ ] Check server logs for errors (should be clean)

### Prepare Deployment
- [ ] Initialize git: `git init`
- [ ] Create GitHub repository
- [ ] Commit all files: `git add . && git commit -m "Initial commit"`
- [ ] Push to GitHub: `git push origin main`
- [ ] Verify .gitignore excludes:
  - [ ] `.env` file
  - [ ] `node_modules/` folder
  - [ ] `data/` folder (database)

## Deployment (Railway Recommended)

### Create Railway App
- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign up with GitHub
- [ ] Create New Project
- [ ] Select "Deploy from GitHub repo"
- [ ] Authorize and select your repository
- [ ] Click "Deploy Now"

### Configure Environment Variables (Railway)
- [ ] Wait for initial build to complete
- [ ] Go to "Variables" tab
- [ ] Add `NODE_ENV=production`
- [ ] Add `ENCRYPTION_KEY=[your 64-char key]`
- [ ] Add `ADMIN_API_KEY=[your 32-char key]`
- [ ] Add `DATABASE_PATH=/tmp/bookings.db` (or use Railway Postgres)
- [ ] Railway will auto-generate `SITE_URL` — copy it
- [ ] Add that `SITE_URL` to variables
- [ ] Save variables

### Wait for Deployment
- [ ] Go to "Deployments" tab
- [ ] Wait for build to show green ✓
- [ ] Click "View" to open live site

### Test Live Deployment
- [ ] Open your Railway URL in browser
- [ ] Verify homepage loads
- [ ] Test all pages load
- [ ] Test booking form submits
- [ ] Check for errors in Railway logs

### Setup Custom Domain (Optional)
- [ ] Buy domain (GoDaddy, Namecheap, etc.)
- [ ] In Railway: Settings → Domains
- [ ] Add your domain
- [ ] Update DNS records (Railway provides instructions)
- [ ] Wait for SSL certificate (usually 1-2 minutes)
- [ ] Test site at custom domain

## Security Verification

### Check Headers
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Reload page
- [ ] Click any request
- [ ] Check Response Headers include:
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: deny`
  - [ ] `Strict-Transport-Security` (production only)
  - [ ] `Content-Security-Policy`

### Test Input Validation
- [ ] Try submitting form with:
  - [ ] Empty fields → Should show error
  - [ ] Invalid email → Should show error
  - [ ] Invalid phone → Should show error
  - [ ] Past date → Should be disabled
  - [ ] Weekday → Should be disabled
  - [ ] Special characters → Should be rejected
- [ ] Try API with bad data: Should return 400 validation error

### Test Rate Limiting
- [ ] Make 31 requests quickly to same endpoint
- [ ] Request #31 should return 429 (Too Many Requests)
- [ ] After 1 minute, should work again

### Verify HTTPS
- [ ] Check URL starts with `https://` (lock icon in browser)
- [ ] Should NOT have warning about certificate
- [ ] HTTP should redirect to HTTPS (test with curl or browser)

## Post-Launch

### Monitor First Week
- [ ] Check logs daily for errors
- [ ] Monitor success rate of bookings
- [ ] Respond to booking requests within 24 hours
- [ ] Note any issues for later improvements

### Setup Email Notifications (Recommended)
- [ ] Decide on email service (Gmail, SendGrid, etc.)
- [ ] Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `OWNER_EMAIL` on Railway
- [ ] Submit a test booking and verify owner + customer emails arrive
- [ ] Confirm status-change emails work when confirming via admin dashboard

### Test Admin Dashboard
- [ ] Visit `https://your-site.com/admin.html` (or Railway URL + `/admin.html`)
- [ ] Sign in with `ADMIN_API_KEY`
- [ ] Verify bookings list loads for current month
- [ ] Confirm a booking, then cancel a test booking
- [ ] Export a booking as JSON
- [ ] Test API directly:
```bash
curl -X GET \
  https://your-api.up.railway.app/api/admin/bookings/{some-uuid}/details \
  -H "X-API-Key: your_admin_api_key"
```
- [ ] Should return decrypted customer info
- [ ] Check audit log shows access recorded

### Test Privacy & Consent
- [ ] Visit `#privacy` on the site — privacy policy loads
- [ ] Booking form requires privacy consent checkbox
- [ ] Footer links to privacy policy

### Database Backup (Important!)
- [ ] Railway: Enable database backups in settings
- [ ] Or manually backup before each major change:
```bash
# Download database
railway run sqlite3 data/bookings.db ".dump" > backup.sql
```

## Ongoing Maintenance

### Weekly
- [ ] Check server logs for errors
- [ ] Review new bookings
- [ ] Respond to customers within 24 hours

### Monthly
- [ ] Run `npm audit` to check for vulnerabilities
  ```bash
  npm audit
  ```
- [ ] Review audit logs for unusual access
- [ ] Check for error patterns

### Quarterly
- [ ] Update dependencies:
  ```bash
  npm update
  npm audit fix
  ```
- [ ] Review server performance
- [ ] Check encryption key rotation schedule

### Semi-Annually (Every 6 Months)
- [ ] Rotate ENCRYPTION_KEY:
  1. Generate new key
  2. Update in Railway/Heroku
  3. Restart app
  
- [ ] Rotate ADMIN_API_KEY:
  1. Generate new key
  2. Update in environment
  3. Test access still works

## Before Adding Features

Ask yourself:
- [ ] Will this handle user data? → Encrypt it
- [ ] Will this query database? → Use parameterized queries
- [ ] Will this accept user input? → Validate it
- [ ] Is this a new API endpoint? → Add rate limiting
- [ ] Does this store secrets? → Use environment variables

## Troubleshooting

### Form Won't Submit
1. [ ] Check browser console for errors (F12 → Console)
2. [ ] Verify backend is running
3. [ ] Check `SITE_URL` in .env matches your domain
4. [ ] Check network tab in DevTools (F12 → Network)
5. [ ] Look for 400/500 errors in response

### Database Locked
1. [ ] Check if another process is using database
2. [ ] Restart server: `npm start`
3. [ ] For production: Upgrade to PostgreSQL

### High Response Times
1. [ ] Check Railway metrics
2. [ ] May need to upgrade Railway plan
3. [ ] Or move database to separate service

### Can't Access Admin API
1. [ ] Verify `X-API-Key` header is correct
2. [ ] Verify booking ID (UUID) is correct
3. [ ] Check admin API key in environment variables

## Red Flags (Stop and Fix)

If you see these, DO NOT launch:

- [ ] Tests fail locally: `npm start` doesn't work
- [ ] Environment variable missing: "ENCRYPTION_KEY required"
- [ ] Database errors: "Cannot read property 'run'"
- [ ] API returning 500 errors consistently
- [ ] Sensitive data in logs (names, emails, phones)
- [ ] Form doesn't submit
- [ ] Security headers missing

## Success Criteria

Your site is ready to launch when:

✅ Homepage loads at your domain
✅ Form displays on booking page
✅ Calendar works (weekends only)
✅ Form submits successfully
✅ Success message displays
✅ No errors in logs
✅ HTTPS active (lock icon)
✅ All security headers present
✅ Can access admin API with API key
✅ Database stores encrypted data

## Launch!

When all checks pass:

1. [ ] Tell Aaron & Xander it's live!
2. [ ] Share the domain
3. [ ] Start taking bookings
4. [ ] Respond within 24 hours
5. [ ] Monitor logs for first week

---

**Questions during launch?**
Check these in order:
1. QUICKSTART.md (5-min guide)
2. README.md (full documentation)
3. SECURITY.md (security questions)
4. DEPLOYMENT.md (deploy issues)

**Still stuck?** Contact: xandermckie@gmail.com

---

🚀 You're all set! Your secure detailing booking system is ready to go live.
