# Security Implementation Guide

## Overview

This booking system implements enterprise-grade security to protect customer data. All personally identifiable information (PII) is encrypted, and the system is hardened against common web vulnerabilities.

## Security Features

### 1. Data Encryption (AES-256)

**What's Encrypted:**
- First name
- Last name
- Email address
- Phone number
- Street address

**What's NOT Encrypted (by design):**
- Vehicle info (needed for schedule display)
- Booking date/time (needed for scheduling)
- Service type (needed for pricing display)

**How It Works:**
```javascript
// Encryption happens before storage
encryption.encrypt(email) // Returns: "iv_hex:encrypted_hex"

// Decryption only happens on demand with admin API key
encryption.decrypt(email_encrypted) // Returns: "user@example.com"
```

The encryption key is:
- 256-bit (32 bytes)
- Stored only in environment variables
- Never logged or exposed
- Should be rotated every 6 months

### 2. SQL Injection Prevention

**Vulnerability:** Attacker sends malicious SQL in form input
**Example:** `" OR "1"="1` in email field

**Protection:** Parameterized queries (prepared statements)
```javascript
// ✅ SAFE - Parameters separated from SQL
db.run(
  'INSERT INTO bookings (email_encrypted) VALUES (?)',
  [encryption.encrypt(email)]
)

// ❌ UNSAFE - Never do this
db.run(`INSERT INTO bookings VALUES ('${email}')`) // Don't do this!
```

Every database query uses parameterized queries. No string concatenation.

### 3. Input Validation & Sanitization

**Validation Rules:**
- First/Last name: Letters, spaces, hyphens, apostrophes only
- Email: Valid email format (RFC 5322)
- Phone: Digits, spaces, dashes, parentheses, dots, plus only
- Vehicle: Alphanumeric, spaces, commas, dashes, periods
- Address: Alphanumeric, spaces, commas, dashes, periods, hashes
- Notes: Alphanumeric, spaces, punctuation (no SQL/HTML)
- Date: ISO 8601 format + must be future weekend
- Time: Must be one of: 8:00 AM, 10:00 AM, 12:00 PM

**Example Validation:**
```javascript
// First name must match this pattern
body('firstName')
  .trim()
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Invalid characters in first name')

// Email must be valid
body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Invalid email')

// Date must be weekend
body('date')
  .custom((value) => {
    const dayOfWeek = new Date(value).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      throw new Error('Only weekends allowed');
    }
    return true;
  })
```

All validation happens on both client and server. Server validation is authoritative.

### 4. Rate Limiting

**Protection:** Prevents brute force attacks and DoS

**How It Works:**
- Max 30 requests per minute per IP address
- Blocks IPs that exceed limit with HTTP 429 (Too Many Requests)
- In-memory tracking (resets on server restart)

```javascript
// For production, upgrade to Redis-backed rate limiting
// Redis persists across restarts and handles multiple servers
```

### 5. Security Headers

Helmet.js adds HTTP security headers:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Controls what resources can load (prevents XSS) |
| `X-Frame-Options: DENY` | Prevents clickjacking |
| `X-Content-Type-Options: nosniff` | Prevents MIME sniffing |
| `X-XSS-Protection` | Legacy XSS protection |
| `Strict-Transport-Security` | Forces HTTPS (1 year) |
| `Referrer-Policy: no-referrer` | Doesn't leak referrer info |

### 6. CORS Protection

**What is CORS?** Cross-Origin Resource Sharing - controls which websites can access your API.

**Configuration:**
```javascript
// Only your site can make API calls
const corsOptions = {
  origin: 'https://your-site.com',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
};
app.use(cors(corsOptions));
```

**Attack prevented:** Attacker's website can't call your API from user's browser.

### 7. Request Body Size Limits

```javascript
// Prevents memory exhaustion attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
```

Max request size: 1MB (more than enough for form data)

### 8. Parameter Pollution Prevention

```javascript
// Prevents attacker from sending multiple values for same param
// Only allows array params for whitelisted fields
if (Array.isArray(req.body[key]) && !['tags', 'items'].includes(key)) {
  return res.status(400).json({ success: false });
}
```

### 9. Admin API Key Authentication

**Scenario:** You need to view customer details from database

**How to Access:**
```bash
curl -X GET \
  https://your-site.com/api/bookings/uuid-here/details \
  -H "X-API-Key: your_secret_admin_key"
```

**Security:**
- API key only in HTTP headers (not in URL)
- API key is NOT the password (separate from ENCRYPTION_KEY)
- Different key than encryption key (defense in depth)
- Should be rotated every 6 months

**TODO:** Upgrade to JWT tokens or OAuth2 for production.

### 10. Audit Logging

Every admin access is logged:

```sql
-- audit_log table
INSERT INTO audit_log (action, booking_id, admin_ip, timestamp)
VALUES ('BOOKING_DETAILS_VIEWED', 'uuid-123', '192.168.1.1', NOW());
```

This tracks:
- Who accessed what data
- When they accessed it
- From which IP address

Useful for compliance (GDPR, CCPA) and detecting unauthorized access.

### 11. HTTPS Enforcement

**In production:**
- All traffic must use HTTPS (TLS 1.3+)
- Automatic redirect from HTTP to HTTPS
- Strict-Transport-Security header (HSTS) forces browser to use HTTPS

**Helmet configuration:**
```javascript
helmet({
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
})
```

### 12. No Sensitive Data in Logs

✅ Logged:
```
Booking created: ID=uuid-123 Date=2025-06-14 Time=10:00 AM
```

❌ Never logged:
```
Email: user@example.com
Phone: (555) 123-4567
Address: 123 Main St
```

Encrypted fields are never logged in plaintext.

## Compliance Standards

### GDPR (EU Users)

✅ Compliance measures:
- Data minimization (only collect what's needed)
- Encryption of personal data
- Audit logs for data access
- No third-party tracking

❌ Still needed for full compliance:
- Privacy policy mentioning data storage
- Consent checkbox before form submission
- Data deletion mechanism
- Data portability export

### CCPA (California Users)

✅ Similar to GDPR:
- Know what data is collected
- Can request deletion
- Can request what data exists
- Can opt-out

### PCI DSS (Payment Data)

✅ Not applicable (no payment processing)
- This site doesn't handle credit cards
- Payment happens in person only

## Common Attack Vectors & Defenses

| Attack | Prevention |
|--------|-----------|
| **SQL Injection** | Parameterized queries, input validation |
| **XSS (Cross-Site Scripting)** | CSP headers, input sanitization |
| **CSRF (Cross-Site Request Forgery)** | SameSite cookies, origin checking |
| **Brute Force** | Rate limiting (30 req/min per IP) |
| **DDoS** | Rate limiting, request size limits |
| **Man-in-the-Middle** | HTTPS/TLS encryption, HSTS |
| **Clickjacking** | X-Frame-Options: DENY |
| **Data Breach** | Encryption at rest, secrets in env vars |

## File & Folder Security

### Never Commit to Git

- `.env` file (add to `.gitignore`)
- Private keys
- API keys
- Database file

### File Permissions

```bash
# Make .env readable only by owner
chmod 600 .env

# Make database directory read/write for app only
chmod 700 data/
```

## Regular Maintenance

### Weekly
- Check server logs for unusual activity
- Monitor error rates

### Monthly
- Review audit logs
- Check for failed login attempts

### Quarterly
- Review security dependencies for updates
- Run `npm audit` to check for vulnerabilities

### Semi-Annually
- Rotate ENCRYPTION_KEY and ADMIN_API_KEY
- Review security headers configuration
- Penetration test (hire a professional)

## Secrets Management

### Local Development
```bash
# Create .env file (NEVER commit this)
ENCRYPTION_KEY=abc123...
ADMIN_API_KEY=xyz789...
NODE_ENV=development
```

### Production (Railway/Heroku)
- Set variables in deployment platform UI
- Never show in logs
- Rotate every 6 months

### Generating Secure Keys
```bash
# Encryption key (32 bytes = 256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Admin API key (16 bytes = 128 bits)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Future Enhancements

### High Priority
- [ ] Email notifications (Nodemailer or SendGrid)
- [ ] Admin dashboard with proper authentication
- [ ] Rate limiting with Redis (survives server restarts)
- [ ] GDPR consent checkbox
- [ ] Data deletion request handler

### Medium Priority
- [ ] Two-factor authentication for admin
- [ ] API key rotation automation
- [ ] Encryption key rotation process
- [ ] Backup & disaster recovery procedure

### Nice to Have
- [ ] Activity alerts (unusual access patterns)
- [ ] GeoIP detection (alert if access from unexpected location)
- [ ] Browser fingerprinting (detect account takeover)
- [ ] Incident response playbook

## Security Testing

### Manual Testing

```bash
# Test with invalid input
curl -X POST https://your-site.com/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "'; DROP TABLE bookings; --",
    "email": "test@example.com",
    ...
  }'

# Should return validation error, not crash
```

### Automated Testing

```bash
npm install --save-dev jest supertest

# Then create test file: tests/security.test.js
```

## Incident Response

If you suspect a security breach:

1. **Immediate:** Take site offline if necessary
2. **Assess:** Review audit logs to see what was accessed
3. **Contain:** Change ENCRYPTION_KEY and ADMIN_API_KEY
4. **Communicate:** Notify affected users
5. **Document:** Write incident report for future prevention

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)

## Support

For security questions or to report vulnerabilities, email: xandermckie@gmail.com

Please do NOT publicly disclose security issues. Report privately first.
