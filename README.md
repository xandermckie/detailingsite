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
  "service": "dropoff",
  "date": "2025-06-14",
  "time": "10:00 AM",
  "notes": "Car has some interior stains"
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

### GET `/api/bookings/:bookingId/details`
Get full booking details (encrypted fields decrypted). **Admin only** — requires `X-API-Key` header.

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

## Next Steps

1. **Add email notifications** - Integrate with Gmail/SendGrid to notify when bookings are received
2. **Admin dashboard** - Build a dashboard to view and manage bookings
3. **Payment processing** - If needed later, add Stripe integration
4. **SMS confirmations** - Send SMS confirmations via Twilio
5. **Image uploads** - Add before/after photo uploads to database

## Support

For issues or questions, contact xandermckie@gmail.com
