require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const Database = require('./src/database');
const Encryption = require('./src/encryption');
const { bookingValidationRules, statusUpdateRules, validate, isValidListStatus } = require('./src/validation');
const { requireAdmin, isValidUUID } = require('./src/admin');
const { sanitizeBookingFields, rejectExtraFields, BOOKING_FIELD_KEYS } = require('./src/sanitize');
const emailService = require('./src/email');

const ENCRYPTED_FIELD_PATTERN = /^[0-9a-f]{32}:[0-9a-f]+$/i;

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RAILWAY_API_ORIGIN = process.env.RAILWAY_API_ORIGIN || 'https://detailingsite-production.up.railway.app';

const db = new Database(process.env.DATABASE_PATH || './data/bookings.db');
const encryption = new Encryption(process.env.ENCRYPTION_KEY);

function decryptField(encrypted) {
  return encryption.decrypt(encrypted);
}

function decryptNotes(notes) {
  if (!notes) return '';
  if (ENCRYPTED_FIELD_PATTERN.test(notes)) {
    return encryption.decrypt(notes);
  }
  return notes;
}

function decryptBooking(booking) {
  const decrypted = {
    id: booking.id,
    first_name: decryptField(booking.first_name_encrypted),
    last_name: decryptField(booking.last_name_encrypted),
    email: decryptField(booking.email_encrypted),
    phone: decryptField(booking.phone_encrypted),
    vehicle: booking.vehicle,
    address: decryptField(booking.address_encrypted),
    service: booking.service,
    date: booking.date,
    time: booking.time,
    notes: decryptNotes(booking.notes),
    status: booking.status,
    consent_at: booking.consent_at,
    created_at: booking.created_at,
    updated_at: booking.updated_at
  };
  if (booking.dropoff_address_encrypted) {
    decrypted.dropoff_address = decryptField(booking.dropoff_address_encrypted);
  }
  return decrypted;
}

// ──────────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ──────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", RAILWAY_API_ORIGIN],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

const corsOptions = {
  origin: process.env.SITE_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-API-Key']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use('/api/admin', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

app.use((req, res, next) => {
  for (const key in req.body) {
    if (Array.isArray(req.body[key]) && !['tags', 'items'].includes(key)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format'
      });
    }
  }
  next();
});

const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowStart = now - 60000;

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }

  const timestamps = requestCounts.get(ip).filter(ts => ts > windowStart);

  if (timestamps.length >= 30) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }

  timestamps.push(now);
  requestCounts.set(ip, timestamps);
  next();
});

// ──────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/availability', async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month (1-12) are required'
      });
    }

    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const rows = await db.all(
      `SELECT date, time FROM bookings WHERE date LIKE ? AND status != 'cancelled'`,
      [`${monthPrefix}%`]
    );

    const booked = {};
    for (const row of rows) {
      if (!booked[row.date]) booked[row.date] = [];
      if (!booked[row.date].includes(row.time)) {
        booked[row.date].push(row.time);
      }
    }

    res.json({ success: true, booked });
  } catch (error) {
    console.error('Availability error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability'
    });
  }
});

app.post('/api/bookings',
  rejectExtraFields(BOOKING_FIELD_KEYS),
  bookingValidationRules(),
  validate,
  (req, res, next) => {
    sanitizeBookingFields(req.body);
    next();
  },
  async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, vehicle, address,
      service, date, time, notes, dropoffAddress
    } = req.body;

    const existing = await db.get(
      `SELECT id FROM bookings WHERE date = ? AND time = ? AND status != 'cancelled'`,
      [date, time]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked. Please choose another.'
      });
    }

    const bookingId = uuidv4();
    const dropoffEncrypted = (service === 'pickup_dropoff' && dropoffAddress)
      ? encryption.encrypt(dropoffAddress)
      : null;
    const notesEncrypted = notes ? encryption.encrypt(notes) : '';

    await db.run(`
      INSERT INTO bookings (
        id, first_name_encrypted, last_name_encrypted, email_encrypted,
        phone_encrypted, vehicle, address_encrypted, dropoff_address_encrypted,
        service, date, time, notes, status, consent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      bookingId,
      encryption.encrypt(firstName),
      encryption.encrypt(lastName),
      encryption.encrypt(email),
      encryption.encrypt(phone),
      vehicle,
      encryption.encrypt(address),
      dropoffEncrypted,
      service,
      date,
      time,
      notesEncrypted,
      'pending'
    ]);

    await db.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['BOOKING_CREATED', bookingId, req.ip]
    );

    emailService.sendBookingCreated({
      bookingId,
      vehicle,
      date,
      time,
      service,
      customerEmail: email,
      customerName: firstName
    }).catch((err) => console.error('Email error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Booking received. We\'ll confirm within 24 hours.',
      bookingId,
      date,
      time,
      vehicle
    });

  } catch (error) {
    console.error('Booking error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process booking. Please try again.'
    });
  }
});

async function handleBookingDetails(req, res) {
  try {
    const { bookingId } = req.params;

    if (!isValidUUID(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await db.get(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await db.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['BOOKING_DETAILS_VIEWED', bookingId, req.ip]
    );

    res.json({ success: true, data: decryptBooking(booking) });

  } catch (error) {
    console.error('Fetch booking details error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details'
    });
  }
}

app.get('/api/bookings/:bookingId/details', requireAdmin, handleBookingDetails);
app.get('/api/admin/bookings/:bookingId/details', requireAdmin, handleBookingDetails);

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    const status = req.query.status;

    if (!year || !month || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month (1-12) are required'
      });
    }

    if (!isValidListStatus(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status filter'
      });
    }

    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    let sql = `SELECT id, vehicle, date, time, status, service, created_at
               FROM bookings WHERE date LIKE ?`;
    const params = [`${monthPrefix}%`];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY date ASC, time ASC';

    const bookings = await db.all(sql, params);
    res.json({ success: true, data: bookings });

  } catch (error) {
    console.error('List bookings error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to list bookings'
    });
  }
});

app.patch('/api/admin/bookings/:bookingId',
  requireAdmin,
  rejectExtraFields(new Set(['status'])),
  statusUpdateRules(),
  validate,
  async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!isValidUUID(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await db.get(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await db.run(
      `UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, bookingId]
    );

    await db.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['BOOKING_STATUS_UPDATED', bookingId, req.ip]
    );

    const decrypted = decryptBooking(booking);
    emailService.sendStatusChange({
      customerEmail: decrypted.email,
      customerName: decrypted.first_name,
      status,
      vehicle: booking.vehicle,
      date: booking.date,
      time: booking.time
    }).catch((err) => console.error('Status email error:', err.message));

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: { id: bookingId, status }
    });

  } catch (error) {
    console.error('Update booking error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    });
  }
});

app.delete('/api/admin/bookings/:bookingId', requireAdmin, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidUUID(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const result = await db.run(`DELETE FROM bookings WHERE id = ?`, [bookingId]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await db.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['BOOKING_DELETED', bookingId, req.ip]
    );

    res.json({ success: true, message: 'Booking deleted' });

  } catch (error) {
    console.error('Delete booking error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking'
    });
  }
});

app.get('/api/admin/bookings/:bookingId/export', requireAdmin, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidUUID(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await db.get(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await db.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['BOOKING_EXPORTED', bookingId, req.ip]
    );

    res.json({ success: true, data: decryptBooking(booking) });

  } catch (error) {
    console.error('Export booking error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to export booking'
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'production'
      ? 'An error occurred. Please try again.'
      : err.message
  });
});

// ──────────────────────────────────────────────────────────────
// STARTUP
// ──────────────────────────────────────────────────────────────

const startServer = async () => {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }

    if (!process.env.ADMIN_API_KEY || process.env.ADMIN_API_KEY.length < 16) {
      if (NODE_ENV === 'production') {
        throw new Error('ADMIN_API_KEY environment variable is required in production (min 16 characters)');
      }
      console.warn('⚠ ADMIN_API_KEY not set — admin routes will reject all requests');
    }

    await db.init();
    console.log('✓ Database initialized');

    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${NODE_ENV}`);
      if (!emailService.isConfigured()) {
        console.warn('⚠ Email not configured — set SMTP_* env vars to enable notifications');
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`✗ Port ${PORT} is already in use.`);
        console.error('  Stop the other server (or close the previous debug session), then try again.');
        console.error(`  Or set PORT=3001 in your .env file.`);
        process.exit(1);
      }
      console.error('✗ Server error:', err.message);
      process.exit(1);
    });

  } catch (error) {
    console.error('✗ Startup error:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = { app, db, encryption, startServer };
