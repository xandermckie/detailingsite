require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const Database = require('./src/database');
const Encryption = require('./src/encryption');
const { bookingValidationRules, validate } = require('./src/validation');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize database and encryption
const db = new Database(process.env.DATABASE_PATH || './data/bookings.db');
const encryption = new Encryption(process.env.ENCRYPTION_KEY);

// ──────────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ──────────────────────────────────────────────────────────────

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// CORS configuration - allow only your frontend
const corsOptions = {
  origin: process.env.SITE_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
};

app.use(cors(corsOptions));

// Body parser with size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Prevent parameter pollution
app.use((req, res, next) => {
  // Only allow arrays if explicitly expected
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

// Rate limiting (simple in-memory implementation)
const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }

  const timestamps = requestCounts.get(ip).filter(ts => ts > windowStart);

  // Max 30 requests per minute per IP
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files (the HTML, CSS, images)
app.use(express.static(path.join(__dirname, 'public')));

// API: Create booking
app.post('/api/bookings', bookingValidationRules(), validate, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, vehicle, address, service, date, time, notes } = req.body;

    // Create booking with encrypted sensitive data
    const bookingId = uuidv4();

    const query = `
      INSERT INTO bookings (
        id,
        first_name_encrypted,
        last_name_encrypted,
        email_encrypted,
        phone_encrypted,
        vehicle,
        address_encrypted,
        service,
        date,
        time,
        notes,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.run(query, [
      bookingId,
      encryption.encrypt(firstName),
      encryption.encrypt(lastName),
      encryption.encrypt(email),
      encryption.encrypt(phone),
      vehicle, // Vehicle is not encrypted (needed for scheduling display)
      encryption.encrypt(address),
      service,
      date,
      time,
      notes || '',
      'pending'
    ]);

    // Log the action (without sensitive data)
    await db.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['BOOKING_CREATED', bookingId, req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Booking received. We\'ll confirm within 24 hours.',
      bookingId: bookingId,
      date: date,
      time: time,
      vehicle: vehicle
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process booking. Please try again.'
    });
  }
});

// API: Get booking summary (minimal data, for admin use only - no auth yet)
app.get('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Basic validation of UUID format
    if (!bookingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await db.get(
      `SELECT id, vehicle, date, time, status, created_at FROM bookings WHERE id = ?`,
      [bookingId]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Fetch booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
});

// API: Get booking details (admin only - TODO: add proper auth)
app.get('/api/bookings/:bookingId/details', async (req, res) => {
  try {
    // TODO: Add proper authentication/authorization here
    // For now, only allow if correct API key is provided
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { bookingId } = req.params;

    if (!bookingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await db.get(
      `SELECT * FROM bookings WHERE id = ?`,
      [bookingId]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Decrypt sensitive fields
    const decrypted = {
      ...booking,
      first_name: encryption.decrypt(booking.first_name_encrypted),
      last_name: encryption.decrypt(booking.last_name_encrypted),
      email: encryption.decrypt(booking.email_encrypted),
      phone: encryption.decrypt(booking.phone_encrypted),
      address: encryption.decrypt(booking.address_encrypted)
    };

    // Log access
    await db.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['BOOKING_DETAILS_VIEWED', bookingId, req.ip]
    );

    res.json({
      success: true,
      data: decrypted
    });

  } catch (error) {
    console.error('Fetch booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
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
    // Validate required environment variables
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }

    // Initialize database
    await db.init();
    console.log('✓ Database initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${NODE_ENV}`);
    });

  } catch (error) {
    console.error('✗ Startup error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
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

startServer();

module.exports = app;
