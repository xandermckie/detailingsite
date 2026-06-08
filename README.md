# 2 The Xtreme Detailing — Secure Booking System

Production-ready mobile detailing booking platform with enterprise-grade security.

## Features

✅ **Security-First Design**
- AES-256 encryption for all sensitive user data (names, emails, phones, addresses)
- Input validation and sanitization to prevent SQL injection
- Rate limiting to prevent brute force attacks
- CSRF protection headers
- Secure HTTP headers via Helmet
- No sensitive data exposed in logs

✅ **Booking Management**
- Calendar date picker (weekends only)
- Time slot selection (8 AM, 10 AM, 12 PM)
- Form validation on both client and server
- No payment processing (in-person only)
- Audit logging for data access

✅ **Production Ready**
- SQLite database with encrypted fields
- Environment-based configuration
- Graceful error handling
- Proper HTTP status codes
- CORS configuration

## Quick Start

### 1. Clone & Install

```bash
cd detailing-site
npm install
```

### 2. Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — you'll need it for `.env`.

### 3. Create `.env` File

```bash
cp .env.example .env
```

Edit `.env` and add:
- `ENCRYPTION_KEY` - The 64-character hex string from step 2
- `NODE_ENV` - Set to `production` for live, `development` for testing
- `PORT` - Port number (default 3000)
- `SITE_URL` - Your site domain (e.g., `https://detailing.yoursite.com`)
- `ADMIN_API_KEY` - Secret key for admin endpoints (generate another random key)

### 4. Run Locally

**Development with auto-reload:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Visit `http://localhost:3000`

## Deployment to Railway / Heroku

### Railway.app (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Create new project
4. Add these environment variables in Railway:
   - `ENCRYPTION_KEY`
   - `NODE_ENV=production`
   - `ADMIN_API_KEY`
   - `SITE_URL=https://your-app-name.up.railway.app`

Railway auto-deploys on git push.

### Heroku

1. Create account at [heroku.com](https://heroku.com)
2. Install Heroku CLI
3. Run:
   ```bash
   heroku login
   heroku create your-app-name
   heroku config:set ENCRYPTION_KEY=your_key
   heroku config:set ADMIN_API_KEY=your_admin_key
   heroku config:set NODE_ENV=production
   git push heroku main
   ```

## API Endpoints

### POST `/api/bookings`
Create a new booking request.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "vehicle": "2020 Honda Civic",
  "address": "123 Main St, Anytown",
  "service": "mobile",
  "date": "2025-06-14",
  "time": "10:00 AM",
  "notes": "Car has some interior stains",
  "privacyConsent": true
}
```

**Service values:** `mobile` ($175) or `pickup_dropoff` ($200). For `pickup_dropoff`, include `dropoffAddress`.

**Example with pickup & drop-off:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "(555) 987-6543",
  "vehicle": "2018 Ford F-150",
  "address": "123 Main St, Anytown",
  "dropoffAddress": "456 Oak Ave, Anytown",
  "service": "pickup_dropoff",
  "date": "2025-06-15",
  "time": "8:00 AM",
  "privacyConsent": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Booking received. We'll confirm within 24 hours.",
  "bookingId": "uuid-here",
  "date": "2025-06-14",
  "time": "10:00 AM",
  "vehicle": "2020 Honda Civic"
}
```

### GET `/api/bookings/:bookingId`
Get public booking summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vehicle": "2020 Honda Civic",
    "date": "2025-06-14",
    "time": "10:00 AM",
    "status": "pending",
    "created_at": "2025-06-08T10:30:00Z"
  }
}
```

### GET `/api/availability`
Get booked time slots for a calendar month. Query params: `year`, `month` (1–12).

### GET `/api/bookings/:bookingId/details`
Get full booking details (encrypted fields decrypted). **Admin only** — requires `X-API-Key` header.

### Admin endpoints (all require `X-API-Key` header)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/bookings` | List bookings for a month (`year`, `month`, optional `status`) |
| `GET` | `/api/admin/bookings/:id/details` | Decrypted booking details |
| `PATCH` | `/api/admin/bookings/:id` | Update status (`confirmed`, `cancelled`, `completed`) |
| `DELETE` | `/api/admin/bookings/:id` | GDPR deletion |
| `GET` | `/api/admin/bookings/:id/export` | Export decrypted booking as JSON |

### Admin dashboard

Visit `/admin.html` on your site (or `http://localhost:3000/admin.html` locally). Sign in with your `ADMIN_API_KEY` to view, confirm, cancel, complete, export, or delete bookings.

## Frontend structure

Static files live in `public/`:
- `index.html` — main SPA (home, services, gallery, about, booking, privacy)
- `admin.html` — admin dashboard
- `js/app.js` — site logic
- `js/admin.js` — admin dashboard logic
- `js/config.js` — Railway API origin for production

## Email notifications

Set these environment variables to enable booking emails:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
OWNER_EMAIL=xandermckie@gmail.com
```

When configured, the server sends:
- Owner alert on new booking
- Customer confirmation receipt
- Status change emails when admin confirms/cancels/completes

## Database

SQLite database at `./data/bookings.db` contains:

**bookings table:**
- `id` - UUID primary key
- `first_name_encrypted` - Encrypted first name
- `last_name_encrypted` - Encrypted last name
- `email_encrypted` - Encrypted email
- `phone_encrypted` - Encrypted phone
- `vehicle` - Vehicle info (not encrypted, needed for scheduling)
- `address_encrypted` - Encrypted address
- `service` - Service type
- `date` - Booking date (YYYY-MM-DD)
- `time` - Booking time
- `notes` - Optional notes
- `status` - pending / confirmed / completed / cancelled
- `consent_at` - GDPR consent timestamp
- `dropoff_address_encrypted` - Encrypted drop-off address (pickup_dropoff service)
- `created_at` - Timestamp
- `updated_at` - Timestamp

**audit_log table:**
- Logs all data access for compliance
- Records IP, action, timestamp

## Security Checklist

- [x] Input validation on all fields
- [x] AES-256 encryption for PII
- [x] No SQL injection vulnerabilities
- [x] Rate limiting (30 req/min per IP)
- [x] CORS restricted to your domain
- [x] Security headers via Helmet
- [x] No sensitive data in logs
- [x] Environment variables for secrets
- [x] Audit logging
- [x] HTTPS enforced in production

## For Admins: Accessing Bookings

To view encrypted customer details:

```bash
curl -X GET \
  https://your-site.com/api/bookings/{bookingId}/details \
  -H "X-API-Key: your_admin_api_key"
```

The API will decrypt and return all customer information.

## Troubleshooting

**"ENCRYPTION_KEY is required"**
- Make sure you created the `.env` file and set `ENCRYPTION_KEY`

**"Database error"**
- Ensure the `data/` directory exists and is writable
- SQLite file will be created automatically

**"Port already in use"**
- Change `PORT` in `.env` or run: `PORT=3001 npm start`

**"Form not submitting"**
- Check browser console for errors
- Ensure `SITE_URL` in `.env` matches your domain
- Verify backend is running

## Testing

```bash
npm test
```

Runs API integration tests against a temporary SQLite database.

## Next Steps

1. **Add gallery photos** — Drop images into `public/photos/` using filenames from the PHOTO_MANIFEST comment in `index.html`
2. **Configure SMTP** — Set `SMTP_*` and `OWNER_EMAIL` on Railway for email notifications
3. **Payment processing** — If needed later, add Stripe integration
4. **SMS confirmations** — Send SMS confirmations via Twilio

## Support

For issues or questions, contact xandermckie@gmail.com
